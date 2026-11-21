"""US-60 acceptance tests: paying a pre-ordered meal in cash (spec 032-pagar-pedido).

The lifecycle (method, pending status, total) comes from US-45 (spec 020-tiempo-pago); these tests
lock it under US-60 names and cover the scenarios of the cash story.
"""

from datetime import timedelta
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.order import Order
from app.services import availability
from tests.reservations import diner_headers, item_of
from tests.test_order import order_url, page, restaurant_headers, setup
from tests.test_order_timing_payment import payload, put


def payment_url(reservation_id) -> str:
    return order_url(reservation_id) + "/payment-method"


def change_method(client: TestClient, s, method: str):
    return client.put(
        payment_url(s.reservation.id), headers=s.headers, json={"payment_method": method}
    )


def stored_order(session: Session, s) -> Order:
    session.expire_all()
    return session.query(Order).filter_by(reservation_id=s.reservation.id).one()


def test_us60_s1_cash_confirmation_stays_pending(client, session):
    s = setup(client, session)

    response = put(client, s, payload(s, method="cash"))

    assert response.status_code == 200
    order = response.json()["order"]
    assert order["payment_method"] == "cash"
    assert order["payment_status"] == "pending"
    stored = stored_order(session, s)
    assert stored.payment_status == "pending"
    assert stored.paid_amount is None
    assert stored.paid_at is None


def test_us60_s2_cash_order_exposes_total_to_pay(client, session):
    s = setup(client, session)
    assert put(client, s, payload(s, method="cash", items=[item_of(s.bife, 2)])).status_code == 200

    order = page(client, s)["order"]

    assert order["payment_method"] == "cash"
    assert Decimal(order["subtotal"]) == Decimal("37000.00")
    assert Decimal(order["total"]) == Decimal("37000.00")
    assert order["payment_status"] == "pending"


def test_us60_s3_cash_order_stays_pending_for_both_roles(client, session):
    s = setup(client, session)
    assert put(client, s, payload(s, method="cash")).status_code == 200

    diner_order = page(client, s)["order"]
    assert diner_order["payment_status"] == "pending"
    assert diner_order["payment_method"] == "cash"

    order = stored_order(session, s)
    headers = restaurant_headers(client, s.restaurant)
    restaurant_order = client.get(f"/api/restaurante/pedidos/{order.id}", headers=headers).json()

    assert restaurant_order["payment"]["status"] == "pending"
    assert restaurant_order["payment"]["method"] == "cash"
    assert Decimal(restaurant_order["payment"]["total"]) == Decimal(diner_order["total"])


def test_us60_s4_pending_cash_order_switches_to_online(client, session):
    s = setup(client, session)
    assert put(client, s, payload(s, method="cash")).status_code == 200

    response = change_method(client, s, "online")

    assert response.status_code == 200
    order = response.json()["order"]
    assert order["payment_method"] == "online"
    assert order["payment_status"] == "pending"
    assert stored_order(session, s).payment_method == "online"


def test_us60_edge_cash_payment_rejections(client, session, monkeypatch):
    s = setup(client, session)

    # No confirmed order to pay.
    assert change_method(client, s, "online").status_code == 409

    assert put(client, s, payload(s, method="cash")).status_code == 200

    # A cancelled reservation cannot change its payment.
    s.reservation.status = "cancelled"
    s.reservation.cancelled_at = s.reservation.starts_at - timedelta(hours=1)
    session.commit()
    assert change_method(client, s, "online").status_code == 409
    s.reservation.status = "confirmed"
    s.reservation.cancelled_at = None
    session.commit()

    # A reservation that already ended cannot change its payment.
    monkeypatch.setattr(availability, "current_time", lambda: s.reservation.ends_at)
    assert change_method(client, s, "online").status_code == 409
    monkeypatch.undo()

    # Another diner cannot pay this order.
    other_headers = diner_headers(client, "otro@example.com")
    assert (
        client.put(
            payment_url(s.reservation.id),
            headers=other_headers,
            json={"payment_method": "online"},
        ).status_code
        == 404
    )


def test_us60_edge_paid_order_rejects_cash_change(client, session):
    s = setup(client, session)
    assert put(client, s, payload(s, method="online")).status_code == 200
    order = stored_order(session, s)
    order.payment_status = "paid"
    order.paid_amount = order.total
    order.paid_at = order.created_at
    session.commit()

    response = change_method(client, s, "cash")

    assert response.status_code == 409
    stored = stored_order(session, s)
    assert stored.payment_status == "paid"
    assert stored.payment_method == "online"
