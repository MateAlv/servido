from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.services.reservation_conflicts import (
    AffectedReservation,
    ReservationConflictResult,
)

from .test_restaurant_profile import _auth


def test_us10_s1_grouped_table_inventory_is_saved(client: TestClient) -> None:
    headers = _auth(client)
    payload = [
        {"capacity": 2, "quantity": 4, "available": True},
        {"capacity": 4, "quantity": 2, "available": True},
    ]

    response = client.put("/api/restaurante/mesas", json=payload, headers=headers)

    assert response.status_code == 200
    body = client.get("/api/restaurante/mesas", headers=headers).json()
    assert [(item["capacity"], item["quantity"]) for item in body] == [(2, 4), (4, 2)]
    assert all("name" not in item for item in body)


def test_us10_s2_inventory_reduction_checks_reservation_stub(
    client: TestClient, monkeypatch
) -> None:
    headers = _auth(client)
    initial = [{"capacity": 2, "quantity": 3, "available": True}]
    assert client.put("/api/restaurante/mesas", json=initial, headers=headers).status_code == 200
    monkeypatch.setattr(
        "app.services.reservation_conflicts.check_reservation_conflict",
        lambda request: ReservationConflictResult(
            has_conflict=True,
            affected_reservations=[
                AffectedReservation(UUID(int=1), request.date, request.start_time, 1)
            ],
        ),
    )

    response = client.put(
        "/api/restaurante/mesas",
        json=[{"capacity": 2, "quantity": 2, "available": True}],
        headers=headers,
    )

    assert response.status_code == 409
    assert client.get("/api/restaurante/mesas", headers=headers).json()[0]["quantity"] == 3


def test_us10_s1_available_table_with_sufficient_capacity_is_selectable(
    client: TestClient, session: Session
) -> None:
    headers = _auth(client)
    assert (
        client.put(
            "/api/restaurante/mesas",
            json=[
                {"capacity": 2, "quantity": 4, "available": True},
                {"capacity": 4, "quantity": 2, "available": True},
            ],
            headers=headers,
        ).status_code
        == 200
    )

    from app.models.restaurant import Restaurant
    from app.services.table_inventory import eligible_quantity

    session.expire_all()
    restaurant = session.scalar(select(Restaurant).where(Restaurant.email == "profile@example.com"))
    assert restaurant is not None
    assert eligible_quantity(session, restaurant.id_restaurante, 3) == 2


def test_us10_s2_unavailable_table_groups_are_excluded(client: TestClient) -> None:
    headers = _auth(client)
    assert (
        client.put(
            "/api/restaurante/mesas",
            json=[{"capacity": 4, "quantity": 2, "available": False}],
            headers=headers,
        ).status_code
        == 200
    )
    body = client.get("/api/restaurante/mesas", headers=headers).json()
    assert body[0]["quantity"] == 2
    assert body[0]["free_quantity"] == 0


def test_us10_edge_disabling_reserved_capacity_returns_conflict(
    client: TestClient, monkeypatch
) -> None:
    headers = _auth(client)
    assert (
        client.put(
            "/api/restaurante/mesas",
            json=[{"capacity": 4, "quantity": 2, "available": True}],
            headers=headers,
        ).status_code
        == 200
    )
    monkeypatch.setattr(
        "app.services.reservation_conflicts.check_reservation_conflict",
        lambda request: ReservationConflictResult(
            has_conflict=True,
            affected_reservations=[
                AffectedReservation(UUID(int=2), request.date, request.start_time, 1)
            ],
        ),
    )
    response = client.put(
        "/api/restaurante/mesas",
        json=[{"capacity": 4, "quantity": 2, "available": False}],
        headers=headers,
    )
    assert response.status_code == 409
    assert client.get("/api/restaurante/mesas", headers=headers).json()[0]["available"] is True


def test_us10_s1_groups_have_a_seating_area(client: TestClient) -> None:
    headers = _auth(client)
    payload = [
        {"capacity": 4, "quantity": 2, "seating_area": "indoor", "available": True},
        {"capacity": 4, "quantity": 1, "seating_area": "terrace", "available": True},
        {"capacity": 2, "quantity": 3, "available": True},
    ]

    response = client.put("/api/restaurante/mesas", json=payload, headers=headers)

    assert response.status_code == 200
    body = client.get("/api/restaurante/mesas", headers=headers).json()
    assert [(item["capacity"], item["seating_area"], item["quantity"]) for item in body] == [
        (2, "indoor", 3),
        (4, "indoor", 2),
        (4, "terrace", 1),
    ]


def test_us10_s1_two_groups_cannot_share_capacity_and_seating_area(client: TestClient) -> None:
    headers = _auth(client)
    duplicated = [
        {"capacity": 4, "quantity": 2, "seating_area": "terrace"},
        {"capacity": 4, "quantity": 1, "seating_area": "terrace"},
    ]
    unknown_area = [{"capacity": 4, "quantity": 2, "seating_area": "barra"}]

    assert client.put("/api/restaurante/mesas", json=duplicated, headers=headers).status_code == 400
    assert (
        client.put("/api/restaurante/mesas", json=unknown_area, headers=headers).status_code == 400
    )
