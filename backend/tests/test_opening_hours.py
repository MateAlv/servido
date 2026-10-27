from fastapi.testclient import TestClient

from .test_restaurant_profile import _auth


def test_us8_s1_opening_shifts_are_saved(client: TestClient) -> None:
    headers = _auth(client)
    payload = [
        {"day_of_week": 1, "start_time": "12:00:00", "end_time": "15:00:00", "active": True},
        {"day_of_week": 1, "start_time": "20:00:00", "end_time": "23:00:00", "active": True},
    ]

    response = client.put("/api/restaurante/horarios", json=payload, headers=headers)

    assert response.status_code == 200
    stored = client.get("/api/restaurante/horarios", headers=headers).json()
    assert [{key: item[key] for key in payload[0]} for item in stored] == payload


def test_us8_s2_invalid_shift_intervals_are_rejected(client: TestClient) -> None:
    headers = _auth(client)
    valid = [{"day_of_week": 1, "start_time": "12:00:00", "end_time": "15:00:00", "active": True}]
    assert client.put("/api/restaurante/horarios", json=valid, headers=headers).status_code == 200

    response = client.put(
        "/api/restaurante/horarios",
        json=[
            {"day_of_week": 1, "start_time": "14:00:00", "end_time": "16:00:00", "active": True},
            {"day_of_week": 1, "start_time": "15:30:00", "end_time": "17:00:00", "active": True},
        ],
        headers=headers,
    )

    assert response.status_code == 400
    stored = client.get("/api/restaurante/horarios", headers=headers).json()
    assert [{key: item[key] for key in valid[0]} for item in stored] == valid


def test_us8_edge_shifts_crossing_midnight_follow_validation_rule(client: TestClient) -> None:
    headers = _auth(client)
    response = client.put(
        "/api/restaurante/horarios",
        json=[{"day_of_week": 1, "start_time": "22:00:00", "end_time": "02:00:00"}],
        headers=headers,
    )
    assert response.status_code == 400

    adjacent = [
        {"day_of_week": 1, "start_time": "12:00:00", "end_time": "15:00:00"},
        {"day_of_week": 1, "start_time": "15:00:00", "end_time": "18:00:00"},
    ]
    assert (
        client.put("/api/restaurante/horarios", json=adjacent, headers=headers).status_code == 200
    )


def test_us8_s3_inactive_weekday_has_no_opening_shifts(client: TestClient) -> None:
    headers = _auth(client)
    payload = [
        {"day_of_week": 2, "start_time": "12:00:00", "end_time": "15:00:00", "active": False}
    ]
    assert client.put("/api/restaurante/horarios", json=payload, headers=headers).status_code == 200
    assert client.get("/api/restaurante/horarios", headers=headers).json() == []
