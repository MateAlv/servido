from datetime import time, timedelta

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.services import availability, orders
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


def test_us23_s1_lists_active_reservation(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)
    reservation = add_reservation(
        session, restaurant, diner_id(client, headers), TOMORROW, time(20), 2, "indoor"
    )

    response = client.get("/api/reservations/active", headers=headers)

    assert response.status_code == 200
    assert [item["id"] for item in response.json()["reservations"]] == [str(reservation.id)]


def test_us23_s3_orders_active_reservations(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(2, 3, "indoor")])
    headers = diner_headers(client)
    diner = diner_id(client, headers)
    later = add_reservation(
        session, restaurant, diner, TOMORROW, time(21), 2, "indoor", table_number=1
    )
    sooner = add_reservation(
        session, restaurant, diner, TOMORROW, time(20), 2, "indoor", table_number=2
    )

    response = client.get("/api/reservations/active", headers=headers)

    assert [item["id"] for item in response.json()["reservations"]] == [
        str(sooner.id),
        str(later.id),
    ]


def test_us23_s5_excludes_cancelled_reservation(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)
    reservation = add_reservation(
        session, restaurant, diner_id(client, headers), TOMORROW, time(20), 2, "indoor"
    )
    reservation.status = "cancelled"
    reservation.cancelled_at = NOW
    session.flush()

    assert client.get("/api/reservations/active", headers=headers).json()["reservations"] == []


def test_us23_edge_hides_foreign_reservations(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    own_headers = diner_headers(client)
    own_diner = diner_id(client, own_headers)
    foreign_headers = diner_headers(client, email="otro@example.com")
    foreign = add_reservation(
        session, restaurant, diner_id(client, foreign_headers), TOMORROW, time(20), 2, "indoor"
    )
    own = add_reservation(
        session, restaurant, own_diner, TOMORROW, time(21), 2, "indoor", table_number=2
    )

    response = client.get("/api/reservations/active", headers=own_headers)

    assert [item["id"] for item in response.json()["reservations"]] == [str(own.id)]
    assert str(foreign.id) not in {item["id"] for item in response.json()["reservations"]}


def test_us25_s3_cancels_owned_reservation(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)
    reservation = add_reservation(
        session, restaurant, diner_id(client, headers), TOMORROW, time(20), 2, "indoor"
    )

    response = client.delete(f"/api/reservations/{reservation.id}", headers=headers)

    assert response.status_code == 200
    assert response.json()["message"] == "La reserva se canceló correctamente."
    assert response.json()["reservation"]["status"] == "cancelled"
    assert response.json()["reservation"]["id"] == str(reservation.id)
    assert reservation.cancelled_at is not None


def test_us25_s5_rejects_cancellation_inside_deadline(
    client: TestClient, session: Session, monkeypatch
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)
    starts_at = NOW + timedelta(minutes=44)
    reservation = add_reservation(
        session,
        restaurant,
        diner_id(client, headers),
        starts_at.date(),
        starts_at.time(),
        2,
        "indoor",
    )
    monkeypatch.setattr(availability, "current_time", lambda: NOW)

    response = client.delete(f"/api/reservations/{reservation.id}", headers=headers)

    assert response.status_code == 409
    assert "45 minutos" in response.json()["detail"]
    assert reservation.status == "confirmed"


def test_us25_s6_cancels_associated_order_with_reservation(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)
    diner = diner_id(client, headers)
    reservation = add_reservation(session, restaurant, diner, TOMORROW, time(20), 2, "indoor")
    dish = add_dish(session, restaurant, "Ravioles", "10.00")
    order = add_order(session, reservation, [(dish, 1)])

    response = client.delete(f"/api/reservations/{reservation.id}", headers=headers)

    assert response.status_code == 200
    assert order.status == "confirmed"
    assert response.json()["reservation"]["status"] == "cancelled"
    assert orders.order_open(session, reservation, NOW) is False


def test_us25_s6_releases_table_availability(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(2, 1, "indoor")])
    headers = diner_headers(client)
    reservation = add_reservation(
        session, restaurant, diner_id(client, headers), TOMORROW, time(20), 2, "indoor"
    )
    before = client.get(
        f"/api/restaurants/{restaurant.id_restaurante}/availability/tables",
        params={"date": TOMORROW.isoformat(), "start_time": "20:00", "party_size": 2},
        headers=headers,
    )
    assert before.json()["tables"] == []

    response = client.delete(f"/api/reservations/{reservation.id}", headers=headers)

    assert response.status_code == 200
    after = client.get(
        f"/api/restaurants/{restaurant.id_restaurante}/availability/tables",
        params={"date": TOMORROW.isoformat(), "start_time": "20:00", "party_size": 2},
        headers=headers,
    )
    assert after.json()["tables"] == [{"capacity": 2, "seating_area": "indoor", "free": 1}]


def test_us25_edge_repeated_cancellation_is_idempotent(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)
    reservation = add_reservation(
        session, restaurant, diner_id(client, headers), TOMORROW, time(20), 2, "indoor"
    )

    first = client.delete(f"/api/reservations/{reservation.id}", headers=headers)
    cancelled_at = reservation.cancelled_at
    second = client.delete(f"/api/reservations/{reservation.id}", headers=headers)

    assert first.status_code == 200
    assert second.status_code == 409
    assert reservation.cancelled_at == cancelled_at


def test_us25_edge_reports_already_cancelled(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)
    reservation = add_reservation(
        session, restaurant, diner_id(client, headers), TOMORROW, time(20), 2, "indoor"
    )
    reservation.status = "cancelled"
    reservation.cancelled_at = NOW
    session.flush()

    response = client.delete(f"/api/reservations/{reservation.id}", headers=headers)

    assert response.status_code == 409
    assert response.json()["detail"] == "La reserva ya estaba cancelada."


def test_us25_edge_rejects_foreign_reservation(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    own_headers = diner_headers(client)
    foreign_headers = diner_headers(client, email="otro@example.com")
    reservation = add_reservation(
        session, restaurant, diner_id(client, foreign_headers), TOMORROW, time(20), 2, "indoor"
    )

    response = client.delete(f"/api/reservations/{reservation.id}", headers=own_headers)

    assert response.status_code == 404
    assert reservation.status == "confirmed"
