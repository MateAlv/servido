"""US-43/45 acceptance tests against the existing pre-order API."""

from datetime import timedelta
from uuid import uuid4

import pytest

from app.models.order import Order
from app.services import availability
from tests.reservations import item_of
from tests.test_order import cart_url, order_url, page, setup


def payload(s, *, delay=0, method="cash", items=None, operation=None):
    return {
        "items": [item_of(s.bife)] if items is None else items,
        "arrival_at": (s.reservation.starts_at + timedelta(minutes=delay)).isoformat(),
        "payment_method": method,
        "operation_id": str(operation or uuid4()),
    }


def put(client, s, body):
    return client.put(order_url(s.reservation.id), json=body, headers=s.headers)


def test_us43_s2_confirms_arrival_and_items_atomically(client, session):
    s = setup(client, session)
    response = put(client, s, payload(s, delay=30))
    assert response.status_code == 200
    data = response.json()
    assert data["order"]["arrival_at"].startswith(
        s.reservation.starts_at.astimezone(availability.BUENOS_AIRES).date().isoformat()
    )
    assert "21:30:00" in data["order"]["arrival_at"]
    assert data["confirmation"]["replayed"] is False
    assert data["cart"] is None


def test_us43_s3_uses_confirmed_arrival_and_slowest_known_dish(client, session):
    s = setup(client, session)
    response = put(client, s, payload(s, delay=30, items=[item_of(s.bife, 3), item_of(s.flan)]))
    assert response.status_code == 200
    assert response.json()["order"]["prep_time_minutes"] == 25
    assert "21:05:00" in response.json()["order"]["prep_start_time"]


def test_us43_s4_reconfirms_arrival_without_changing_dishes(client, session):
    s = setup(client, session)
    assert put(client, s, payload(s)).status_code == 200
    assert put(client, s, payload(s, delay=15)).status_code == 200
    assert "21:15:00" in page(client, s)["order"]["arrival_at"]
    session.refresh(s.reservation)
    assert s.reservation.starts_at.astimezone(availability.BUENOS_AIRES).hour == 21
    assert s.reservation.ends_at.astimezone(availability.BUENOS_AIRES).hour == 22


def test_us43_s5_rejects_first_empty_confirmation(client, session):
    s = setup(client, session)
    assert put(client, s, payload(s, items=[], method=None)).status_code == 400


def test_us43_s5_removes_existing_order_without_changing_reservation(client, session):
    s = setup(client, session)
    assert put(client, s, payload(s)).status_code == 200
    assert put(client, s, payload(s, items=[], method=None)).json()["order"] is None
    session.refresh(s.reservation)
    assert s.reservation.status == "confirmed"


@pytest.mark.parametrize("delay", [-1, 30.001])
def test_us43_s6_rejects_arrival_outside_window_or_not_future(client, session, delay):
    s = setup(client, session)
    assert put(client, s, payload(s, delay=delay)).status_code == 400


@pytest.mark.parametrize("delay", [0, 15, 30])
def test_us43_edge_arrival_inclusive_start_and_plus_30(client, session, delay):
    s = setup(client, session)
    assert put(client, s, payload(s, delay=delay)).status_code == 200


def test_us43_edge_replay_preserves_newer_confirmation_and_payment(client, session):
    s = setup(client, session)
    first = payload(s)
    assert put(client, s, first).status_code == 200
    assert put(client, s, payload(s, delay=30)).status_code == 200
    draft = payload(s, delay=15, method="online", items=[item_of(s.flan)])
    draft.pop("operation_id")
    assert client.put(cart_url(s.reservation.id), json=draft, headers=s.headers).status_code == 200
    result = client.put(
        order_url(s.reservation.id) + "/payment-method",
        headers=s.headers,
        json={"payment_method": "online"},
    )
    assert result.status_code == 200
    before = result.json()["order"]
    private_before = result.json()["cart"]
    result = put(client, s, first)
    assert result.json()["confirmation"]["replayed"] is True
    assert result.json()["order"] == before
    assert result.json()["cart"] == private_before


def test_us43_edge_replay_survives_removal_and_recreation(client, session):
    s = setup(client, session)
    first = payload(s)
    assert put(client, s, first).status_code == 200
    assert put(client, s, payload(s, items=[])).status_code == 200
    assert put(client, s, first).json()["order"] is None
    newer = put(client, s, payload(s, delay=30)).json()["order"]
    assert put(client, s, first).json()["order"] == newer


def test_us43_edge_key_payload_conflict(client, session):
    s = setup(client, session)
    first = payload(s)
    assert put(client, s, first).status_code == 200
    first["payment_method"] = "online"
    assert put(client, s, first).status_code == 409


def test_us43_edge_expired_session_rejects_without_mutation(client, session):
    s = setup(client, session)
    assert client.put(order_url(s.reservation.id), json=payload(s)).status_code == 401
    assert page(client, s)["order"] is None


def test_us45_s2_rejects_confirmation_without_method(client, session):
    s = setup(client, session)
    assert put(client, s, payload(s, method=None)).status_code == 400
    missing = payload(s)
    missing.pop("payment_method")
    assert put(client, s, missing).status_code == 400
    assert page(client, s)["order"] is None


def test_us45_s2_saves_private_preference_then_confirms_it(client, session):
    s = setup(client, session)
    body = payload(s, method="online", delay=30)
    draft = {k: v for k, v in body.items() if k != "operation_id"}
    assert client.put(cart_url(s.reservation.id), json=draft, headers=s.headers).status_code == 200
    data = page(client, s)
    assert data["order"] is None
    assert data["cart"]["payment_method"] == "online"
    assert put(client, s, body).json()["order"]["payment_status"] == "pending"


def test_us45_s3_reads_confirmed_method_and_private_cart_separately(client, session):
    s = setup(client, session)
    assert put(client, s, payload(s)).status_code == 200
    draft = payload(s, method="online")
    draft.pop("operation_id")
    assert client.put(cart_url(s.reservation.id), json=draft, headers=s.headers).status_code == 200
    data = page(client, s)
    assert data["order"]["payment_method"] == "cash"
    assert data["cart"]["payment_method"] == "online"


def test_us45_s4_changes_only_method_during_visit_before_end(client, session, monkeypatch):
    s = setup(client, session)
    before = put(client, s, payload(s)).json()["order"]
    monkeypatch.setattr(
        availability, "current_time", lambda: s.reservation.starts_at + timedelta(minutes=1)
    )
    result = client.put(
        order_url(s.reservation.id) + "/payment-method",
        headers=s.headers,
        json={"payment_method": "online"},
    )
    assert result.status_code == 200
    after = result.json()["order"]
    for key in ("items", "arrival_at", "confirmed_at", "prep_start_time"):
        assert after[key] == before[key]
    monkeypatch.setattr(availability, "current_time", lambda: s.reservation.ends_at)
    assert (
        client.put(
            order_url(s.reservation.id) + "/payment-method",
            headers=s.headers,
            json={"payment_method": "cash"},
        ).status_code
        == 409
    )


def test_us45_s5_paid_order_rejects_method_change(client, session):
    s = setup(client, session)
    assert put(client, s, payload(s)).status_code == 200
    order = session.query(Order).filter_by(reservation_id=s.reservation.id).one()
    order.payment_status = "paid"
    order.paid_amount = 0
    order.paid_at = order.created_at
    session.commit()
    assert (
        client.put(
            order_url(s.reservation.id) + "/payment-method",
            headers=s.headers,
            json={"payment_method": "online"},
        ).status_code
        == 409
    )
    assert put(client, s, payload(s, method="online")).status_code == 409


def test_us43_edge_missing_times_uses_arrival_without_estimate(client, session):
    s = setup(client, session)
    data = put(client, s, payload(s, delay=30, items=[item_of(s.flan)])).json()["order"]
    assert data["prep_time_minutes"] is None
    assert data["prep_start_time"] == data["arrival_at"]


def test_us43_edge_replay_after_deadline_cancel_or_menu_change(client, session, monkeypatch):
    s = setup(client, session)
    first = payload(s)
    original = put(client, s, first).json()["order"]
    s.bife.precio += 1
    session.commit()
    monkeypatch.setattr(availability, "current_time", lambda: s.reservation.ends_at)
    replayed = put(client, s, first).json()["order"]
    assert replayed["payment_method_editable"] is False
    assert {k: v for k, v in replayed.items() if k != "payment_method_editable"} == {
        k: v for k, v in original.items() if k != "payment_method_editable"
    }
    assert put(client, s, payload(s)).status_code == 409
    cancelled_at = s.reservation.ends_at
    s.reservation.status = "cancelled"
    s.reservation.cancelled_at = cancelled_at
    session.commit()
    assert put(client, s, first).json()["confirmation"]["replayed"] is True


def test_us43_edge_arrival_delay_database_constraints(client, session):
    from sqlalchemy import text
    from sqlalchemy.exc import IntegrityError

    s = setup(client, session)
    assert put(client, s, payload(s)).status_code == 200
    for delay in ("-1 second", "30 minutes 1 microsecond", "1 month -30 days"):
        with pytest.raises(IntegrityError), session.begin_nested():
            session.execute(
                text(
                    "UPDATE pedidos SET arrival_delay = CAST(:delay AS interval) "
                    "WHERE reservation_id = :id"
                ),
                {"delay": delay, "id": s.reservation.id},
            )


def test_us45_edge_payment_database_constraints(client, session):
    from sqlalchemy import text
    from sqlalchemy.exc import IntegrityError

    s = setup(client, session)
    assert put(client, s, payload(s)).status_code == 200
    for column in ("payment_method", "payment_status"):
        with pytest.raises(IntegrityError), session.begin_nested():
            session.execute(
                text(f"UPDATE pedidos SET {column} = 'other' WHERE reservation_id = :id"),
                {"id": s.reservation.id},
            )
    order = session.query(Order).filter_by(reservation_id=s.reservation.id).one()
    order.payment_status = "paid"
    order.paid_amount = 0
    order.paid_at = order.created_at
    session.commit()
    with pytest.raises(IntegrityError), session.begin_nested():
        session.execute(
            text("UPDATE pedidos SET payment_method = 'online' WHERE reservation_id = :id"),
            {"id": s.reservation.id},
        )


def test_us43_edge_confirmation_receipt_constraints(client, session):
    from sqlalchemy.exc import IntegrityError

    from app.models.order_confirmation import OrderConfirmation

    s = setup(client, session)
    first = payload(s)
    assert put(client, s, first).status_code == 200
    receipt = session.query(OrderConfirmation).filter_by(reservation_id=s.reservation.id).one()
    session.expunge(receipt)
    with pytest.raises(IntegrityError), session.begin_nested():
        session.add(
            OrderConfirmation(
                reservation_id=receipt.reservation_id,
                operation_id=receipt.operation_id,
                request_digest=receipt.request_digest,
                accepted_at=receipt.accepted_at,
            )
        )
        session.flush()


def test_us43_edge_atomic_receipt_rollback(client, session):
    from app.models.order_confirmation import OrderConfirmation

    s = setup(client, session)
    first = payload(s, delay=31)
    assert put(client, s, first).status_code == 400
    assert session.query(OrderConfirmation).filter_by(reservation_id=s.reservation.id).count() == 0
    assert page(client, s)["order"] is None


def test_us43_edge_restaurant_reads_confirmed_arrival_only(client, session):
    from tests.test_order import restaurant_headers

    s = setup(client, session)
    assert put(client, s, payload(s, delay=15)).status_code == 200
    order = session.query(Order).filter_by(reservation_id=s.reservation.id).one()
    draft = payload(s, delay=30, method="online")
    draft.pop("operation_id")
    assert client.put(cart_url(s.reservation.id), json=draft, headers=s.headers).status_code == 200
    response = client.get(
        f"/api/restaurante/pedidos/{order.id}", headers=restaurant_headers(client, s.restaurant)
    )
    assert response.status_code == 200
    assert response.json()["arrival_time"] == "21:15"
    assert response.json()["payment"]["method"] == "cash"


def test_us43_edge_expired_token_preserves_saved_cart(client, session):
    import jwt

    from app.config import settings

    s = setup(client, session)
    draft = payload(s)
    draft.pop("operation_id")
    assert client.put(cart_url(s.reservation.id), json=draft, headers=s.headers).status_code == 200
    token = s.headers["Authorization"].split()[1]
    claims = jwt.decode(token, options={"verify_signature": False})
    claims["exp"] = 0
    expired = jwt.encode(claims, settings.jwt_secret, algorithm="HS256")
    response = client.put(
        order_url(s.reservation.id), json=payload(s), headers={"Authorization": f"Bearer {expired}"}
    )
    assert response.status_code == 401
    data = page(client, s)
    assert data["order"] is None
    assert len(data["cart"]["items"]) == 1


def test_us43_edge_arrival_only_reconfirmation_keeps_menu_validation(client, session):
    s = setup(client, session)
    assert put(client, s, payload(s)).status_code == 200
    changed_arrival = payload(s, delay=30)
    s.bife.nombre = "Nuevo nombre"
    session.commit()
    assert put(client, s, changed_arrival).status_code == 409
    assert "21:00:00" in page(client, s)["order"]["arrival_at"]


def test_us43_edge_receipt_foreign_key_and_digest_length(client, session):
    from sqlalchemy.exc import IntegrityError

    from app.models.order_confirmation import OrderConfirmation

    s = setup(client, session)
    for reservation_id, digest in [(uuid4(), "a" * 64), (s.reservation.id, "short")]:
        with pytest.raises(IntegrityError), session.begin_nested():
            session.add(
                OrderConfirmation(
                    reservation_id=reservation_id,
                    operation_id=uuid4(),
                    request_digest=digest,
                    accepted_at=availability.current_time(),
                )
            )
            session.flush()


def test_us43_edge_replay_requires_owner_and_session(client, session):
    from tests.reservations import diner_headers

    s = setup(client, session)
    first = payload(s)
    before = put(client, s, first).json()["order"]
    other = diner_headers(client, f"other-{uuid4()}@example.com")
    assert client.put(order_url(s.reservation.id), headers=other, json=first).status_code == 404
    assert client.put(order_url(s.reservation.id), json=first).status_code == 401
    assert page(client, s)["order"] == before


def test_us43_edge_replay_normalizes_timezone_item_order_and_money(client, session):
    from datetime import datetime

    s = setup(client, session)
    first = payload(s, items=[item_of(s.bife), item_of(s.flan)])
    before = put(client, s, first).json()["order"]
    first["arrival_at"] = (
        datetime.fromisoformat(first["arrival_at"])
        .astimezone(availability.BUENOS_AIRES)
        .isoformat()
    )
    first["items"].reverse()
    first["items"][0]["unit_price"] = "6000.0"
    result = put(client, s, first)
    assert result.status_code == 200
    assert result.json()["confirmation"]["replayed"] is True
    assert result.json()["order"] == before


def convergence_snapshot(client, session, s):
    """Confirmed/private snapshots and receipts must survive every refused mutation."""
    from sqlalchemy import select

    from app.models.cart import Cart, CartItem
    from app.models.order_confirmation import OrderConfirmation

    data = page(client, s)
    receipts = session.execute(
        select(
            OrderConfirmation.operation_id,
            OrderConfirmation.request_digest,
            OrderConfirmation.accepted_at,
        )
        .where(OrderConfirmation.reservation_id == s.reservation.id)
        .order_by(OrderConfirmation.operation_id)
    ).all()
    # Cancelled reservations hide carts in GET; inspect their persisted state too.
    stored_cart = session.execute(
        select(Cart.id, Cart.arrival_delay, Cart.payment_method, Cart.updated_at).where(
            Cart.reservation_id == s.reservation.id
        )
    ).all()
    stored_items = session.execute(
        select(
            CartItem.id,
            CartItem.dish_id,
            CartItem.dish_name,
            CartItem.quantity,
            CartItem.unit_price,
            CartItem.prep_time_minutes,
        )
        .join(Cart, CartItem.cart_id == Cart.id)
        .where(Cart.reservation_id == s.reservation.id)
        .order_by(CartItem.id)
    ).all()
    return (
        data["order"],
        data["cart"],
        [tuple(row) for row in receipts],
        ([tuple(row) for row in stored_cart], [tuple(row) for row in stored_items]),
    )


def convergence_order_and_cart(client, session):
    s = setup(client, session)
    assert put(client, s, payload(s)).status_code == 200
    draft = payload(s, delay=15, method="online", items=[item_of(s.flan, 2)])
    draft.pop("operation_id")
    assert client.put(cart_url(s.reservation.id), json=draft, headers=s.headers).status_code == 200
    return s


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"payment_method": None},
        {"payment_method": "card"},
        {"payment_method": "online", "items": []},
        {"payment_method": "online", "arrival_at": "2026-11-03T21:00:00-03:00"},
        {"payment_method": "online", "payment_status": "paid"},
        {"payment_method": "online", "confirmed_at": "2026-11-03T12:00:00-03:00"},
        {"payment_method": "online", "operation_id": str(uuid4())},
    ],
)
def test_us45_edge_payment_contract_rejection_preserves_snapshots(client, session, body):
    s = convergence_order_and_cart(client, session)
    before = convergence_snapshot(client, session, s)
    response = client.put(
        order_url(s.reservation.id) + "/payment-method", json=body, headers=s.headers
    )
    assert response.status_code == 400
    assert convergence_snapshot(client, session, s) == before


@pytest.mark.parametrize(
    "case, expected",
    [("absent", 409), ("cancelled", 409), ("role", 403), ("owner", 404), ("session", 401)],
)
def test_us45_edge_payment_access_and_lifecycle_preserve_snapshots(client, session, case, expected):
    from tests.reservations import diner_headers
    from tests.test_order import restaurant_headers

    s = setup(client, session) if case == "absent" else convergence_order_and_cart(client, session)
    headers = s.headers
    if case == "cancelled":
        s.reservation.status = "cancelled"
        s.reservation.cancelled_at = availability.current_time()
        session.commit()
    elif case == "role":
        headers = restaurant_headers(client, s.restaurant)
    elif case == "owner":
        headers = diner_headers(client, f"other-{uuid4()}@example.com")
    elif case == "session":
        headers = {}
    before = convergence_snapshot(client, session, s)
    response = client.put(
        order_url(s.reservation.id) + "/payment-method",
        json={"payment_method": "online"},
        headers=headers,
    )
    assert response.status_code == expected
    assert convergence_snapshot(client, session, s) == before


@pytest.mark.parametrize("missing", [False, True])
def test_us45_edge_reconfirmation_requires_method_without_losing_cart(client, session, missing):
    s = convergence_order_and_cart(client, session)
    before = convergence_snapshot(client, session, s)
    body = payload(s, delay=30, method=None)
    if missing:
        body.pop("payment_method")
    assert put(client, s, body).status_code == 400
    assert convergence_snapshot(client, session, s) == before


def test_us43_edge_receipt_database_failure_rolls_back_staged_confirmation(client, session):
    from sqlalchemy import event, select
    from sqlalchemy.exc import IntegrityError

    from app.models.cart import Cart
    from app.models.order_confirmation import OrderConfirmation
    from app.models.order_item import OrderItem

    s = convergence_order_and_cart(client, session)
    before = convergence_snapshot(client, session, s)
    attempted = payload(s, delay=30, method="online", items=[item_of(s.flan, 3)])
    staged = []

    def reject_receipt(_mapper, connection, receipt):
        # A real database constraint fails only after confirm_order has flushed its writes.
        order_id, delay, method = connection.execute(
            select(Order.id, Order.arrival_delay, Order.payment_method).where(
                Order.reservation_id == s.reservation.id
            )
        ).one()
        assert delay == timedelta(minutes=30)
        assert method == "online"
        assert (
            connection.scalar(select(Cart.id).where(Cart.reservation_id == s.reservation.id))
            is None
        )
        assert connection.execute(
            select(OrderItem.dish_name, OrderItem.quantity).where(OrderItem.order_id == order_id)
        ).all() == [(s.flan.nombre, 3)]
        staged.append(receipt.operation_id)
        receipt.request_digest = "short"

    event.listen(OrderConfirmation, "before_insert", reject_receipt)
    try:
        with pytest.raises(IntegrityError, match="digest_length"):
            put(client, s, attempted)
    finally:
        event.remove(OrderConfirmation, "before_insert", reject_receipt)
    assert staged
    assert convergence_snapshot(client, session, s) == before
    accepted = put(client, s, attempted)
    assert accepted.status_code == 200
    assert accepted.json()["confirmation"]["replayed"] is False
    after = convergence_snapshot(client, session, s)
    assert len(after[2]) == len(before[2]) + 1
    assert after[1] is None
    assert put(client, s, attempted).json()["confirmation"]["replayed"] is True
    assert convergence_snapshot(client, session, s) == after


def test_us43_edge_naive_arrival_rejected_without_mutation(client, session):
    from datetime import datetime

    s = convergence_order_and_cart(client, session)
    before = convergence_snapshot(client, session, s)
    body = payload(s, delay=30)
    body["arrival_at"] = datetime.fromisoformat(body["arrival_at"]).replace(tzinfo=None).isoformat()
    response = put(client, s, body)
    assert response.status_code == 400
    assert (
        response.json()["detail"][0]["msg"] == "La hora de llegada debe incluir una zona horaria."
    )
    assert convergence_snapshot(client, session, s) == before


def test_us43_edge_preparation_datetime_overflow_rejected_without_mutation(client, session):
    s = convergence_order_and_cart(client, session)
    s.bife.tiempo_preparacion_minutos = 2_147_483_647
    session.commit()
    before = convergence_snapshot(client, session, s)
    body = payload(s, delay=30, items=[item_of(s.bife)])
    response = put(client, s, body)
    assert response.status_code == 400
    assert (
        response.json()["detail"] == "El tiempo de preparación no permite coordinar esta llegada."
    )
    assert convergence_snapshot(client, session, s) == before
