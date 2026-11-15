"""Search filters of the diner's map and list (spec 027): the restaurants open for a day and a
time (US-59), the largest table (US-61) and the restrictions of the available dishes (US-53).

The rating and price filters, and how the filters combine, run in the browser with the data
these endpoints give (frontend/src/components/restaurant/searchFilters.ts).
"""

from datetime import date, time, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.closure import Closure
from app.models.restaurant import Restaurant
from app.models.table_inventory import TableInventoryGroup
from app.services import availability
from tests.reservations import (
    NOW,
    TODAY,
    TOMORROW,
    add_bookable_restaurant,
    add_dish,
    add_reservation,
    diner_headers,
    diner_id,
)

DINNER = ((time(20), time(23, 30)),)
LUNCH = ((time(12), time(15)),)


def open_ids(client: TestClient, day: date, start_from: str, start_to: str) -> set[str]:
    response = client.get(
        "/api/restaurants/open",
        params={"date": day.isoformat(), "start_from": start_from, "start_to": start_to},
    )
    assert response.status_code == 200, response.json()
    return set(response.json()["restaurant_ids"])


def restaurant_id(restaurant: Restaurant) -> str:
    return str(restaurant.id_restaurante)


def add_closure(
    session: Session,
    restaurant: Restaurant,
    day: date,
    start: time | None = None,
    end: time | None = None,
) -> None:
    session.add(
        Closure(
            restaurant_id=restaurant.id_restaurante,
            date=day,
            start_time=start,
            end_time=end,
            request_id=uuid4(),
        )
    )
    session.flush()


@pytest.fixture
def three_restaurants(session: Session) -> tuple[Restaurant, Restaurant, Restaurant]:
    """The independent test of US-59: dinner 20:00–23:30, lunch 12:00–15:00, and a dinner
    restaurant that blocked tomorrow."""
    dinner = add_bookable_restaurant(session, shifts=DINNER, cuit="30711111111")
    lunch = add_bookable_restaurant(session, shifts=LUNCH, cuit="30722222225")
    closed = add_bookable_restaurant(session, shifts=DINNER, cuit="30733333339")
    add_closure(session, closed, TOMORROW)
    return dinner, lunch, closed


def test_us59_s1_point_hour_lists_restaurants_where_a_reservation_can_start(
    client: TestClient, three_restaurants: tuple[Restaurant, Restaurant, Restaurant]
) -> None:
    dinner, _lunch, _closed = three_restaurants

    assert open_ids(client, TOMORROW, "21:00", "21:00") == {restaurant_id(dinner)}


def test_us59_s2_range_lists_restaurants_with_a_start_inside_it(
    client: TestClient, three_restaurants: tuple[Restaurant, Restaurant, Restaurant]
) -> None:
    _dinner, lunch, _closed = three_restaurants

    assert open_ids(client, TOMORROW, "12:00", "14:00") == {restaurant_id(lunch)}


def test_us59_s2_range_includes_both_ends(
    client: TestClient, three_restaurants: tuple[Restaurant, Restaurant, Restaurant]
) -> None:
    dinner, lunch, _closed = three_restaurants

    # The last lunch start is 13:30 and the first dinner start is 20:00.
    assert open_ids(client, TOMORROW, "13:30", "20:00") == {
        restaurant_id(lunch),
        restaurant_id(dinner),
    }
    assert open_ids(client, TOMORROW, "13:31", "19:59") == set()


def test_us59_s3_changing_the_day_or_time_changes_the_result(
    client: TestClient, three_restaurants: tuple[Restaurant, Restaurant, Restaurant]
) -> None:
    dinner, lunch, closed = three_restaurants

    assert open_ids(client, TOMORROW, "21:00", "21:00") == {restaurant_id(dinner)}
    assert open_ids(client, TOMORROW, "13:00", "13:00") == {restaurant_id(lunch)}
    # The closure was only for tomorrow.
    assert open_ids(client, TOMORROW + timedelta(days=1), "21:00", "21:00") == {
        restaurant_id(dinner),
        restaurant_id(closed),
    }


def test_us59_edge_the_ninety_minutes_must_fit_inside_the_shift(
    client: TestClient, session: Session
) -> None:
    dinner = add_bookable_restaurant(session, shifts=DINNER)

    # 22:00 ends at 23:30, with the shift; 22:30 would end after it.
    assert open_ids(client, TOMORROW, "22:00", "22:00") == {restaurant_id(dinner)}
    assert open_ids(client, TOMORROW, "22:30", "23:59") == set()


def test_us59_edge_a_time_closure_blocks_only_the_starts_it_overlaps(
    client: TestClient, session: Session
) -> None:
    dinner = add_bookable_restaurant(session, shifts=DINNER)
    add_closure(session, dinner, TOMORROW, time(20), time(21))

    assert open_ids(client, TOMORROW, "20:00", "20:30") == set()
    assert open_ids(client, TOMORROW, "21:00", "21:00") == {restaurant_id(dinner)}


def test_us59_edge_a_day_without_shifts_lists_nothing(client: TestClient, session: Session) -> None:
    # TOMORROW is a Tuesday (ISO weekday 2).
    add_bookable_restaurant(session, shifts=DINNER, closed_days=(TOMORROW.isoweekday(),))

    assert open_ids(client, TOMORROW, "00:00", "23:59") == set()


def test_us59_edge_today_counts_only_the_starts_that_have_not_begun(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    lunch = add_bookable_restaurant(session, shifts=LUNCH)
    monkeypatch.setattr(availability, "current_time", lambda: NOW.replace(hour=13, minute=10))

    assert open_ids(client, TODAY, "12:00", "13:00") == set()
    assert open_ids(client, TODAY, "12:00", "13:30") == {restaurant_id(lunch)}


def test_us59_edge_a_range_without_a_reservation_start_lists_nothing(
    client: TestClient, session: Session
) -> None:
    add_bookable_restaurant(session, shifts=((time(12), time(23, 30)),))

    assert open_ids(client, TOMORROW, "15:10", "15:20") == set()


def test_us59_edge_booked_tables_do_not_matter(client: TestClient, session: Session) -> None:
    dinner = add_bookable_restaurant(session, shifts=DINNER, groups=[(2, 1, "indoor")])
    diner = diner_id(client, diner_headers(client))
    add_reservation(session, dinner, diner, TOMORROW, time(21), 2, "indoor")

    assert open_ids(client, TOMORROW, "21:00", "21:00") == {restaurant_id(dinner)}


def test_us59_edge_restaurants_that_are_not_bookable_are_left_out(
    client: TestClient, session: Session
) -> None:
    add_bookable_restaurant(session, shifts=DINNER, groups=[])

    assert open_ids(client, TOMORROW, "21:00", "21:00") == set()


@pytest.mark.parametrize(
    ("day", "start_from", "start_to", "message"),
    [
        (TODAY - timedelta(days=1), "21:00", "21:00", "No podés reservar en una fecha pasada."),
        (TODAY + timedelta(days=61), "21:00", "21:00", "Podés reservar hasta 60 días antes."),
        (TOMORROW, "22:00", "20:00", "El «hasta» no puede ser anterior al «desde»."),
    ],
)
def test_us59_edge_rejects_a_day_out_of_range_or_an_inverted_range(
    client: TestClient, day: date, start_from: str, start_to: str, message: str
) -> None:
    response = client.get(
        "/api/restaurants/open",
        params={"date": day.isoformat(), "start_from": start_from, "start_to": start_to},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == message


def test_us59_edge_accepts_the_last_bookable_day(client: TestClient, session: Session) -> None:
    dinner = add_bookable_restaurant(session, shifts=DINNER)

    assert open_ids(client, TODAY + timedelta(days=60), "21:00", "21:00") == {restaurant_id(dinner)}


def test_us61_s1_lists_the_largest_available_table(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session, groups=[(4, 2, "indoor"), (8, 1, "terrace")])
    session.add(
        TableInventoryGroup(
            restaurant_id=restaurant.id_restaurante,
            capacity=12,
            quantity=1,
            seating_area="outdoor",
            available=False,
        )
    )
    session.flush()

    [listed] = client.get("/api/restaurants").json()["restaurants"]
    detail = client.get(f"/api/restaurants/{restaurant.id_restaurante}").json()

    # A table group that is not available doesn't count (F5).
    assert listed["max_party_size"] == 8
    assert detail["max_party_size"] == 8


def test_us53_s2_lists_the_restriction_sets_of_the_available_dishes(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    both = add_dish(session, restaurant, "Ensalada de quinoa", "9000")
    both.restricciones_alimenticias = ["vegano", "sin_tacc"]
    gluten_free = add_dish(session, restaurant, "Bife", "18000")
    gluten_free.restricciones_alimenticias = ["sin_tacc"]
    same_set = add_dish(session, restaurant, "Entraña", "17000")
    same_set.restricciones_alimenticias = ["sin_tacc"]
    add_dish(session, restaurant, "Milanesa", "12000")
    unavailable = add_dish(session, restaurant, "Hummus", "7000")
    unavailable.restricciones_alimenticias = ["vegano"]
    unavailable.disponible = False
    deleted = add_dish(session, restaurant, "Tarta de verdura", "8000")
    deleted.restricciones_alimenticias = ["vegetariano"]
    deleted.disponible = False
    deleted.deleted_at = NOW
    session.flush()

    [listed] = client.get("/api/restaurants").json()["restaurants"]

    # One set per distinct combination: the filter needs one dish with all of them (F3).
    assert listed["dish_restriction_sets"] == [["sin_tacc"], ["sin_tacc", "vegano"]]


def test_us53_edge_profile_tags_do_not_count(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    restaurant.restricciones_tags = ["vegano"]
    session.flush()

    [listed] = client.get("/api/restaurants").json()["restaurants"]

    assert listed["dietary_restrictions"] == ["vegano"]
    assert listed["dish_restriction_sets"] == []
