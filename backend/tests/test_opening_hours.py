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
