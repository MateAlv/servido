"""Acceptance tests for spec 005: availability (US-11) and confirming a reservation (US-13).

Every test runs on Monday 2 November 2026 at 09:00 in Buenos Aires (`fixed_now` in conftest.py).
The restaurant opens every day 12:00–15:00 and 20:00–23:30 unless a test says otherwise.
"""

from datetime import datetime, time, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.table_inventory import TableInventoryGroup
from app.services import availability
from tests.reservations import (
    BUENOS_AIRES,
    TODAY,
    TOMORROW,
    add_bookable_restaurant,
    add_reservation,
    diner_headers,
    diner_id,
)
from tests.test_restaurant_profile import _auth

ALL_SLOTS = ["12:00", "12:30", "13:00", "13:30", "20:00", "20:30", "21:00", "21:30", "22:00"]


def slots(client: TestClient, headers: dict, restaurant_id, day=TOMORROW, party_size=2):
    return client.get(
        f"/api/restaurants/{restaurant_id}/availability",
        params={"date": day.isoformat(), "party_size": party_size},
        headers=headers,
    )


def tables(client: TestClient, headers: dict, restaurant_id, start="20:00", party_size=2):
    return client.get(
        f"/api/restaurants/{restaurant_id}/availability/tables",
        params={"date": TOMORROW.isoformat(), "start_time": start, "party_size": party_size},
        headers=headers,
    )


def offered(response) -> dict[str, bool]:
    return {slot["start_time"]: slot["available"] for slot in response.json()["slots"]}


def test_us11_s2_rejects_past_date(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)

    response = slots(client, headers, restaurant.id_restaurante, day=TODAY - timedelta(days=1))

    assert response.status_code == 400


def test_us11_s3_returns_only_slots_inside_shifts(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)

    response = slots(client, headers, restaurant.id_restaurante)

    assert response.status_code == 200
    body = response.json()
    assert body["open"] is True
    assert body["duration_minutes"] == 90
    # The last start of each shift is the one whose 90 minutes still fit.
    assert offered(response) == {start: True for start in ALL_SLOTS}


def test_us11_s3_returns_no_slots_on_a_closed_weekday(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session, closed_days=(TOMORROW.isoweekday(),))
    headers = diner_headers(client)

    body = slots(client, headers, restaurant.id_restaurante).json()

    assert body["open"] is False
    assert body["slots"] == []


def test_us11_s4_marks_a_slot_without_free_tables_unavailable(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(2, 1, "indoor")])
    headers = diner_headers(client)
    add_reservation(session, restaurant, diner_id(client, headers), TOMORROW, time(20), 2, "indoor")

    availability_by_start = offered(slots(client, headers, restaurant.id_restaurante))

    # The reservation holds the only table from 20:00 to 21:30.
    assert availability_by_start["20:00"] is False
    assert availability_by_start["20:30"] is False
    assert availability_by_start["21:00"] is False
    assert availability_by_start["21:30"] is True
    assert availability_by_start["12:00"] is True


def test_us11_s6_offers_only_groups_with_enough_capacity(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(
        session, groups=[(2, 2, "indoor"), (4, 1, "terrace"), (6, 1, "indoor")]
    )
    headers = diner_headers(client)

    response = tables(client, headers, restaurant.id_restaurante, party_size=3)

    assert response.status_code == 200
    assert response.json()["tables"] == [
        {"capacity": 4, "seating_area": "terrace", "free": 1},
        {"capacity": 6, "seating_area": "indoor", "free": 1},
    ]


def test_us11_s7_returns_no_tables_when_none_fit(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(4, 1, "terrace")])
    headers = diner_headers(client)
    add_reservation(
        session, restaurant, diner_id(client, headers), TOMORROW, time(20), 4, "terrace"
    )

    response = tables(client, headers, restaurant.id_restaurante)

    assert response.status_code == 200
    assert response.json()["tables"] == []


def test_us11_edge_returns_the_restaurant_max_party_size(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(2, 2, "indoor"), (6, 1, "indoor")])
    session.add(
        TableInventoryGroup(
            restaurant_id=restaurant.id_restaurante, capacity=8, quantity=1, available=False
        )
    )
    session.flush()
    headers = diner_headers(client)

    body = slots(client, headers, restaurant.id_restaurante).json()

    assert body["max_party_size"] == 6


def test_us11_edge_returns_no_max_without_active_tables(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, groups=[])
    headers = diner_headers(client)

    response = slots(client, headers, restaurant.id_restaurante)

    assert response.status_code == 200
    assert response.json()["max_party_size"] == 0
    assert response.json()["slots"] == []


def test_us11_edge_offers_no_slots_above_the_restaurant_maximum(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(4, 2, "indoor")])
    headers = diner_headers(client)

    body = slots(client, headers, restaurant.id_restaurante, party_size=5).json()

    assert body["max_party_size"] == 4
    assert body["slots"] == []


def test_us11_edge_does_not_offer_past_times_of_today(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(
        availability,
        "current_time",
        lambda: datetime.combine(TODAY, time(12, 40), tzinfo=BUENOS_AIRES),
    )
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)

    response = slots(client, headers, restaurant.id_restaurante, day=TODAY)

    assert list(offered(response)) == [
        "13:00",
        "13:30",
        "20:00",
        "20:30",
        "21:00",
        "21:30",
        "22:00",
    ]
    past_start = client.get(
        f"/api/restaurants/{restaurant.id_restaurante}/availability/tables",
        params={"date": TODAY.isoformat(), "start_time": "12:30", "party_size": 2},
        headers=headers,
    )
    assert past_start.status_code == 400


def test_us11_edge_returns_no_slots_without_shifts(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session, shifts=())
    headers = diner_headers(client)

    body = slots(client, headers, restaurant.id_restaurante).json()

    assert body["open"] is False
    assert body["slots"] == []


def test_us11_edge_one_table_with_two_reservations_counts_once(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(2, 2, "indoor")])
    headers = diner_headers(client)
    diner = diner_id(client, headers)
    add_reservation(session, restaurant, diner, TOMORROW, time(20), 2, "indoor", table_number=1)
    add_reservation(session, restaurant, diner, TOMORROW, time(21, 30), 2, "indoor", table_number=1)

    # 21:00–22:30 overlaps both reservations, but they hold the same table: table 2 is free.
    assert offered(slots(client, headers, restaurant.id_restaurante))["21:00"] is True
    assert tables(client, headers, restaurant.id_restaurante, start="21:00").json()["tables"] == [
        {"capacity": 2, "seating_area": "indoor", "free": 1}
    ]


def test_us11_edge_requires_a_token(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)

    assert slots(client, {}, restaurant.id_restaurante).status_code == 401
    assert tables(client, {}, restaurant.id_restaurante).status_code == 401


def test_us11_edge_rejects_a_restaurant_account(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session, cuit="20123456786")
    headers = _auth(client)

    assert slots(client, headers, restaurant.id_restaurante).status_code == 403
    assert tables(client, headers, restaurant.id_restaurante).status_code == 403


def test_us11_edge_unknown_restaurant_is_not_found(client: TestClient) -> None:
    headers = diner_headers(client)

    assert slots(client, headers, uuid4()).status_code == 404
    assert tables(client, headers, uuid4()).status_code == 404


@pytest.mark.parametrize(
    ("day", "start", "party_size"),
    [
        (TOMORROW, "20:00", 0),  # nobody to seat
        (TOMORROW, "20:15", 2),  # off the 30-minute grid
        (TOMORROW, "16:00", 2),  # between shifts
        (TOMORROW, "22:30", 2),  # its 90 minutes don't fit before closing
    ],
)
def test_us11_edge_rejects_an_invalid_request(
    client: TestClient, session: Session, day, start, party_size
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)

    response = client.get(
        f"/api/restaurants/{restaurant.id_restaurante}/availability/tables",
        params={"date": day.isoformat(), "start_time": start, "party_size": party_size},
        headers=headers,
    )

    assert response.status_code == 400
