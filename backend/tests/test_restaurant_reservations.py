from datetime import time

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

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
    client: TestClient, session: Session
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
