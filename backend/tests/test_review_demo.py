"""The demo data of spec 014 (R18): only on a demo restaurant, repeatable and removable."""

from datetime import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.diner import Diner
from app.models.reservation import Reservation
from app.models.review import Review
from scripts.review_demo import (
    NotADemoRestaurantError,
    load_demo,
    remove_demo,
    reviewer_email,
)
from tests.reservations import add_bookable_restaurant, add_reservation, diner_headers, diner_id

PASSWORD = "Una-clave-de-prueba-1"


def demo_setup(client: TestClient, session: Session):
    restaurant = add_bookable_restaurant(session)
    restaurant.nombre = "Restaurante Demo"
    restaurant.rango_precio = "$$$"
    headers = diner_headers(client)
    return restaurant, session.get(Diner, diner_id(client, headers)), headers


def test_us50_edge_demo_gives_the_price_tier_and_pending_reviews(
    client: TestClient, session: Session
) -> None:
    restaurant, diner, headers = demo_setup(client, session)
    diner.email_verified_at = diner.fecha_registro

    load_demo(session, restaurant, diner, PASSWORD)

    detail = client.get(f"/api/restaurants/{restaurant.id_restaurante}").json()
    assert detail["review_count"] == 6
    assert detail["price_tier"] == "$"
    assert detail["spend_people"] == 5
    assert len(detail["opinions"]) == 4
    assert "Esa vez la comida llegó fría." not in [item["comment"] for item in detail["opinions"]]
    assert len(client.get("/api/reviews/pending", headers=headers).json()["reservations"]) == 2


def test_us50_edge_demo_reviewers_can_sign_in(client: TestClient, session: Session) -> None:
    restaurant, diner, _ = demo_setup(client, session)
    load_demo(session, restaurant, diner, PASSWORD)

    response = client.post(
        "/api/auth/comensal", json={"email": reviewer_email("ana"), "password": PASSWORD}
    )

    assert response.status_code == 200


def test_us50_edge_loading_the_demo_again_replaces_it(client: TestClient, session: Session) -> None:
    restaurant, diner, _ = demo_setup(client, session)

    load_demo(session, restaurant, diner, PASSWORD)
    load_demo(session, restaurant, diner, PASSWORD)

    assert session.query(Review).count() == 7
    assert session.query(Reservation).count() == 9


def test_us50_edge_removing_the_demo_keeps_real_data(client: TestClient, session: Session) -> None:
    restaurant, diner, _ = demo_setup(client, session)
    real = add_reservation(
        session, restaurant, diner.id_comensal, diner.fecha_registro.date(), time(13), 4, "indoor"
    )
    load_demo(session, restaurant, diner, PASSWORD)

    remove_demo(session, restaurant)

    assert session.query(Review).count() == 0
    assert [reservation.id for reservation in session.query(Reservation)] == [real.id]
    assert session.query(Diner).filter(Diner.email == reviewer_email("ana")).count() == 0
    assert session.get(Diner, diner.id_comensal) is not None


def test_us50_edge_removing_keeps_a_reviewer_who_booked(
    client: TestClient, session: Session
) -> None:
    restaurant, diner, _ = demo_setup(client, session)
    load_demo(session, restaurant, diner, PASSWORD)
    ana = session.query(Diner).filter(Diner.email == reviewer_email("ana")).one()
    add_reservation(
        session, restaurant, ana.id_comensal, diner.fecha_registro.date(), time(13), 4, "indoor"
    )

    remove_demo(session, restaurant)

    assert session.get(Diner, ana.id_comensal) is not None
    assert session.query(Diner).filter(Diner.email == reviewer_email("beto")).count() == 0


def test_us50_edge_demo_refuses_a_real_restaurant(client: TestClient, session: Session) -> None:
    restaurant, diner, _ = demo_setup(client, session)
    restaurant.nombre = "La Esquina de Palermo"

    with pytest.raises(NotADemoRestaurantError):
        load_demo(session, restaurant, diner, PASSWORD)
    with pytest.raises(NotADemoRestaurantError):
        remove_demo(session, restaurant)
    assert session.query(Review).count() == 0
