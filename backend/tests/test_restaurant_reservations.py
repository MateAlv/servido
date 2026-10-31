from datetime import UTC, datetime, time

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.services import availability
from tests.reservations import (
    TODAY,
    add_bookable_restaurant,
    add_reservation,
    diner_headers,
    diner_id,
)


def restaurant_headers(client: TestClient, restaurant) -> dict[str, str]:
    token = client.post(
        "/api/auth/restaurante",
        json={"email": restaurant.email, "password": "Segura123"},
    ).json()["access_token"]
    return {"Authorization": "Bearer " + token}


def setup_reservations(client: TestClient, session: Session):
    restaurant = add_bookable_restaurant(session)
    diner = diner_id(client, diner_headers(client))
    first = add_reservation(session, restaurant, diner, TODAY, time(20), 4, "terrace")
    second = add_reservation(session, restaurant, diner, TODAY, time(12), 2, "indoor")
    other_day = add_reservation(
        session, restaurant, diner, TODAY.replace(day=3), time(20), 4, "terrace"
    )
    session.flush()
    return restaurant, first, second, other_day


def test_us14_s1_lists_reservations_for_restaurant_by_date_and_shift(
    client: TestClient, session: Session, mail_outbox
) -> None:
    restaurant, first, second, other_day = setup_reservations(client, session)
    headers = restaurant_headers(client, restaurant)

    response = client.get(
        "/api/restaurante/reservas", params={"date": TODAY.isoformat()}, headers=headers
    )

    assert response.status_code == 200
    assert response.json()["date"] == TODAY.isoformat()
    assert [item["id"] for item in response.json()["reservations"]] == [
        str(second.id),
        str(first.id),
    ]
    assert str(other_day.id) not in {item["id"] for item in response.json()["reservations"]}
    assert response.json()["restaurant_id"] == str(restaurant.id_restaurante)


def test_us14_s2_includes_time_table_party_size_and_status(
    client: TestClient, session: Session
) -> None:
    restaurant, first, _, _ = setup_reservations(client, session)
    headers = restaurant_headers(client, restaurant)
    response = client.get(
        "/api/restaurante/reservas", params={"date": TODAY.isoformat()}, headers=headers
    )

    assert response.status_code == 200
    reservation = response.json()["reservations"][1]
    assert reservation["id"] == str(first.id)
    assert reservation["start_time"] == "20:00"
    assert reservation["end_time"] == "21:30"
    assert reservation["party_size"] == 2
    assert reservation["table"] == {"capacity": 4, "seating_area": "terrace"}
    assert reservation["status"] == "confirmed"


def test_us14_s3_orders_reservations_by_start_time(client: TestClient, session: Session) -> None:
    restaurant, _, _, _ = setup_reservations(client, session)
    headers = restaurant_headers(client, restaurant)
    response = client.get(
        "/api/restaurante/reservas", params={"date": TODAY.isoformat()}, headers=headers
    )
    assert [item["start_time"] for item in response.json()["reservations"]] == ["12:00", "20:00"]


def test_us14_s5_reflects_current_reservations(client: TestClient, session: Session) -> None:
    restaurant, _, _, _ = setup_reservations(client, session)
    headers = restaurant_headers(client, restaurant)
    response = client.get(
        "/api/restaurante/reservas", params={"date": TODAY.isoformat()}, headers=headers
    )
    assert response.status_code == 200
    assert len(response.json()["reservations"]) == 2


def test_us14_s6_returns_cancelled_status(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session, cuit="30712345676")
    diner = diner_id(client, diner_headers(client, "cancelled@example.com"))
    reservation = add_reservation(session, restaurant, diner, TODAY, time(20), 4, "terrace")
    reservation.status = "cancelled"
    reservation.cancelled_at = datetime(2026, 11, 1, 21, 0, tzinfo=UTC)
    session.flush()
    headers = restaurant_headers(client, restaurant)
    response = client.get(
        "/api/restaurante/reservas", params={"date": TODAY.isoformat()}, headers=headers
    )
    assert response.json()["reservations"][0]["status"] == "cancelled"


def test_us14_edge_requires_restaurant_ownership(client: TestClient, session: Session) -> None:
    add_bookable_restaurant(session)
    diner_headers_value = diner_headers(client, "edge@example.com")
    assert (
        client.get(
            "/api/restaurante/reservas",
            params={"date": TODAY.isoformat()},
            headers=diner_headers_value,
        ).status_code
        == 403
    )


def test_us14_edge_empty_date_returns_empty_list(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session, cuit="30712345678")
    headers = restaurant_headers(client, restaurant)
    response = client.get(
        "/api/restaurante/reservas", params={"date": TODAY.isoformat()}, headers=headers
    )
    assert response.status_code == 200
    assert response.json()["reservations"] == []


def test_us16_s1_returns_minimal_diner_contact_for_owned_reservation(
    client: TestClient, session: Session
) -> None:
    restaurant, reservation, _, _ = setup_reservations(client, session)
    headers = restaurant_headers(client, restaurant)
    response = client.get(f"/api/restaurante/reservas/{reservation.id}/comensal", headers=headers)
    assert response.status_code == 200
    assert response.json()["reservation_id"] == str(reservation.id)
    assert response.json()["diner"]["email"] == "martin@example.com"
    assert "password_hash" not in response.json()["diner"]


def test_us16_s2_denies_foreign_reservation_diner_access(
    client: TestClient, session: Session
) -> None:
    restaurant, reservation, _, _ = setup_reservations(client, session)
    other = add_bookable_restaurant(session, cuit="30712345678")
    response = client.get(
        f"/api/restaurante/reservas/{reservation.id}/comensal",
        headers=restaurant_headers(client, other),
    )
    assert response.status_code == 404
    assert restaurant.id_restaurante != other.id_restaurante


def test_us16_edge_rejects_missing_session_and_unknown_reservation(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, cuit="30712345678")
    assert (
        client.get(
            "/api/restaurante/reservas/00000000-0000-0000-0000-000000000000/comensal",
        ).status_code
        == 401
    )
    response = client.get(
        "/api/restaurante/reservas/00000000-0000-0000-0000-000000000000/comensal",
        headers=restaurant_headers(client, restaurant),
    )
    assert response.status_code == 404


def test_us18_s1_lists_only_cancelled_reservations(
    client: TestClient, session: Session, mail_outbox
) -> None:
    restaurant, cancelled, confirmed, _ = setup_reservations(client, session)
    mail_outbox.clear()
    cancelled.status = "cancelled"
    cancelled.cancelled_at = datetime(2026, 11, 1, 21, 0, tzinfo=UTC)
    session.flush()
    response = client.get(
        "/api/restaurante/cancelaciones",
        headers=restaurant_headers(client, restaurant),
    )
    assert response.status_code == 200
    assert [item["reservation_id"] for item in response.json()["cancellations"]] == [
        str(cancelled.id)
    ]
    assert str(confirmed.id) not in response.text
    assert mail_outbox == []


def test_us18_s2_returns_cancellation_details(client: TestClient, session: Session) -> None:
    restaurant, cancelled, _, _ = setup_reservations(client, session)
    cancelled.status = "cancelled"
    cancelled.cancelled_at = datetime(2026, 11, 1, 21, 0, tzinfo=UTC)
    session.flush()
    response = client.get(
        "/api/restaurante/cancelaciones",
        params={"date": TODAY.isoformat()},
        headers=restaurant_headers(client, restaurant),
    )
    item = response.json()["cancellations"][0]
    assert item["reservation_date"] == TODAY.isoformat()
    assert item["start_time"] == "20:00"
    assert item["table"] == {"capacity": 4, "seating_area": "terrace"}
    assert item["status"] == "cancelled"
    assert item["cancelled_at"] == "2026-11-01T18:00:00-03:00"


def test_us18_s4_filters_cancellations_by_local_date(client: TestClient, session: Session) -> None:
    restaurant, cancelled, _, other_day = setup_reservations(client, session)
    cancelled.status = "cancelled"
    cancelled.cancelled_at = datetime(2026, 11, 1, 21, 0, tzinfo=UTC)
    other_day.status = "cancelled"
    other_day.cancelled_at = datetime(2026, 11, 2, 21, 0, tzinfo=UTC)
    session.flush()
    response = client.get(
        "/api/restaurante/cancelaciones",
        params={"date": TODAY.isoformat()},
        headers=restaurant_headers(client, restaurant),
    )
    assert [item["reservation_id"] for item in response.json()["cancellations"]] == [
        str(cancelled.id)
    ]


def test_us18_s6_cancelled_reservation_is_available_again(
    client: TestClient, session: Session
) -> None:
    restaurant, cancelled, _, _ = setup_reservations(client, session)
    cancelled.status = "cancelled"
    cancelled.cancelled_at = datetime(2026, 11, 1, 21, 0, tzinfo=UTC)
    session.flush()
    _, groups = availability.groups_at(
        session, restaurant.id_restaurante, TODAY, time(20), 2, availability.current_time()
    )
    terrace = next(group for group in groups if group.seating_area == "terrace")
    assert terrace.free == 1


def test_us18_edge_empty_cancellations_returns_empty_list(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, cuit="30712345678")
    response = client.get(
        "/api/restaurante/cancelaciones",
        params={"date": TODAY.isoformat()},
        headers=restaurant_headers(client, restaurant),
    )
    assert response.status_code == 200
    assert response.json()["cancellations"] == []


def test_us18_edge_requires_restaurant_session(client: TestClient, session: Session) -> None:
    response = client.get("/api/restaurante/cancelaciones", params={"date": TODAY.isoformat()})
    assert response.status_code == 401


def test_us18_edge_rejects_invalid_date_and_diner_session(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, cuit="30712345678")
    assert (
        client.get(
            "/api/restaurante/cancelaciones",
            params={"date": "not-a-date"},
            headers=restaurant_headers(client, restaurant),
        ).status_code
        == 400
    )
    assert (
        client.get(
            "/api/restaurante/cancelaciones",
            params={"date": TODAY.isoformat()},
            headers=diner_headers(client, "cancelations-edge@example.com"),
        ).status_code
        == 403
    )
