from uuid import UUID

from fastapi.testclient import TestClient

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
