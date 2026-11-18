from datetime import time
from decimal import Decimal
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.order import Order
from app.models.refund import Refund
from app.models.restaurant import Restaurant
from app.services import refunds
from tests.reservations import (
    NOW,
    TOMORROW,
    add_bookable_restaurant,
    add_dish,
    add_order,
    add_reservation,
    diner_headers,
    diner_id,
)
from tests.test_restaurant_reservations import restaurant_headers


def paid_order(session: Session, reservation) -> Order:
    restaurant = session.get(Restaurant, reservation.restaurant_id)
    dish = add_dish(session, restaurant, "Menú", "12500.00", 15)
    order = add_order(session, reservation, [(dish, 1)])
    order.payment_status = "paid"
    order.payment_method = "online"
    order.paid_amount = Decimal("12500.00")
    order.paid_at = NOW
    session.flush()
    return order


def setup_paid(client, session):
    restaurant = add_bookable_restaurant(session)
    diner = diner_id(client, diner_headers(client))
    reservation = add_reservation(session, restaurant, diner, TOMORROW, time(12), 2, "indoor")
    order = paid_order(session, reservation)
    session.flush()
    return restaurant, diner, reservation, order


def test_us38_s1_refunds_paid_order_and_cancels_reservation(client, session, mail_outbox):
    restaurant, _, reservation, order = setup_paid(client, session)
    response = client.post(
        f"/api/restaurante/reservas/{reservation.id}/cancelar",
        json={"request_id": str(uuid4())},
        headers=restaurant_headers(client, restaurant),
    )
    assert response.status_code == 200
    assert response.json()["refund"] == {
        "status": "completed",
        "amount": "12500.00",
        "method": "online",
    }
    session.refresh(reservation)
    session.refresh(order)
    assert reservation.status == "cancelled"
    assert order.status == "cancelled"
    assert session.scalar(select(Refund).where(Refund.order_id == order.id)).status == "completed"


def test_us38_s3_notifies_diner_in_app_and_by_email(client, session, mail_outbox):
    restaurant, diner, reservation, _ = setup_paid(client, session)
    mail_outbox.clear()
    response = client.post(
        f"/api/restaurante/reservas/{reservation.id}/cancelar",
        json={"request_id": str(uuid4())},
        headers=restaurant_headers(client, restaurant),
    )
    assert response.status_code == 200
    notification = session.scalar(select(Notification).where(Notification.diner_id == diner))
    assert notification is not None
    assert len(mail_outbox) == 1
    assert mail_outbox[0].to == "martin@example.com"


def test_us38_s4_rejects_cancellation_inside_45_minutes(client, session):
    restaurant = add_bookable_restaurant(session)
    diner = diner_id(client, diner_headers(client, "cutoff@example.com"))
    reservation = add_reservation(session, restaurant, diner, NOW.date(), time(9, 30), 2, "indoor")
    response = client.post(
        f"/api/restaurante/reservas/{reservation.id}/cancelar",
        json={"request_id": str(uuid4())},
        headers=restaurant_headers(client, restaurant),
    )
    assert response.status_code == 409
    assert reservation.status == "confirmed"


def test_us38_s5_cancels_unpaid_reservation_without_refund(client, session):
    restaurant = add_bookable_restaurant(session)
    diner = diner_id(client, diner_headers(client, "unpaid@example.com"))
    reservation = add_reservation(session, restaurant, diner, TOMORROW, time(12), 2, "indoor")
    response = client.post(
        f"/api/restaurante/reservas/{reservation.id}/cancelar",
        json={"request_id": str(uuid4())},
        headers=restaurant_headers(client, restaurant),
    )
    assert response.status_code == 200
    assert response.json()["refund"] is None


def test_us38_s6_failed_refund_preserves_reservation(client, session, monkeypatch):
    restaurant, _, reservation, _ = setup_paid(client, session)
    monkeypatch.setattr(refunds, "force_failure", True)
    headers = restaurant_headers(client, restaurant)
    payload = {"request_id": str(uuid4())}
    response = client.post(
        f"/api/restaurante/reservas/{reservation.id}/cancelar", json=payload, headers=headers
    )
    assert response.status_code == 502
    session.refresh(reservation)
    assert reservation.status == "confirmed"
    monkeypatch.setattr(refunds, "force_failure", False)
    assert (
        client.post(
            f"/api/restaurante/reservas/{reservation.id}/cancelar",
            json=payload,
            headers=headers,
        ).status_code
        == 200
    )


def test_us38_edge_repeated_request_does_not_duplicate_refund_or_notice(
    client, session, mail_outbox
):
    restaurant, _, reservation, order = setup_paid(client, session)
    mail_outbox.clear()
    headers = restaurant_headers(client, restaurant)
    payload = {"request_id": str(uuid4())}
    path = f"/api/restaurante/reservas/{reservation.id}/cancelar"
    assert client.post(path, json=payload, headers=headers).status_code == 200
    assert client.post(path, json=payload, headers=headers).status_code == 200
    assert session.scalar(select(Refund).where(Refund.order_id == order.id)).status == "completed"
    assert (
        session.scalar(select(Notification).where(Notification.reservation_id == reservation.id))
        is not None
    )
    assert len(mail_outbox) == 1


def test_us38_edge_rejects_foreign_reservation(client, session):
    _, _, reservation, _ = setup_paid(client, session)
    other = add_bookable_restaurant(session, cuit="30712345678")
    response = client.post(
        f"/api/restaurante/reservas/{reservation.id}/cancelar",
        json={"request_id": str(uuid4())},
        headers=restaurant_headers(client, other),
    )
    assert response.status_code == 404
    assert reservation.status == "confirmed"
