from datetime import time, timedelta
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.closure import Closure
from app.services import mail
from app.services.auth import create_access_token
from app.services.roles import RESTAURANT
from tests.reservations import (
    TODAY,
    TOMORROW,
    add_bookable_restaurant,
    add_reservation,
    diner_headers,
    diner_id,
)


def _payload(**overrides):
    payload = {
        "date": TOMORROW.isoformat(),
        "start_time": "20:00",
        "end_time": "21:00",
        "request_id": str(uuid4()),
        "confirmed": False,
        "acknowledged_reservation_ids": [],
    }
    return payload | overrides


def _restaurant_headers(restaurant):
    token = create_access_token(str(restaurant.id_restaurante), restaurant.email, RESTAURANT)
    return {"Authorization": "Bearer " + token}


def test_us32_s1_whole_day_closure_hides_every_slot(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    diner = diner_headers(client)
    response = client.post(
        "/api/restaurante/bloqueos",
        json=_payload(start_time=None, end_time=None),
        headers=_restaurant_headers(restaurant),
    )
    assert response.status_code == 201
    availability = client.get(
        f"/api/restaurants/{restaurant.id_restaurante}/availability",
        params={"date": TOMORROW.isoformat(), "party_size": 2},
        headers=diner,
    )
    assert availability.json()["open"] is False
    assert availability.json()["slots"] == []


def test_us32_s2_time_range_closure_hides_overlapping_slots(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    diner = diner_headers(client)
    assert (
        client.post(
            "/api/restaurante/bloqueos", json=_payload(), headers=_restaurant_headers(restaurant)
        ).status_code
        == 201
    )
    slots = client.get(
        f"/api/restaurants/{restaurant.id_restaurante}/availability",
        params={"date": TOMORROW.isoformat(), "party_size": 2},
        headers=diner,
    ).json()["slots"]
    offered = {slot["start_time"]: slot["available"] for slot in slots}
    assert offered["20:00"] is False
    assert offered["20:30"] is False
    assert offered["21:00"] is True
    assert offered["21:30"] is True


def test_us32_s3_warns_about_affected_reservations(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    diner_headers_value = diner_headers(client, "affected@example.com")
    reservation = add_reservation(
        session, restaurant, diner_id(client, diner_headers_value), TOMORROW, time(20), 2, "indoor"
    )
    response = client.post(
        "/api/restaurante/bloqueos", json=_payload(), headers=_restaurant_headers(restaurant)
    )
    assert response.status_code == 409
    assert response.json()["detail"]["reservations"][0]["reservation_id"] == str(reservation.id)
    assert session.scalar(select(Closure)) is None


def test_us32_s4_confirmation_cancels_affected_reservations(
    client: TestClient, session: Session, mail_outbox
) -> None:
    restaurant = add_bookable_restaurant(session)
    diner_headers_value = diner_headers(client, "cancelled@example.com")
    reservation = add_reservation(
        session, restaurant, diner_id(client, diner_headers_value), TOMORROW, time(20), 2, "indoor"
    )
    headers = _restaurant_headers(restaurant)
    initial = _payload()
    warning = client.post("/api/restaurante/bloqueos", json=initial, headers=headers).json()
    payload = initial | {
        "confirmed": True,
        "acknowledged_reservation_ids": [str(reservation.id)],
    }
    response = client.post("/api/restaurante/bloqueos", json=payload, headers=headers)
    assert response.status_code == 201
    assert response.json()["id"]
    assert reservation.status == "cancelled"
    assert reservation.cancelled_at is not None
    assert sum("canceló" in message.subject for message in mail_outbox) == 1
    assert warning["detail"]["reservations"][0]["party_size"] == 2


def test_us32_s5_declining_keeps_the_reservations_and_creates_nothing(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    diner_headers_value = diner_headers(client, "decline@example.com")
    reservation = add_reservation(
        session, restaurant, diner_id(client, diner_headers_value), TOMORROW, time(20), 2, "indoor"
    )
    response = client.post(
        "/api/restaurante/bloqueos", json=_payload(), headers=_restaurant_headers(restaurant)
    )
    assert response.status_code == 409
    assert reservation.status == "confirmed"
    assert session.scalar(select(Closure)) is None


def test_us32_s6_rejects_invalid_ranges_and_past_dates(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = _restaurant_headers(restaurant)
    for payload, message in (
        (_payload(end_time="20:00"), "posterior"),
        (_payload(date=(TODAY - timedelta(days=1)).isoformat()), "fecha pasada"),
        (_payload(start_time="20:00", end_time=None), "hora de inicio"),
        (_payload(date=TODAY.isoformat(), start_time="08:00", end_time="10:00"), "ya comenzó"),
    ):
        response = client.post("/api/restaurante/bloqueos", json=payload, headers=headers)
        assert response.status_code == 400
        assert message in response.json()["detail"]


def test_us32_s7_lists_and_deletes_restaurant_closures(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = _restaurant_headers(restaurant)
    created = client.post("/api/restaurante/bloqueos", json=_payload(), headers=headers).json()
    listed = client.get("/api/restaurante/bloqueos", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["closures"][0]["id"] == created["id"]
    assert (
        client.delete(f"/api/restaurante/bloqueos/{created['id']}", headers=headers).status_code
        == 204
    )
    assert client.get("/api/restaurante/bloqueos", headers=headers).json()["closures"] == []


def test_us32_s8_deleting_a_closure_restores_availability(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    diner = diner_headers(client)
    headers = _restaurant_headers(restaurant)
    created = client.post("/api/restaurante/bloqueos", json=_payload(), headers=headers).json()
    assert (
        client.delete(f"/api/restaurante/bloqueos/{created['id']}", headers=headers).status_code
        == 204
    )
    slots = client.get(
        f"/api/restaurants/{restaurant.id_restaurante}/availability",
        params={"date": TOMORROW.isoformat(), "party_size": 2},
        headers=diner,
    ).json()["slots"]
    assert any(slot["start_time"] == "20:00" and slot["available"] for slot in slots)


def test_us32_edge_overlapping_closures_block_the_union(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    diner = diner_headers(client)
    headers = _restaurant_headers(restaurant)
    assert (
        client.post(
            "/api/restaurante/bloqueos", json=_payload(end_time="20:30"), headers=headers
        ).status_code
        == 201
    )
    assert (
        client.post(
            "/api/restaurante/bloqueos",
            json=_payload(start_time="21:00", end_time="22:00"),
            headers=headers,
        ).status_code
        == 201
    )
    body = client.get(
        f"/api/restaurants/{restaurant.id_restaurante}/availability",
        params={"date": TOMORROW, "party_size": 2},
        headers=diner,
    ).json()
    assert all(
        not slot["available"]
        for slot in body["slots"]
        if slot["start_time"] in {"20:00", "20:30", "21:00"}
    )


def test_us32_edge_repeated_request_applies_once(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = _restaurant_headers(restaurant)
    payload = _payload()
    first = client.post("/api/restaurante/bloqueos", json=payload, headers=headers)
    second = client.post("/api/restaurante/bloqueos", json=payload, headers=headers)
    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json()["id"] == first.json()["id"]


def test_us32_edge_closure_outside_shifts_is_saved_without_affected_reservations(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    response = client.post(
        "/api/restaurante/bloqueos",
        json=_payload(start_time="16:00", end_time="17:00"),
        headers=_restaurant_headers(restaurant),
    )
    assert response.status_code == 201


def test_us32_edge_restaurant_only_sees_and_removes_its_closures(
    client: TestClient, session: Session
) -> None:
    first = add_bookable_restaurant(session, cuit="30712345672")
    second = add_bookable_restaurant(session, cuit="30712345673")
    created = client.post(
        "/api/restaurante/bloqueos", json=_payload(), headers=_restaurant_headers(first)
    ).json()
    assert (
        client.get("/api/restaurante/bloqueos", headers=_restaurant_headers(second)).json()[
            "closures"
        ]
        == []
    )
    assert (
        client.delete(
            f"/api/restaurante/bloqueos/{created['id']}", headers=_restaurant_headers(second)
        ).status_code
        == 404
    )


def test_us32_edge_partial_range_started_today_is_rejected(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    response = client.post(
        "/api/restaurante/bloqueos",
        json=_payload(date=TODAY.isoformat(), start_time="08:00", end_time="10:00"),
        headers=_restaurant_headers(restaurant),
    )
    assert response.status_code == 400


def test_us32_edge_mail_failure_does_not_undo_the_closure(
    client: TestClient, session: Session, monkeypatch
) -> None:
    restaurant = add_bookable_restaurant(session)
    diner_headers_value = diner_headers(client, "mail-failure@example.com")
    add_reservation(
        session, restaurant, diner_id(client, diner_headers_value), TOMORROW, time(20), 2, "indoor"
    )
    monkeypatch.setattr(mail, "send_mail", lambda _mail: (_ for _ in ()).throw(mail.MailError()))
    headers = _restaurant_headers(restaurant)
    initial = _payload()
    warning = client.post("/api/restaurante/bloqueos", json=initial, headers=headers).json()
    response = client.post(
        "/api/restaurante/bloqueos",
        json=initial
        | {
            "confirmed": True,
            "acknowledged_reservation_ids": [
                warning["detail"]["reservations"][0]["reservation_id"]
            ],
        },
        headers=headers,
    )
    assert response.status_code == 201


def test_us32_edge_changing_shifts_keeps_closures(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = _restaurant_headers(restaurant)
    created = client.post("/api/restaurante/bloqueos", json=_payload(), headers=headers).json()
    session.query(Closure).filter(Closure.id == created["id"]).one().start_time = time(19)
    session.flush()
    assert client.get("/api/restaurante/bloqueos", headers=headers).json()["closures"]


def test_us32_edge_reservation_crossing_the_range_is_affected(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    diner_headers_value = diner_headers(client, "crossing@example.com")
    reservation = add_reservation(
        session,
        restaurant,
        diner_id(client, diner_headers_value),
        TOMORROW,
        time(19, 30),
        2,
        "indoor",
    )
    response = client.post(
        "/api/restaurante/bloqueos", json=_payload(), headers=_restaurant_headers(restaurant)
    )
    assert response.status_code == 409
    assert response.json()["detail"]["reservations"][0]["reservation_id"] == str(reservation.id)


def test_us32_edge_new_reservation_between_warning_and_confirmation_rewarns(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    diner_headers_value = diner_headers(client, "between-warning@example.com")
    diner = diner_id(client, diner_headers_value)
    headers = _restaurant_headers(restaurant)
    payload = _payload()
    existing = add_reservation(session, restaurant, diner, TOMORROW, time(20), 2, "indoor")
    warning = client.post("/api/restaurante/bloqueos", json=payload, headers=headers)
    assert warning.status_code == 409
    add_reservation(session, restaurant, diner, TOMORROW, time(20), 2, "indoor", table_number=2)
    response = client.post(
        "/api/restaurante/bloqueos",
        json=payload | {"confirmed": True, "acknowledged_reservation_ids": [str(existing.id)]},
        headers=headers,
    )
    assert response.status_code == 409


def test_us32_edge_cancelled_reservation_releases_table_and_order(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(2, 1, "indoor")])
    diner_headers_value = diner_headers(client, "released-table@example.com")
    reservation = add_reservation(
        session, restaurant, diner_id(client, diner_headers_value), TOMORROW, time(20), 2, "indoor"
    )
    headers = _restaurant_headers(restaurant)
    payload = _payload(confirmed=False)
    warning = client.post("/api/restaurante/bloqueos", json=payload, headers=headers).json()
    response = client.post(
        "/api/restaurante/bloqueos",
        json=payload
        | {
            "confirmed": True,
            "acknowledged_reservation_ids": [str(reservation.id)],
        },
        headers=headers,
    )
    assert response.status_code == 201
    assert warning["detail"]["reservations"]


def test_us32_edge_blocked_start_cannot_be_confirmed(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    diner_headers_value = diner_headers(client, "blocked-start@example.com")
    headers = _restaurant_headers(restaurant)
    assert (
        client.post("/api/restaurante/bloqueos", json=_payload(), headers=headers).status_code
        == 201
    )
    response = client.post(
        "/api/reservations",
        json={
            "restaurant_id": str(restaurant.id_restaurante),
            "date": TOMORROW.isoformat(),
            "start_time": "20:00",
            "party_size": 2,
            "table": {"capacity": 2, "seating_area": "indoor"},
            "request_id": str(uuid4()),
        },
        headers=diner_headers_value,
    )
    assert response.status_code == 409
