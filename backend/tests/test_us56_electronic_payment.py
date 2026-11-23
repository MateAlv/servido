"""US-56 acceptance tests: paying a pre-order electronically (spec 032-pagar-pedido).

Mercado Pago is replaced by tests/mercadopago_fake.py; the card token decides its answer.
"""

import io
import urllib.error
from decimal import Decimal
from uuid import uuid4

import pytest
from sqlalchemy import select

from app.config import settings
from app.models.order import Order
from app.models.payment import Payment
from app.models.refund import Refund
from app.models.reservation import Reservation
from app.services import mercadopago
from tests.mercadopago_fake import FakeMercadoPago
from tests.reservations import diner_headers, item_of
from tests.test_closures import _payload as closure_payload
from tests.test_order import order_url, page, restaurant_headers, setup
from tests.test_order_timing_payment import payload, put


@pytest.fixture
def mp(monkeypatch: pytest.MonkeyPatch) -> FakeMercadoPago:
    fake = FakeMercadoPago()
    monkeypatch.setattr(settings, "mercadopago_access_token", "TEST-access-token")
    monkeypatch.setattr(settings, "mercadopago_public_key", "TEST-public-key")
    monkeypatch.setattr(mercadopago, "request", fake.request)
    return fake


def online_order(client, session, method="online"):
    s = setup(client, session)
    assert put(client, s, payload(s, method=method, items=[item_of(s.bife, 2)])).status_code == 200
    return s


def pay(client, s, token="approved", request_id=None, headers=None):
    return client.post(
        order_url(s.reservation.id) + "/payments",
        headers=headers or s.headers,
        json={
            "request_id": str(request_id or uuid4()),
            "token": token,
            "payment_method_id": "visa",
            "issuer_id": "310",
            "payer": {
                "email": "comprador@example.com",
                "identification": {"type": "DNI", "number": "12345678"},
            },
        },
    )


def stored(session, s) -> tuple[Order, list[Payment]]:
    session.expire_all()
    order = session.scalar(select(Order).where(Order.reservation_id == s.reservation.id))
    payments = list(session.scalars(select(Payment).where(Payment.order_id == order.id)))
    return order, payments


def test_us56_s1_pending_online_order_can_start_the_card_payment(client, session, mp):
    s = online_order(client, session)

    config = client.get("/api/payments/config").json()
    order = page(client, s)["order"]

    assert config == {"public_key": "TEST-public-key"}
    assert order["payment_method"] == "online"
    assert order["payment_status"] == "pending"
    assert order["payment_method_editable"] is True
    assert order["payment"] is None


def test_us56_s2_charges_the_order_total_with_the_deposit_included(client, session, mp):
    s = online_order(client, session)
    total = page(client, s)["order"]["total"]

    response = pay(client, s)

    assert response.status_code == 201
    assert Decimal(total) == Decimal("37000.00")
    assert mp.charges()[0]["transaction_amount"] == 37000.0
    assert mp.charges()[0]["installments"] == 1
    assert Decimal(response.json()["payment"]["amount"]) == Decimal(total)


def test_us56_s3_approved_payment_marks_the_order_paid_with_a_receipt(
    client, session, mp, mail_outbox
):
    s = online_order(client, session)

    response = pay(client, s)

    assert response.status_code == 201
    payment = response.json()["payment"]
    assert payment["status"] == "approved"
    assert payment["message"] == "Pago aprobado."
    assert payment["operation_number"] == "1001"
    assert payment["card_brand"] == "Visa"
    assert payment["card_last_four"] == "3704"
    assert payment["approved_at"] is not None
    order = response.json()["page"]["order"]
    assert order["payment_status"] == "paid"
    assert order["payment"]["operation_number"] == "1001"
    stored_order, payments = stored(session, s)
    assert stored_order.paid_amount == Decimal("37000.00")
    assert stored_order.paid_at is not None
    assert [p.status for p in payments] == ["approved"]
    receipt = mail_outbox[-1]
    assert receipt.to == "martin@example.com"
    assert "1001" in receipt.text
    assert "Visa terminada en 3704" in receipt.text
    assert "$37000.00" in receipt.text
    restaurant_view = client.get(
        f"/api/restaurante/pedidos/{stored_order.id}",
        headers=restaurant_headers(client, s.restaurant),
    ).json()
    assert restaurant_view["payment"]["status"] == "paid"


def test_us56_s4_rejected_payment_keeps_the_order_pending_and_allows_a_retry(
    client, session, mp, mail_outbox
):
    s = online_order(client, session)

    rejected = pay(client, s, token="rejected")

    assert rejected.status_code == 201
    assert rejected.json()["payment"]["status"] == "rejected"
    assert rejected.json()["payment"]["message"] == "La tarjeta no tiene fondos suficientes."
    assert rejected.json()["page"]["order"]["payment_status"] == "pending"
    assert rejected.json()["page"]["order"]["payment"] is None
    assert not [m for m in mail_outbox if m.subject.startswith("Comprobante")]

    retried = pay(client, s)

    assert retried.json()["payment"]["status"] == "approved"
    order, payments = stored(session, s)
    assert order.payment_status == "paid"
    assert sorted(p.status for p in payments) == ["approved", "rejected"]


def test_us56_s5_paid_order_is_not_charged_again_nor_changed(client, session, mp):
    s = online_order(client, session)
    request_id = uuid4()
    assert pay(client, s, request_id=request_id).status_code == 201

    repeated = pay(client, s, request_id=request_id)
    another = pay(client, s)
    method = client.put(
        order_url(s.reservation.id) + "/payment-method",
        headers=s.headers,
        json={"payment_method": "cash"},
    )
    dishes = put(client, s, payload(s, method="online", items=[item_of(s.bife, 3)]))

    assert repeated.status_code == 201
    assert repeated.json()["payment"]["operation_number"] == "1001"
    assert another.status_code == 409
    assert another.json()["detail"] == "Ya pagaste este pedido."
    assert method.status_code == 409
    assert dishes.status_code == 409
    assert "Ya pagaste el pedido" in dishes.json()["detail"]
    assert len(mp.charges()) == 1
    order, payments = stored(session, s)
    assert len(payments) == 1
    assert order.total == Decimal("37000.00")
    assert page(client, s)["reservation"]["order_open"] is False


def test_us56_s5_paid_order_has_one_approved_payment_in_the_database(client, session, mp):
    s = online_order(client, session)
    assert pay(client, s).status_code == 201
    order, _ = stored(session, s)

    session.add(
        Payment(
            order_id=order.id,
            request_id=uuid4(),
            provider_payment_id="9999",
            amount=order.total,
            status="approved",
            approved_at=order.paid_at,
        )
    )

    with pytest.raises(Exception, match="payments_one_live_per_order"):
        session.flush()
    session.rollback()


def test_us56_edge_cash_order_can_be_paid_electronically(client, session, mp):
    s = online_order(client, session, method="cash")

    response = pay(client, s)

    order = response.json()["page"]["order"]
    assert order["payment_method"] == "online"
    assert order["payment_status"] == "paid"


def test_us56_edge_payment_in_review_blocks_another_and_settles_when_reopened(
    client, session, mp, mail_outbox
):
    s = online_order(client, session)

    in_review = pay(client, s, token="in_process")
    blocked = pay(client, s)

    assert in_review.status_code == 201
    assert in_review.json()["payment"]["status"] == "in_process"
    assert in_review.json()["page"]["order"]["payment"]["status"] == "in_process"
    assert blocked.status_code == 409
    assert "en revisión" in blocked.json()["detail"]
    assert page(client, s)["order"]["payment_status"] == "pending"

    mp.decide("1001", "approved", "accredited")
    reopened = page(client, s)["order"]

    assert reopened["payment_status"] == "paid"
    assert reopened["payment"]["status"] == "approved"
    assert "1001" in mail_outbox[-1].text


def test_us56_edge_payment_in_review_freezes_the_order(client, session, mp):
    s = online_order(client, session)
    assert pay(client, s, token="in_process").status_code == 201

    dishes = put(client, s, payload(s, method="online", items=[item_of(s.bife, 3)]))
    method = client.put(
        order_url(s.reservation.id) + "/payment-method",
        headers=s.headers,
        json={"payment_method": "cash"},
    )
    current = page(client, s)

    assert dishes.status_code == 409
    assert "en revisión" in dishes.json()["detail"]
    assert method.status_code == 409
    assert current["reservation"]["order_open"] is False
    assert current["order"]["payment_method_editable"] is False

    mp.decide("1001", "rejected", "cc_rejected_other_reason")

    reopened = page(client, s)
    assert reopened["reservation"]["order_open"] is True
    assert reopened["order"]["payment_method_editable"] is True


def test_us56_edge_payment_in_review_can_end_rejected(client, session, mp):
    s = online_order(client, session)
    assert pay(client, s, token="in_process").status_code == 201

    mp.decide("1001", "rejected", "cc_rejected_high_risk")

    assert page(client, s)["order"]["payment"] is None
    assert pay(client, s).json()["payment"]["status"] == "approved"


def test_us56_edge_unavailable_mercadopago_keeps_the_order_pending(client, session, mp):
    s = online_order(client, session)
    mp.down = True

    response = pay(client, s)

    assert response.status_code == 503
    assert "no está disponible" in response.json()["detail"]
    order, payments = stored(session, s)
    assert order.payment_status == "pending"
    assert payments == []


def test_us56_edge_payment_off_without_credentials(client, session):
    s = online_order(client, session)

    assert client.get("/api/payments/config").json() == {"public_key": None}
    assert pay(client, s).status_code == 503


def test_us56_edge_refused_card_data_is_a_bad_request(client, session, mp):
    s = online_order(client, session)

    response = pay(client, s, token="invalid")

    assert response.status_code == 400
    assert stored(session, s)[1] == []


def test_us56_edge_card_number_is_never_accepted(client, session, mp):
    s = online_order(client, session)

    response = client.post(
        order_url(s.reservation.id) + "/payments",
        headers=s.headers,
        json={
            "request_id": str(uuid4()),
            "token": "approved",
            "payment_method_id": "visa",
            "payer": {"email": "comprador@example.com"},
            "card_number": "4509953566233704",
            "security_code": "123",
        },
    )

    assert response.status_code == 400
    assert mp.charges() == []
    assert not {"card_number", "security_code"} & set(Payment.__table__.columns.keys())


def test_us56_edge_rejects_cancelled_and_foreign_reservations(client, session, mp):
    s = online_order(client, session)
    other = diner_headers(client, "otra@example.com")

    foreign = pay(client, s, headers=other)
    assert client.delete(f"/api/reservations/{s.reservation.id}", headers=s.headers).is_success
    cancelled = pay(client, s)

    assert foreign.status_code == 404
    assert cancelled.status_code == 409
    assert mp.charges() == []


def test_us56_edge_diner_cancellation_returns_the_payment(client, session, mp):
    s = online_order(client, session)
    assert pay(client, s).status_code == 201

    response = client.delete(f"/api/reservations/{s.reservation.id}", headers=s.headers)

    assert response.status_code == 200
    assert mp.refunded() == ["1001"]
    order, _ = stored(session, s)
    assert session.scalar(select(Refund).where(Refund.order_id == order.id)).status == "completed"
    cancelled = client.get(
        f"/api/reservations/cancelled/{s.reservation.id}", headers=s.headers
    ).json()
    assert cancelled["refund_status"] == "completed"
    assert cancelled["refund_amount"] == "37000.00"


def test_us56_edge_failed_refund_keeps_the_diner_reservation(client, session, mp):
    s = online_order(client, session)
    assert pay(client, s).status_code == 201
    mp.refunds_fail = True

    response = client.delete(f"/api/reservations/{s.reservation.id}", headers=s.headers)

    assert response.status_code == 502
    session.expire_all()
    assert session.get(Reservation, s.reservation.id).status == "confirmed"

    mp.refunds_fail = False
    assert client.delete(f"/api/reservations/{s.reservation.id}", headers=s.headers).is_success
    assert mp.refunded() == ["1001", "1001"]


def test_us56_edge_restaurant_cancellation_returns_the_payment(client, session, mp):
    s = online_order(client, session)
    assert pay(client, s).status_code == 201

    response = client.post(
        f"/api/restaurante/reservas/{s.reservation.id}/cancelar",
        json={"request_id": str(uuid4())},
        headers=restaurant_headers(client, s.restaurant),
    )

    assert response.status_code == 200
    assert response.json()["refund"]["status"] == "completed"
    assert mp.refunded() == ["1001"]


def test_us56_edge_closure_returns_the_payment_or_is_not_saved(client, session, mp):
    s = online_order(client, session)
    assert pay(client, s).status_code == 201
    headers = restaurant_headers(client, s.restaurant)
    body = closure_payload(
        start_time="20:00",
        end_time="23:00",
        confirmed=True,
        acknowledged_reservation_ids=[str(s.reservation.id)],
    )
    mp.refunds_fail = True

    failed = client.post("/api/restaurante/bloqueos", json=body, headers=headers)

    assert failed.status_code == 409
    assert "devolver el pago" in failed.json()["detail"]
    session.expire_all()
    assert session.get(Reservation, s.reservation.id).status == "confirmed"

    mp.refunds_fail = False
    saved = client.post(
        "/api/restaurante/bloqueos", json=body | {"request_id": str(uuid4())}, headers=headers
    )

    assert saved.status_code in (200, 201)
    session.expire_all()
    assert session.get(Reservation, s.reservation.id).status == "cancelled"
    assert mp.refunded()[-1] == "1001"


@pytest.mark.parametrize(
    ("failure", "expected"),
    [
        (
            urllib.error.HTTPError("https://mp", 400, "Bad Request", {}, io.BytesIO(b"{}")),
            mercadopago.CardDataError,
        ),
        (
            urllib.error.HTTPError("https://mp", 401, "Unauthorized", {}, io.BytesIO(b"{}")),
            mercadopago.MercadoPagoError,
        ),
        (urllib.error.URLError("down"), mercadopago.MercadoPagoError),
    ],
)
def test_us56_edge_mercadopago_answers_map_to_errors(monkeypatch, failure, expected):
    monkeypatch.setattr(settings, "mercadopago_access_token", "TEST-access-token")
    monkeypatch.setattr(settings, "mercadopago_public_key", "TEST-public-key")

    def fail(*args, **kwargs):
        raise failure

    monkeypatch.setattr(mercadopago.urllib.request, "urlopen", fail)

    with pytest.raises(expected):
        mercadopago.fetch("1001")
