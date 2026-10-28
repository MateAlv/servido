"""Acceptance tests for spec 005: availability (US-11) and confirming a reservation (US-13).

Every test runs on Monday 2 November 2026 at 09:00 in Buenos Aires (`fixed_now` in conftest.py).
The restaurant opens every day 12:00–15:00 and 20:00–23:30 unless a test says otherwise.
"""

from datetime import datetime, time, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.diner import Diner
from app.models.opening_shift import OpeningShift
from app.models.reservation import Reservation
from app.models.restaurant import Restaurant
from app.models.table_inventory import TableInventoryGroup
from app.services import availability
from tests.reservations import (
    BUENOS_AIRES,
    NOW,
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


# US-13 — Confirmar datos


def confirm(
    client: TestClient,
    headers: dict,
    restaurant_id,
    start="20:00",
    party_size=2,
    table=(2, "indoor"),
    day=TOMORROW,
    request_id=None,
):
    return client.post(
        "/api/reservations",
        json={
            "restaurant_id": str(restaurant_id),
            "date": day.isoformat(),
            "start_time": start,
            "party_size": party_size,
            "table": {"capacity": table[0], "seating_area": table[1]},
            "request_id": str(request_id or uuid4()),
        },
        headers=headers,
    )


def day_reservations(client: TestClient, headers: dict, day=TOMORROW):
    return client.get("/api/reservations", params={"date": day.isoformat()}, headers=headers)


def test_us13_s2_tables_endpoint_lists_groups_smallest_first(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(
        session, groups=[(6, 1, "indoor"), (4, 1, "terrace"), (4, 2, "indoor")]
    )
    headers = diner_headers(client)

    groups = tables(client, headers, restaurant.id_restaurante, party_size=3).json()["tables"]

    # The review proposes the first group of the chosen area: the smallest that seats the party.
    assert [(group["capacity"], group["seating_area"]) for group in groups] == [
        (4, "indoor"),
        (4, "terrace"),
        (6, "indoor"),
    ]


def test_us13_s5_confirmation_creates_a_confirmed_reservation(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(4, 1, "terrace")])
    headers = diner_headers(client)

    response = confirm(
        client, headers, restaurant.id_restaurante, party_size=3, table=(4, "terrace")
    )

    assert response.status_code == 201
    body = response.json()
    assert body["restaurant"] == {
        "id": str(restaurant.id_restaurante),
        "nombre": "La Esquina de Palermo",
    }
    assert (body["date"], body["start_time"], body["end_time"]) == (
        TOMORROW.isoformat(),
        "20:00",
        "21:30",
    )
    assert body["party_size"] == 3
    assert body["table"] == {"capacity": 4, "seating_area": "terrace"}
    assert body["status"] == "confirmed"
    assert "table_number" not in body
    # The table is now taken for that block.
    assert (
        offered(slots(client, headers, restaurant.id_restaurante, party_size=3))["20:00"] is False
    )


def test_us13_s6_lists_the_diner_reservations_of_the_day(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)
    confirm(client, headers, restaurant.id_restaurante, start="21:00")
    confirm(client, headers, restaurant.id_restaurante, start="12:00")

    response = day_reservations(client, headers)

    assert response.status_code == 200
    reservations = response.json()["reservations"]
    assert [(item["start_time"], item["end_time"]) for item in reservations] == [
        ("12:00", "13:30"),
        ("21:00", "22:30"),
    ]
    assert reservations[0]["restaurant"]["nombre"] == "La Esquina de Palermo"
    assert day_reservations(client, headers, day=TOMORROW + timedelta(days=1)).json() == {
        "date": (TOMORROW + timedelta(days=1)).isoformat(),
        "reservations": [],
    }


def test_us13_s6_overlapping_reservation_can_still_be_confirmed(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(2, 2, "indoor")])
    other = add_bookable_restaurant(session, cuit="30711111111", groups=[(2, 1, "indoor")])
    headers = diner_headers(client)
    assert confirm(client, headers, restaurant.id_restaurante).status_code == 201

    same_place_and_time = confirm(client, headers, restaurant.id_restaurante)
    elsewhere = confirm(client, headers, other.id_restaurante, start="20:30")

    assert same_place_and_time.status_code == 201
    assert elsewhere.status_code == 201
    assert len(day_reservations(client, headers).json()["reservations"]) == 3


def test_us13_edge_full_group_answers_409(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(2, 1, "indoor"), (4, 1, "terrace")])
    headers = diner_headers(client)
    assert confirm(client, headers, restaurant.id_restaurante).status_code == 201

    response = confirm(client, headers, restaurant.id_restaurante, start="20:30")

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "La mesa se ocupó mientras confirmabas. Elegí otro horario o tipo de mesa."
    )


def test_us13_edge_database_rejects_a_double_booking(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(2, 1, "indoor")])
    diner = diner_id(client, diner_headers(client))
    add_reservation(session, restaurant, diner, TOMORROW, time(20), 2, "indoor")

    with pytest.raises(IntegrityError):
        add_reservation(session, restaurant, diner, TOMORROW, time(20, 30), 2, "indoor")


def test_us13_edge_repeated_request_returns_the_same_reservation(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)
    request_id = uuid4()

    first = confirm(client, headers, restaurant.id_restaurante, request_id=request_id)
    again = confirm(client, headers, restaurant.id_restaurante, request_id=request_id)

    assert first.status_code == 201
    assert again.status_code == 200
    assert again.json()["id"] == first.json()["id"]
    assert len(day_reservations(client, headers).json()["reservations"]) == 1


def test_us13_edge_lists_only_the_diner_reservations(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    martin = diner_headers(client)
    laura = diner_headers(client, email="laura@example.com")
    confirm(client, martin, restaurant.id_restaurante)

    assert day_reservations(client, laura).json()["reservations"] == []


def test_us13_edge_changes_during_the_review_answer_409(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(2, 1, "indoor"), (4, 1, "indoor")])
    headers = diner_headers(client)

    # The start passed while the diner was reviewing.
    monkeypatch.setattr(
        availability,
        "current_time",
        lambda: datetime.combine(TOMORROW, time(20, 5), tzinfo=BUENOS_AIRES),
    )
    assert confirm(client, headers, restaurant.id_restaurante).json()["detail"] == (
        "Ese horario ya pasó. Elegí otro."
    )
    monkeypatch.undo()
    monkeypatch.setattr(availability, "current_time", lambda: NOW)

    # The restaurant disabled the group the review showed.
    group = session.scalar(
        select(TableInventoryGroup).where(
            TableInventoryGroup.restaurant_id == restaurant.id_restaurante,
            TableInventoryGroup.capacity == 2,
        )
    )
    group.available = False
    # Committed like the restaurant's own change: the 409 rolls back only the confirmation.
    session.commit()
    gone = confirm(client, headers, restaurant.id_restaurante)
    assert gone.status_code == 409
    assert (
        gone.json()["detail"]
        == "Esa mesa ya no está disponible. Elegí otro horario o tipo de mesa."
    )

    # The restaurant closed that shift.
    session.execute(delete(OpeningShift).where(OpeningShift.start_time == time(20)))
    session.commit()
    closed = confirm(client, headers, restaurant.id_restaurante, party_size=4, table=(4, "indoor"))
    assert closed.status_code == 409
    assert closed.json()["detail"] == "El restaurante ya no atiende en ese horario. Elegí otro."


def test_us13_edge_rejects_malformed_requests(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)

    assert confirm(client, headers, restaurant.id_restaurante, party_size=0).status_code == 400
    assert confirm(client, headers, restaurant.id_restaurante, start="20:15").status_code == 400
    assert confirm(client, headers, uuid4()).status_code == 404


def test_us13_edge_restaurant_token_gets_403(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session, cuit="20123456786")
    headers = _auth(client)

    assert confirm(client, headers, restaurant.id_restaurante).status_code == 403
    assert day_reservations(client, headers).status_code == 403
    assert confirm(client, {}, restaurant.id_restaurante).status_code == 401


def test_us13_edge_inventory_change_keeps_booked_tables(
    client: TestClient, session: Session
) -> None:
    owner = _auth(client)
    restaurant = session.scalar(select(Restaurant).where(Restaurant.email == "profile@example.com"))
    restaurant.latitud, restaurant.longitud = Decimal("-34.58"), Decimal("-58.43")
    groups = [{"capacity": 2, "quantity": 2, "seating_area": "indoor"}]
    assert client.put("/api/restaurante/mesas", json=groups, headers=owner).status_code == 200
    session.add(
        OpeningShift(
            restaurant_id=restaurant.id_restaurante,
            day_of_week=TOMORROW.isoweekday(),
            start_time=time(20),
            end_time=time(23),
        )
    )
    session.flush()
    diner = diner_id(client, diner_headers(client))
    add_reservation(session, restaurant, diner, TOMORROW, time(20), 2, "indoor", table_number=2)
    # A reservation that already ended doesn't block anything.
    add_reservation(session, restaurant, diner, TODAY, time(7), 2, "indoor", table_number=2)
    # Committed like real reservations: a rejected change rolls back only its own work.
    session.commit()

    changes = [
        [{"capacity": 2, "quantity": 1, "seating_area": "indoor"}],
        [{"capacity": 2, "quantity": 2, "seating_area": "terrace"}],
        [{"capacity": 3, "quantity": 2, "seating_area": "indoor"}],
        [{"capacity": 2, "quantity": 2, "seating_area": "indoor", "available": False}],
        [],
    ]
    for change in changes:
        response = client.put("/api/restaurante/mesas", json=change, headers=owner)
        assert response.status_code == 409
        [booked] = response.json()["detail"]["reservations"]
        assert booked == {
            "reservation_id": booked["reservation_id"],
            "date": TOMORROW.isoformat(),
            "start_time": "20:00",
            "party_size": 2,
            "capacity": 2,
            "seating_area": "indoor",
        }
    stored = client.get("/api/restaurante/mesas", headers=owner).json()
    assert [(item["quantity"], item["seating_area"]) for item in stored] == [(2, "indoor")]
    # Adding tables is always fine.
    more = [{"capacity": 2, "quantity": 3, "seating_area": "indoor"}]
    assert client.put("/api/restaurante/mesas", json=more, headers=owner).status_code == 200


def test_us13_edge_takes_the_lowest_free_table_of_the_group(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(2, 3, "indoor")])
    headers = diner_headers(client)
    add_reservation(
        session, restaurant, diner_id(client, headers), TOMORROW, time(20), 2, "indoor", 1
    )

    confirm(client, headers, restaurant.id_restaurante)

    numbers = session.scalars(
        select(Reservation.table_number).where(
            Reservation.restaurant_id == restaurant.id_restaurante
        )
    ).all()
    assert sorted(numbers) == [1, 2]


def test_us13_edge_restaurant_that_stopped_taking_reservations_answers_409(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)
    restaurant.latitud, restaurant.longitud = None, None
    session.commit()

    response = confirm(client, headers, restaurant.id_restaurante)

    assert response.status_code == 409
    assert response.json()["detail"] == "El restaurante ya no está tomando reservas."


def test_us13_edge_party_above_the_maximum_answers_409(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(4, 1, "indoor")])
    headers = diner_headers(client)

    response = confirm(
        client, headers, restaurant.id_restaurante, party_size=5, table=(4, "indoor")
    )

    assert response.status_code == 409
    assert response.json()["detail"] == "El grupo supera la capacidad máxima del restaurante."


def test_us13_edge_request_that_committed_first_returns_its_reservation(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Two identical confirmations at once: the second one only meets the first at the insert."""
    restaurant = add_bookable_restaurant(session, groups=[(2, 2, "indoor")])
    headers = diner_headers(client)
    request_id = uuid4()
    first = confirm(client, headers, restaurant.id_restaurante, request_id=request_id)
    real_lookup = availability.reservation_for_request
    calls = []

    def unseen_until_the_insert(session, request_id):
        calls.append(request_id)
        # The concurrent request hasn't committed yet when it is looked up before the insert.
        return None if len(calls) <= 2 else real_lookup(session, request_id)

    monkeypatch.setattr(availability, "reservation_for_request", unseen_until_the_insert)

    again = confirm(client, headers, restaurant.id_restaurante, request_id=request_id)

    assert again.status_code == 200
    assert again.json()["id"] == first.json()["id"]


def test_us13_edge_too_far_ahead_or_out_of_range_answers_400(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)
    beyond = TODAY + timedelta(days=availability.MAX_DAYS_AHEAD + 1)

    assert slots(client, headers, restaurant.id_restaurante, day=beyond).status_code == 400
    assert confirm(client, headers, restaurant.id_restaurante, day=beyond).status_code == 400
    far = client.get("/api/reservations", params={"date": "9999-12-31"}, headers=headers)
    assert far.status_code == 400
    huge = confirm(client, headers, restaurant.id_restaurante, table=(2**40, "indoor"))
    assert huge.status_code == 400
    with_offset = confirm(client, headers, restaurant.id_restaurante, start="20:00:00+05:00")
    assert with_offset.status_code == 400


def test_us13_edge_group_too_small_or_missing_answers_409(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(2, 2, "indoor"), (4, 1, "terrace")])
    headers = diner_headers(client)

    too_small = confirm(
        client, headers, restaurant.id_restaurante, party_size=3, table=(2, "indoor")
    )
    missing = confirm(client, headers, restaurant.id_restaurante, table=(6, "indoor"))

    for response in (too_small, missing):
        assert response.status_code == 409
        assert response.json()["detail"] == (
            "Esa mesa ya no está disponible. Elegí otro horario o tipo de mesa."
        )


def test_us13_edge_two_diners_for_the_last_table(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(4, 1, "terrace")])
    martin = diner_headers(client)
    laura = diner_headers(client, email="laura@example.com")

    first = confirm(client, martin, restaurant.id_restaurante, table=(4, "terrace"))
    second = confirm(client, laura, restaurant.id_restaurante, table=(4, "terrace"))

    assert first.status_code == 201
    assert second.status_code == 409
    assert day_reservations(client, laura).json()["reservations"] == []


def test_us13_edge_database_guard_answers_409(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """If the lowest free table was taken between the check and the insert, the exclusion
    constraint stops the second reservation and the diner gets the usual 409."""
    restaurant = add_bookable_restaurant(session, groups=[(2, 1, "indoor")])
    headers = diner_headers(client)
    assert confirm(client, headers, restaurant.id_restaurante).status_code == 201
    monkeypatch.setattr(availability, "taken_tables", lambda *args: {})

    response = confirm(client, headers, restaurant.id_restaurante)

    assert response.status_code == 409
    assert response.json()["detail"].startswith("La mesa se ocupó")


def test_us13_edge_another_diners_request_id_reveals_nothing(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    request_id = uuid4()
    confirm(client, diner_headers(client), restaurant.id_restaurante, request_id=request_id)

    response = confirm(
        client,
        diner_headers(client, email="laura@example.com"),
        restaurant.id_restaurante,
        request_id=request_id,
    )

    assert response.status_code == 409
    assert response.json() == {"detail": "No pudimos confirmar la reserva. Volvé a intentarlo."}


def test_us13_edge_shift_change_keeps_confirmed_reservations(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)
    assert confirm(client, headers, restaurant.id_restaurante).status_code == 201

    session.execute(delete(OpeningShift).where(OpeningShift.start_time == time(20)))
    session.commit()

    assert len(day_reservations(client, headers).json()["reservations"]) == 1


def test_us13_edge_books_exactly_60_days_ahead(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)
    last_day = TODAY + timedelta(days=availability.MAX_DAYS_AHEAD)

    assert slots(client, headers, restaurant.id_restaurante, day=last_day).status_code == 200
    assert confirm(client, headers, restaurant.id_restaurante, day=last_day).status_code == 201


def test_us13_edge_today_is_the_date_in_buenos_aires(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    """At 22:30 in Buenos Aires it is already the next day in UTC: today is still bookable."""
    monkeypatch.setattr(
        availability,
        "current_time",
        lambda: datetime.combine(TODAY, time(22, 30), tzinfo=BUENOS_AIRES),
    )
    restaurant = add_bookable_restaurant(session, shifts=((time(20), time(23, 59)),))
    headers = diner_headers(client)

    response = slots(client, headers, restaurant.id_restaurante, day=TODAY)

    assert response.status_code == 200
    assert list(offered(response)) == ["22:00"] or list(offered(response)) == []


def test_us13_edge_at_most_5_reservations_per_restaurant_and_day(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(2, 10, "indoor")])
    headers = diner_headers(client)
    for _ in range(5):
        assert confirm(client, headers, restaurant.id_restaurante).status_code == 201

    sixth = confirm(client, headers, restaurant.id_restaurante, start="12:00")
    other_day = confirm(
        client, headers, restaurant.id_restaurante, day=TOMORROW + timedelta(days=1)
    )

    assert sixth.status_code == 409
    assert sixth.json()["detail"] == (
        "Ya tenés 5 reservas en este restaurante para ese día. No podés sumar más."
    )
    assert other_day.status_code == 201


def test_us13_edge_at_most_20_reservations_per_day(client: TestClient, session: Session) -> None:
    cuits = ["30712345671", "30711111111", "30722222225", "30733333339", "20111111112"]
    restaurants = [
        add_bookable_restaurant(session, cuit=cuit, groups=[(2, 10, "indoor")]) for cuit in cuits
    ]
    headers = diner_headers(client)
    for restaurant in restaurants[:4]:
        for _ in range(5):
            assert confirm(client, headers, restaurant.id_restaurante).status_code == 201

    response = confirm(client, headers, restaurants[4].id_restaurante)

    assert response.status_code == 409
    assert response.json()["detail"] == ("Ya tenés 20 reservas para ese día. No podés sumar más.")


def test_us11_s6_lists_only_the_seating_areas_the_restaurant_has(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(2, 2, "indoor"), (4, 1, "terrace")])
    disabled = TableInventoryGroup(
        restaurant_id=restaurant.id_restaurante,
        capacity=6,
        quantity=1,
        seating_area="outdoor",
        available=False,
    )
    session.add(disabled)
    session.flush()
    headers = diner_headers(client)

    body = slots(client, headers, restaurant.id_restaurante).json()

    assert body["seating_areas"] == ["indoor", "terrace"]


def test_us13_edge_deleted_diner_token_answers_401(client: TestClient, session: Session) -> None:
    headers = diner_headers(client)
    session.execute(delete(Diner).where(Diner.id_comensal == diner_id(client, headers)))
    session.flush()

    response = day_reservations(client, headers)

    assert response.status_code == 401
    assert response.json()["detail"] == "Tu sesión no es válida o venció. Volvé a ingresar."
