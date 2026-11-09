"""Acceptance tests for spec 014: reviews (US-27, US-50, US-24) and the price tier (US-7)."""

from datetime import date, time, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.diner import Diner
from app.models.reservation import Reservation
from app.models.restaurant import Restaurant
from app.models.review import Review
from app.services import availability, reviews
from tests.reservations import (
    NOW,
    TODAY,
    TOMORROW,
    add_bookable_restaurant,
    add_reservation,
    diner_headers,
    diner_id,
    verify_diner,
)

YESTERDAY = TODAY - timedelta(days=1)


def review_url(reservation_id) -> str:
    return f"/api/reservations/{reservation_id}/review"


def restaurant_headers(client: TestClient, restaurant: Restaurant) -> dict[str, str]:
    token = client.post(
        "/api/auth/restaurante", json={"email": restaurant.email, "password": "Segura123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def verified_diner(client: TestClient, session: Session, email: str, name: str = "Martín"):
    headers = diner_headers(client, email)
    diner = diner_id(client, headers)
    verify_diner(session, diner)
    session.get(Diner, diner).nombre = name
    session.flush()
    return headers, diner


def finished(
    session: Session,
    restaurant: Restaurant,
    diner,
    day: date = YESTERDAY,
    start: time = time(21),
    table_number: int = 1,
) -> Reservation:
    return add_reservation(
        session, restaurant, diner, day, start, 4, "terrace", table_number=table_number
    )


def add_review(
    session: Session,
    reservation: Reservation,
    rating: int = 5,
    comment: str | None = None,
    spend: int | None = None,
    published_days_ago: int = 0,
) -> Review:
    review = Review(
        reservation_id=reservation.id,
        rating=rating,
        comment=comment,
        spend_per_person=spend,
        published_at=NOW - timedelta(days=published_days_ago),
    )
    session.add(review)
    session.flush()
    return review


def public_detail(client: TestClient, restaurant: Restaurant) -> dict:
    response = client.get(f"/api/restaurants/{restaurant.id_restaurante}")
    assert response.status_code == 200
    return response.json()


def public_list_entry(client: TestClient, restaurant: Restaurant) -> dict:
    listed = client.get("/api/restaurants").json()["restaurants"]
    return next(item for item in listed if item["id"] == str(restaurant.id_restaurante))


def people_with_reviews(session: Session, restaurant: Restaurant, spends: list[int | None]):
    """One diner with one finished reservation and review per amount."""
    for index, spend in enumerate(spends):
        diner = Diner(
            nombre=f"Persona {index}",
            email=f"persona{index}@example.com",
            password_hash="x",
            email_verified_at=NOW,
        )
        session.add(diner)
        session.flush()
        reservation = finished(
            session,
            restaurant,
            diner.id_comensal,
            day=YESTERDAY - timedelta(days=index),
        )
        add_review(session, reservation, spend=spend)


# US-27 — Dar un rating de la experiencia


def test_us27_s1_finished_reservation_is_pending(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner)

    response = client.get("/api/reviews/pending", headers=headers)

    assert response.status_code == 200
    assert response.json() == {
        "author": "Martín",
        "reservations": [
            {
                "reservation_id": str(reservation.id),
                "restaurant_id": str(restaurant.id_restaurante),
                "restaurant_name": "La Esquina de Palermo",
                "date": YESTERDAY.isoformat(),
                "start_time": "21:00",
                "party_size": 2,
                "hidden_by_later_visit": False,
                "replaces_earlier_review": False,
            }
        ],
    }


def test_us50_s10_pending_warns_that_an_older_visit_stays_private(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    add_review(session, finished(session, restaurant, diner))
    finished(session, restaurant, diner, day=YESTERDAY - timedelta(days=3))

    [older] = client.get("/api/reviews/pending", headers=headers).json()["reservations"]

    assert (older["hidden_by_later_visit"], older["replaces_earlier_review"]) == (True, False)


def test_us50_s9_pending_warns_that_a_newer_visit_replaces_the_earlier_review(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    add_review(session, finished(session, restaurant, diner, day=YESTERDAY - timedelta(days=3)))
    finished(session, restaurant, diner)

    [newer] = client.get("/api/reviews/pending", headers=headers).json()["reservations"]

    assert (newer["hidden_by_later_visit"], newer["replaces_earlier_review"]) == (False, True)


def test_us50_s9_pending_ignores_reviews_of_other_restaurants_and_diners(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    other = add_bookable_restaurant(session, cuit="30712345672")
    headers, diner = verified_diner(client, session, "martin@example.com")
    _, stranger = verified_diner(client, session, "ana@example.com")
    add_review(session, finished(session, other, diner))
    add_review(session, finished(session, restaurant, stranger))
    finished(session, restaurant, diner, table_number=2)

    [pending] = client.get("/api/reviews/pending", headers=headers).json()["reservations"]

    assert (pending["hidden_by_later_visit"], pending["replaces_earlier_review"]) == (False, False)


def test_us27_s2_publishes_a_rating_for_that_reservation(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner)

    response = client.post(review_url(reservation.id), json={"rating": 4}, headers=headers)

    assert response.status_code == 201
    assert response.json()["rating"] == 4
    stored = session.query(Review).one()
    assert stored.reservation_id == reservation.id
    pending = client.get("/api/reviews/pending", headers=headers).json()
    assert pending["reservations"] == []


@pytest.mark.parametrize("body", [{}, {"rating": 0}, {"rating": 6}, {"rating": 4.5}])
def test_us27_s3_rating_is_required_and_whole(
    client: TestClient, session: Session, body: dict
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner)

    response = client.post(review_url(reservation.id), json=body, headers=headers)

    assert response.status_code == 400
    assert session.query(Review).count() == 0


@pytest.mark.parametrize(
    "day,start",
    [
        (TOMORROW, time(21)),  # next
        (TODAY, time(8)),  # ends at 09:30, and it is 09:00: in progress
    ],
)
def test_us27_s4_reservation_that_has_not_ended_is_refused(
    client: TestClient, session: Session, day: date, start: time
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner, day=day, start=start)

    pending = client.get("/api/reviews/pending", headers=headers).json()
    response = client.post(review_url(reservation.id), json={"rating": 5}, headers=headers)

    assert pending["reservations"] == []
    assert response.status_code == 409


def test_us27_s4_can_be_reviewed_exactly_when_it_ends(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner, day=TODAY, start=time(7, 30))

    response = client.post(review_url(reservation.id), json={"rating": 5}, headers=headers)

    assert response.status_code == 201


def test_us27_s5_cancelled_reservation_is_refused(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner)
    reservation.status = "cancelled"
    reservation.cancelled_at = NOW - timedelta(days=2)
    session.flush()

    pending = client.get("/api/reviews/pending", headers=headers).json()
    response = client.post(review_url(reservation.id), json={"rating": 5}, headers=headers)

    assert pending["reservations"] == []
    assert response.status_code == 409


def test_us27_s6_after_30_days_it_is_refused(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner)
    last_moment = reservation.ends_at + timedelta(days=30)

    monkeypatch.setattr(availability, "current_time", lambda: last_moment)
    assert len(client.get("/api/reviews/pending", headers=headers).json()["reservations"]) == 1

    monkeypatch.setattr(availability, "current_time", lambda: last_moment + timedelta(seconds=1))
    assert client.get("/api/reviews/pending", headers=headers).json()["reservations"] == []
    response = client.post(review_url(reservation.id), json={"rating": 5}, headers=headers)
    assert response.status_code == 409
    assert response.json()["detail"] == "Esta reserva ya no se puede calificar."


def test_us27_s7_other_diner_or_unknown_reservation_is_not_found(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    _, owner = verified_diner(client, session, "owner@example.com")
    reservation = finished(session, restaurant, owner)
    other_headers, _ = verified_diner(client, session, "other@example.com")

    someone_elses = client.post(
        review_url(reservation.id), json={"rating": 5}, headers=other_headers
    )
    unknown = client.post(review_url(uuid4()), json={"rating": 5}, headers=other_headers)

    assert someone_elses.status_code == 404
    assert unknown.status_code == 404
    assert someone_elses.json() == unknown.json()


def test_us27_s8_second_review_of_a_reservation_is_refused(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner)
    client.post(review_url(reservation.id), json={"rating": 5}, headers=headers)

    response = client.post(review_url(reservation.id), json={"rating": 1}, headers=headers)

    assert response.status_code == 409
    assert response.json()["detail"] == "Ya publicaste la reseña de esta reserva."
    assert session.query(Review).one().rating == 5


@pytest.mark.parametrize("method", ["put", "patch", "delete"])
def test_us27_s9_diner_cannot_change_a_review(
    client: TestClient, session: Session, method: str
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner)
    add_review(session, reservation, rating=5)

    response = client.request(method, review_url(reservation.id), headers=headers)

    assert response.status_code == 405
    assert session.query(Review).one().rating == 5


def test_us27_s10_unverified_diner_cannot_publish(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers = diner_headers(client)
    reservation = finished(session, restaurant, diner_id(client, headers))

    pending = client.get("/api/reviews/pending", headers=headers).json()
    response = client.post(review_url(reservation.id), json={"rating": 5}, headers=headers)

    assert len(pending["reservations"]) == 1
    assert response.status_code == 403
    assert response.json()["detail"] == "Verificá tu email para dejar tu reseña."
    assert session.query(Review).count() == 0


def test_us27_s11_rating_and_count_are_public(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    _, other = verified_diner(client, session, "other@example.com", "Ana")
    add_review(session, finished(session, restaurant, other), rating=4)
    reservation = finished(session, restaurant, diner, day=YESTERDAY - timedelta(days=1))
    client.post(review_url(reservation.id), json={"rating": 5}, headers=headers)

    detail = public_detail(client, restaurant)
    listed = public_list_entry(client, restaurant)

    assert (detail["rating"], detail["review_count"]) == (4.5, 2)
    assert (listed["rating"], listed["review_count"]) == (4.5, 2)


def test_us27_s12_only_the_most_recent_visit_counts(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    recent = finished(session, restaurant, diner)
    older = finished(session, restaurant, diner, day=YESTERDAY - timedelta(days=3))
    client.post(review_url(recent.id), json={"rating": 5}, headers=headers)
    client.post(review_url(older.id), json={"rating": 1}, headers=headers)

    detail = public_detail(client, restaurant)

    assert (detail["rating"], detail["review_count"]) == (5.0, 1)


def test_us27_edge_same_start_keeps_the_last_published(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    _, diner = verified_diner(client, session, "martin@example.com")
    first = finished(session, restaurant, diner, table_number=1)
    second = finished(session, restaurant, diner, table_number=2)
    add_review(session, first, rating=1, published_days_ago=0)
    add_review(session, second, rating=5, published_days_ago=1)

    assert public_detail(client, restaurant)["rating"] == 1.0


def test_us27_s13_restaurant_without_reviews_shows_no_rating(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)

    detail = public_detail(client, restaurant)

    assert (detail["rating"], detail["review_count"], detail["opinions"]) == (None, 0, [])


def test_us27_edge_restaurant_cannot_publish(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    _, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner)

    response = client.post(
        review_url(reservation.id),
        json={"rating": 5},
        headers=restaurant_headers(client, restaurant),
    )

    assert response.status_code == 403


def test_us27_edge_database_keeps_one_review_per_reservation(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    _, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner)
    add_review(session, reservation)

    with pytest.raises(IntegrityError):
        add_review(session, reservation)
    session.rollback()


# US-50 — Dejar comentarios en texto


def test_us50_s1_comment_and_spend_stay_with_the_review(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner)

    response = client.post(
        review_url(reservation.id),
        json={"rating": 5, "comment": "  Muy rico todo.  ", "spend_per_person": 25000},
        headers=headers,
    )

    assert response.status_code == 201
    assert response.json()["comment"] == "Muy rico todo."
    assert response.json()["spend_per_person"] == 25000
    stored = session.query(Review).one()
    assert (stored.comment, stored.spend_per_person) == ("Muy rico todo.", Decimal(25000))


def test_us50_s5_repeated_publication_stores_one_review(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner)
    body = {"rating": 5, "comment": "Muy rico."}

    first = client.post(review_url(reservation.id), json=body, headers=headers)
    second = client.post(review_url(reservation.id), json=body, headers=headers)

    assert (first.status_code, second.status_code) == (201, 409)
    assert session.query(Review).count() == 1


@pytest.mark.parametrize("comment", [None, "", "   \n "])
def test_us50_s6_empty_comment_and_spend_are_left_out(
    client: TestClient, session: Session, comment: str | None
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner)

    response = client.post(
        review_url(reservation.id),
        json={"rating": 3, "comment": comment, "spend_per_person": None},
        headers=headers,
    )

    assert response.status_code == 201
    assert (response.json()["comment"], response.json()["spend_per_person"]) == (None, None)


@pytest.mark.parametrize(
    "extra",
    [
        {"comment": "a" * 501},
        {"comment": "con\x00nul"},
        {"spend_per_person": 0},
        {"spend_per_person": -5},
        {"spend_per_person": 1_000_001},
        {"spend_per_person": 2500.5},
        {"spend_per_person": "25000"},
    ],
)
def test_us50_s7_invalid_comment_or_spend_is_refused(
    client: TestClient, session: Session, extra: dict
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner)

    response = client.post(review_url(reservation.id), json={"rating": 5, **extra}, headers=headers)

    assert response.status_code == 400
    assert session.query(Review).count() == 0


def test_us50_s7_limits_are_accepted(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner)

    response = client.post(
        review_url(reservation.id),
        json={"rating": 5, "comment": "a" * 500, "spend_per_person": 1_000_000},
        headers=headers,
    )

    assert response.status_code == 201


def test_us50_s8_opinion_is_public_with_only_its_fields(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    _, diner = verified_diner(client, session, "martin@example.com", "Juan Pablo Pérez")
    add_review(session, finished(session, restaurant, diner), 5, "Muy rico.", 25000)

    assert public_detail(client, restaurant)["opinions"] == [
        {
            "author": "Juan P.",
            "rating": 5,
            "comment": "Muy rico.",
            "spend_per_person": 25000,
            "visit_date": YESTERDAY.isoformat(),
        }
    ]


def test_us50_s9_newer_review_hides_the_previous_opinion(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    _, diner = verified_diner(client, session, "martin@example.com")
    older = finished(session, restaurant, diner, day=YESTERDAY - timedelta(days=3))
    add_review(session, older, 2, "Flojo.", published_days_ago=3)
    assert len(public_detail(client, restaurant)["opinions"]) == 1

    add_review(session, finished(session, restaurant, diner), 5, comment=None)

    assert public_detail(client, restaurant)["opinions"] == []
    assert session.query(Review).count() == 2


def test_us50_s10_late_review_of_an_old_visit_keeps_the_recent_opinion(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    headers, diner = verified_diner(client, session, "martin@example.com")
    add_review(session, finished(session, restaurant, diner), 5, "La última.", published_days_ago=1)
    older = finished(session, restaurant, diner, day=YESTERDAY - timedelta(days=3))

    client.post(
        review_url(older.id), json={"rating": 1, "comment": "La anterior."}, headers=headers
    )

    opinions = public_detail(client, restaurant)["opinions"]
    assert [opinion["comment"] for opinion in opinions] == ["La última."]


def test_us50_s11_review_without_comment_counts_but_is_not_listed(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    _, diner = verified_diner(client, session, "martin@example.com")
    add_review(session, finished(session, restaurant, diner), 4)

    detail = public_detail(client, restaurant)

    assert (detail["rating"], detail["review_count"], detail["opinions"]) == (4.0, 1, [])


def test_us50_edge_opinions_go_from_the_most_recent_visit(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    _, ana = verified_diner(client, session, "ana@example.com", "Ana")
    _, beto = verified_diner(client, session, "beto@example.com", "Beto")
    add_review(
        session,
        finished(session, restaurant, ana, day=YESTERDAY - timedelta(days=5)),
        comment="Vieja.",
    )
    add_review(session, finished(session, restaurant, beto), comment="Nueva.")

    opinions = public_detail(client, restaurant)["opinions"]

    assert [opinion["comment"] for opinion in opinions] == ["Nueva.", "Vieja."]


@pytest.mark.parametrize(
    "name,expected",
    [
        ("Juan Pablo Pérez", "Juan P."),
        ("Mateo alvarez", "Mateo A."),
        ("Mateo", "Mateo"),
        ("  Ana   Paz ", "Ana P."),
        (None, "Comensal"),
        ("", "Comensal"),
    ],
)
def test_us50_edge_author_name(name: str | None, expected: str) -> None:
    assert reviews.author_name(name) == expected


# US-24 — Ver Reseñas


def test_us24_s1_lists_the_reviews_newest_published_first(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    _, ana = verified_diner(client, session, "ana@example.com", "Ana Paz")
    _, beto = verified_diner(client, session, "beto@example.com", "Beto")
    add_review(session, finished(session, restaurant, ana), 5, "Muy rico.", 25000, 3)
    add_review(
        session,
        finished(session, restaurant, beto, day=YESTERDAY - timedelta(days=1)),
        3,
        published_days_ago=1,
    )

    response = client.get("/api/restaurant/reviews", headers=restaurant_headers(client, restaurant))

    assert response.status_code == 200
    items = response.json()["reviews"]
    assert [item["author"] for item in items] == ["Beto", "Ana P."]
    assert items[1]["visit_date"] == YESTERDAY.isoformat()
    assert items[1]["visit_time"] == "21:00"
    assert (items[1]["rating"], items[1]["comment"], items[1]["spend_per_person"]) == (
        5,
        "Muy rico.",
        25000,
    )
    assert (items[0]["comment"], items[0]["spend_per_person"]) == (None, None)


def test_us24_s2_s3_sees_every_review_and_both_counts(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    _, diner = verified_diner(client, session, "martin@example.com")
    add_review(session, finished(session, restaurant, diner), 5, "Reciente.")
    older = finished(session, restaurant, diner, day=YESTERDAY - timedelta(days=3))
    add_review(session, older, 1, "Anterior.", published_days_ago=3)

    body = client.get(
        "/api/restaurant/reviews", headers=restaurant_headers(client, restaurant)
    ).json()

    assert [item["comment"] for item in body["reviews"]] == ["Reciente.", "Anterior."]
    assert [item["counts_in_average"] for item in body["reviews"]] == [True, False]
    assert (body["rating"], body["review_count"], body["total_reviews"]) == (5.0, 1, 2)


@pytest.mark.parametrize("method", ["put", "patch", "delete"])
def test_us24_s4_restaurant_cannot_change_a_review(
    client: TestClient, session: Session, method: str
) -> None:
    restaurant = add_bookable_restaurant(session)
    _, diner = verified_diner(client, session, "martin@example.com")
    reservation = finished(session, restaurant, diner)
    add_review(session, reservation, 1, "Flojo.")
    headers = restaurant_headers(client, restaurant)

    by_reservation = client.request(method, review_url(reservation.id), headers=headers)
    on_list = client.request(method, "/api/restaurant/reviews", headers=headers)

    assert (by_reservation.status_code, on_list.status_code) == (405, 405)
    assert session.query(Review).one().comment == "Flojo."


def test_us24_s5_only_the_restaurant_sees_its_reviews(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    other = add_bookable_restaurant(session, cuit="30712345672")
    diner_auth, diner = verified_diner(client, session, "martin@example.com")
    add_review(session, finished(session, restaurant, diner), 5, "Muy rico.")

    other_body = client.get(
        "/api/restaurant/reviews", headers=restaurant_headers(client, other)
    ).json()

    assert other_body["reviews"] == []
    assert client.get("/api/restaurant/reviews", headers=diner_auth).status_code == 403
    assert client.get("/api/restaurant/reviews").status_code == 401


def test_us24_s6_no_contact_data_or_reservation_link(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    _, diner = verified_diner(client, session, "martin@example.com", "Martín Gómez")
    reservation = finished(session, restaurant, diner)
    add_review(session, reservation, 5, "Muy rico.")

    response = client.get("/api/restaurant/reviews", headers=restaurant_headers(client, restaurant))

    assert set(response.json()["reviews"][0]) == {
        "id",
        "author",
        "visit_date",
        "visit_time",
        "rating",
        "comment",
        "spend_per_person",
        "published_at",
        "counts_in_average",
    }
    for private in ("martin@example.com", "Gómez", str(reservation.id), str(diner)):
        assert private not in response.text


def test_us24_s7_without_reviews_the_list_is_empty(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)

    body = client.get(
        "/api/restaurant/reviews", headers=restaurant_headers(client, restaurant)
    ).json()

    assert body == {
        "rating": None,
        "review_count": 0,
        "total_reviews": 0,
        "price_tier": None,
        "average_spend_per_person": None,
        "spend_people": 0,
        "reviews": [],
        "next_offset": None,
    }


def test_us24_s8_returns_20_at_a_time(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    people_with_reviews(session, restaurant, [None] * 21)
    headers = restaurant_headers(client, restaurant)

    first = client.get("/api/restaurant/reviews", headers=headers).json()
    second = client.get(
        "/api/restaurant/reviews", params={"offset": first["next_offset"]}, headers=headers
    ).json()

    assert (len(first["reviews"]), first["next_offset"]) == (20, 20)
    assert (len(second["reviews"]), second["next_offset"]) == (1, None)
    ids = {item["id"] for item in first["reviews"]} | {item["id"] for item in second["reviews"]}
    assert len(ids) == 21


# US-7 — criterio pendiente: la categoría de precio sale de los gastos informados


def declared(session: Session, restaurant: Restaurant, tier: str = "$$") -> None:
    restaurant.rango_precio = tier
    session.flush()


def test_us7_s4_up_to_4_people_keep_the_declared_tier(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    declared(session, restaurant)
    people_with_reviews(session, restaurant, [30000] * 4 + [None])

    detail = public_detail(client, restaurant)

    assert (detail["price_tier"], detail["average_spend_per_person"]) == ("$$", None)
    assert detail["spend_people"] == 0


def test_us7_s5_from_5_people_the_mean_sets_the_tier(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    declared(session, restaurant)
    people_with_reviews(session, restaurant, [30000, 30000, 30000, 30000, 30001])

    detail = public_detail(client, restaurant)
    listed = public_list_entry(client, restaurant)

    assert (detail["price_tier"], detail["average_spend_per_person"]) == ("$$$", 30000)
    assert (listed["price_tier"], listed["average_spend_per_person"]) == ("$$$", 30000)
    assert detail["spend_people"] == 5


def test_us7_s5_restaurant_sees_the_tier_and_where_it_comes_from(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    declared(session, restaurant)
    people_with_reviews(session, restaurant, [30000] * 5)

    body = client.get(
        "/api/restaurant/reviews", headers=restaurant_headers(client, restaurant)
    ).json()

    assert (body["price_tier"], body["average_spend_per_person"], body["spend_people"]) == (
        "$$$",
        30000,
        5,
    )


@pytest.mark.parametrize(
    "spend,tier",
    [
        (14999, "$"),
        (15000, "$$"),
        (24999, "$$"),
        (25000, "$$$"),
        (40000, "$$$"),
        (40001, "$$$$"),
    ],
)
def test_us7_s5_uses_the_limits_of_spec_002(spend: int, tier: str) -> None:
    assert reviews.price_tier_from_spend(spend) == tier


def test_us7_s6_a_person_counts_once_with_the_latest_amount(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    declared(session, restaurant)
    people_with_reviews(session, restaurant, [10000] * 4)
    _, diner = verified_diner(client, session, "martin@example.com")
    add_review(
        session,
        finished(session, restaurant, diner, day=YESTERDAY - timedelta(days=20)),
        spend=90000,
    )
    add_review(
        session,
        finished(session, restaurant, diner, day=YESTERDAY - timedelta(days=10)),
        spend=20000,
    )
    add_review(session, finished(session, restaurant, diner, day=YESTERDAY - timedelta(days=5)))

    detail = public_detail(client, restaurant)

    assert detail["average_spend_per_person"] == 12000
    assert detail["price_tier"] == "$"


def test_us7_s7_declared_tier_no_longer_matters_once_calculated(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    declared(session, restaurant, "$")
    people_with_reviews(session, restaurant, [30000] * 5)
    assert public_detail(client, restaurant)["price_tier"] == "$$$"

    declared(session, restaurant, "$$$$")

    assert public_detail(client, restaurant)["price_tier"] == "$$$"
    assert restaurant.rango_precio == "$$$$"
