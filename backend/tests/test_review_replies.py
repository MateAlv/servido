"""Acceptance tests for spec 025: the restaurant replies to its reviews (US-42)."""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import DBAPIError, IntegrityError
from sqlalchemy.orm import Session

from app.models.restaurant import Restaurant
from app.models.review import Review
from app.models.review_reply import ReviewReply
from app.services import availability
from tests.reservations import NOW, add_bookable_restaurant
from tests.test_reviews import (
    YESTERDAY,
    add_review,
    finished,
    public_detail,
    restaurant_headers,
    verified_diner,
)

LATER = NOW + timedelta(days=2)


def reply_url(review: Review) -> str:
    return f"/api/restaurant/reviews/{review.id}/reply"


def reviewed(
    client: TestClient, session: Session, restaurant: Restaurant, comment: str | None = "Muy rico."
) -> Review:
    _, diner = verified_diner(client, session, "martin@example.com", "Martín Gómez")
    return add_review(session, finished(session, restaurant, diner), 4, comment)


def listed(client: TestClient, restaurant: Restaurant, review: Review) -> dict:
    body = client.get(
        "/api/restaurant/reviews", headers=restaurant_headers(client, restaurant)
    ).json()
    return next(item for item in body["reviews"] if item["id"] == str(review.id))


def reply_at(monkeypatch: pytest.MonkeyPatch, moment: datetime) -> None:
    monkeypatch.setattr(availability, "current_time", lambda: moment)


def test_us42_s1_reply_is_stored_and_shown_under_the_review(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    review = reviewed(client, session, restaurant)
    assert listed(client, restaurant, review)["can_reply"] is True

    response = client.post(
        reply_url(review),
        json={"text": "  ¡Gracias por venir!  "},
        headers=restaurant_headers(client, restaurant),
    )

    assert response.status_code == 201
    assert response.json() == {
        "text": "¡Gracias por venir!",
        "created_at": NOW.isoformat(),
        "edited_at": None,
    }
    stored = session.query(ReviewReply).one()
    assert (stored.review_id, stored.text) == (review.id, "¡Gracias por venir!")
    item = listed(client, restaurant, review)
    assert item["reply"] == response.json()
    assert item["can_reply"] is False


def test_us42_s2_anyone_sees_the_reply_under_the_opinion(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    review = reviewed(client, session, restaurant)
    client.post(
        reply_url(review),
        json={"text": "¡Gracias por venir!"},
        headers=restaurant_headers(client, restaurant),
    )

    detail = public_detail(client, restaurant)

    assert detail["name"] == "La Esquina de Palermo"
    [opinion] = detail["opinions"]
    assert opinion["comment"] == "Muy rico."
    assert opinion["reply"] == {
        "text": "¡Gracias por venir!",
        "date": NOW.date().isoformat(),
        "edited": False,
    }


def test_us42_s3_second_reply_is_refused_and_the_first_one_kept(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    review = reviewed(client, session, restaurant)
    headers = restaurant_headers(client, restaurant)
    client.post(reply_url(review), json={"text": "Primera."}, headers=headers)

    second = client.post(reply_url(review), json={"text": "Segunda."}, headers=headers)

    assert second.status_code == 409
    assert second.json()["detail"] == "Esta reseña ya tiene tu respuesta. Podés editarla."
    assert session.query(ReviewReply).one().text == "Primera."
    item = listed(client, restaurant, review)
    assert (item["reply"]["text"], item["can_reply"]) == ("Primera.", False)


def test_us42_s4_edited_reply_replaces_the_text_and_is_marked(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    restaurant = add_bookable_restaurant(session)
    review = reviewed(client, session, restaurant)
    headers = restaurant_headers(client, restaurant)
    client.post(reply_url(review), json={"text": "Texto anterior."}, headers=headers)
    reply_at(monkeypatch, LATER)

    response = client.put(reply_url(review), json={"text": "Texto nuevo."}, headers=headers)

    assert response.status_code == 200
    assert response.json() == {
        "text": "Texto nuevo.",
        "created_at": NOW.isoformat(),
        "edited_at": LATER.isoformat(),
    }
    assert listed(client, restaurant, review)["reply"] == response.json()
    detail = client.get(f"/api/restaurants/{restaurant.id_restaurante}")
    assert detail.json()["opinions"][0]["reply"] == {
        "text": "Texto nuevo.",
        "date": NOW.date().isoformat(),
        "edited": True,
    }
    assert "Texto anterior." not in detail.text


@pytest.mark.parametrize(
    ("text", "message"),
    [
        ("", "Escribí tu respuesta."),
        ("   \n ", "Escribí tu respuesta."),
        ("a" * 501, "La respuesta puede tener hasta 500 caracteres."),
    ],
    ids=["empty", "spaces", "501 characters"],
)
def test_us42_s5_empty_or_too_long_reply_is_refused(
    client: TestClient, session: Session, text: str, message: str
) -> None:
    restaurant = add_bookable_restaurant(session)
    review = reviewed(client, session, restaurant)
    headers = restaurant_headers(client, restaurant)

    created = client.post(reply_url(review), json={"text": text}, headers=headers)
    client.post(reply_url(review), json={"text": "Gracias."}, headers=headers)
    edited = client.put(reply_url(review), json={"text": text}, headers=headers)

    assert (created.status_code, edited.status_code) == (400, 400)
    assert created.json()["detail"][0]["msg"] == message
    assert edited.json()["detail"][0]["msg"] == message
    assert session.query(ReviewReply).one().text == "Gracias."


def test_us42_s5_500_characters_are_accepted(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    review = reviewed(client, session, restaurant)

    response = client.post(
        reply_url(review), json={"text": "a" * 500}, headers=restaurant_headers(client, restaurant)
    )

    assert response.status_code == 201


def test_us42_s6_review_stays_without_reply_until_one_is_published(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    review = reviewed(client, session, restaurant)

    item = listed(client, restaurant, review)

    assert (item["reply"], item["can_reply"]) == (None, True)
    assert session.query(ReviewReply).count() == 0


def test_us42_s7_review_without_comment_cannot_be_replied(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    review = reviewed(client, session, restaurant, comment=None)

    response = client.post(
        reply_url(review), json={"text": "Gracias."}, headers=restaurant_headers(client, restaurant)
    )

    assert listed(client, restaurant, review)["can_reply"] is False
    assert response.status_code == 409
    assert response.json()["detail"] == "Solo podés responder las reseñas que se ven en Opiniones."
    assert session.query(ReviewReply).count() == 0


def test_us42_s7_older_visit_of_the_same_person_cannot_be_replied(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    _, diner = verified_diner(client, session, "martin@example.com")
    newer = add_review(session, finished(session, restaurant, diner), 5, "Volví y mejoró.")
    older_visit = finished(session, restaurant, diner, day=YESTERDAY - timedelta(days=3))
    older = add_review(session, older_visit, 2, "Flojo.", published_days_ago=3)
    headers = restaurant_headers(client, restaurant)

    response = client.post(reply_url(older), json={"text": "Gracias."}, headers=headers)

    assert response.status_code == 409
    assert listed(client, restaurant, older)["can_reply"] is False
    assert listed(client, restaurant, newer)["can_reply"] is True


def test_us42_s8_cannot_reply_or_edit_on_another_restaurant(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    other = add_bookable_restaurant(session, cuit="30712345672")
    review = reviewed(client, session, restaurant)
    client.post(
        reply_url(review), json={"text": "Gracias."}, headers=restaurant_headers(client, restaurant)
    )
    other_headers = restaurant_headers(client, other)
    diner_headers, _ = verified_diner(client, session, "ana@example.com")

    created = client.post(reply_url(review), json={"text": "Ajeno."}, headers=other_headers)
    edited = client.put(reply_url(review), json={"text": "Ajeno."}, headers=other_headers)
    by_diner = client.put(reply_url(review), json={"text": "Ajeno."}, headers=diner_headers)
    signed_out = client.put(reply_url(review), json={"text": "Ajeno."})

    assert (created.status_code, edited.status_code) == (404, 404)
    assert created.json()["detail"] == "No encontramos esa reseña."
    assert (by_diner.status_code, signed_out.status_code) == (403, 401)
    assert session.query(ReviewReply).one().text == "Gracias."


def test_us42_edge_double_submit_keeps_one_reply(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    review = reviewed(client, session, restaurant)
    headers = restaurant_headers(client, restaurant)
    body = {"text": "¡Gracias!"}

    first = client.post(reply_url(review), json=body, headers=headers)
    second = client.post(reply_url(review), json=body, headers=headers)

    assert (first.status_code, second.status_code) == (201, 409)
    assert session.query(ReviewReply).count() == 1


def test_us42_edge_database_keeps_one_reply_per_review(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    review = reviewed(client, session, restaurant)
    session.add(ReviewReply(review_id=review.id, text="Primera."))
    session.flush()

    with pytest.raises(IntegrityError):
        session.add(ReviewReply(review_id=review.id, text="Segunda."))
        session.flush()
    session.rollback()


@pytest.mark.parametrize("text", ["   ", "a" * 501], ids=["blank", "501 characters"])
def test_us42_edge_database_refuses_blank_or_long_text(
    client: TestClient, session: Session, text: str
) -> None:
    restaurant = add_bookable_restaurant(session)
    review = reviewed(client, session, restaurant)

    with pytest.raises(DBAPIError):
        session.add(ReviewReply(review_id=review.id, text=text))
        session.flush()
    session.rollback()


def test_us42_edge_reply_hidden_by_a_later_visit_persists_for_the_restaurant(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    _, diner = verified_diner(client, session, "martin@example.com")
    older_visit = finished(session, restaurant, diner, day=YESTERDAY - timedelta(days=3))
    older = add_review(session, older_visit, 2, "Flojo.", published_days_ago=3)
    headers = restaurant_headers(client, restaurant)
    client.post(reply_url(older), json={"text": "Lo vamos a mejorar."}, headers=headers)
    newer = add_review(session, finished(session, restaurant, diner), 5, "Volví y mejoró.")

    [opinion] = public_detail(client, restaurant)["opinions"]
    edited = client.put(reply_url(older), json={"text": "Gracias por volver."}, headers=headers)

    assert (opinion["comment"], opinion["reply"]) == ("Volví y mejoró.", None)
    assert edited.status_code == 200
    assert listed(client, restaurant, older)["reply"]["text"] == "Gracias por volver."
    assert listed(client, restaurant, newer)["can_reply"] is True


def test_us42_edge_saving_the_same_text_is_not_an_edit(
    client: TestClient, session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    restaurant = add_bookable_restaurant(session)
    review = reviewed(client, session, restaurant)
    headers = restaurant_headers(client, restaurant)
    client.post(reply_url(review), json={"text": "Gracias."}, headers=headers)
    reply_at(monkeypatch, LATER)

    response = client.put(reply_url(review), json={"text": " Gracias. "}, headers=headers)

    assert response.json()["edited_at"] is None


def test_us42_edge_editing_a_review_without_reply_is_not_found(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    review = reviewed(client, session, restaurant)

    response = client.put(
        reply_url(review), json={"text": "Gracias."}, headers=restaurant_headers(client, restaurant)
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Esta reseña todavía no tiene tu respuesta."


def test_us42_edge_reply_cannot_be_deleted(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    review = reviewed(client, session, restaurant)
    headers = restaurant_headers(client, restaurant)
    client.post(reply_url(review), json={"text": "Gracias."}, headers=headers)

    response = client.delete(reply_url(review), headers=headers)

    assert response.status_code == 405
    assert session.query(ReviewReply).count() == 1


def test_us42_edge_the_diner_gets_no_mail(
    client: TestClient, session: Session, mail_outbox: list
) -> None:
    restaurant = add_bookable_restaurant(session)
    review = reviewed(client, session, restaurant)
    mail_outbox.clear()

    client.post(
        reply_url(review), json={"text": "Gracias."}, headers=restaurant_headers(client, restaurant)
    )

    assert mail_outbox == []
