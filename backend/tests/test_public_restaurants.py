"""Bookable restaurants for the diner's map, list and detail (spec 005, decision D4).

A restaurant is bookable when it has coordinates, an active shift and an available table group.
"""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.dish import Dish
from tests.reservations import add_bookable_restaurant


def test_lists_only_bookable_restaurants(client: TestClient, session: Session) -> None:
    bookable = add_bookable_restaurant(session)
    no_location = add_bookable_restaurant(session, cuit="30711111111")
    no_location.latitud = None
    no_location.longitud = None
    add_bookable_restaurant(session, cuit="30722222225", groups=[])
    add_bookable_restaurant(session, cuit="30733333339", shifts=())
    session.flush()

    response = client.get("/api/restaurants")

    assert response.status_code == 200
    restaurants = response.json()["restaurants"]
    assert [restaurant["id"] for restaurant in restaurants] == [str(bookable.id_restaurante)]
    assert restaurants[0]["name"] == "La Esquina de Palermo"
    assert restaurants[0]["lat"] == -34.5885
    assert restaurants[0]["lng"] == -58.4265


def test_detail_includes_the_menu(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    session.add(
        Dish(
            id_restaurante=restaurant.id_restaurante,
            nombre="Bife de chorizo",
            descripcion="Con papas rústicas.",
            categoria="plato_principal",
            precio=Decimal("18500.00"),
            restricciones_alimenticias=["sin_tacc"],
            creado_en=datetime.now(UTC),
        )
    )
    session.flush()

    response = client.get(f"/api/restaurants/{restaurant.id_restaurante}")

    assert response.status_code == 200
    [dish] = response.json()["menu"]
    assert dish["name"] == "Bife de chorizo"
    assert dish["category"] == "plato_principal"
    assert dish["price"] == "18500.00"
    assert dish["dietary_restrictions"] == ["sin_tacc"]


def test_price_tier_is_null_unless_it_is_a_known_tier(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    restaurant.rango_precio = "$$"
    session.flush()
    assert client.get(f"/api/restaurants/{restaurant.id_restaurante}").json()["price_tier"] == "$$"

    restaurant.rango_precio = "caro"
    session.flush()
    assert client.get(f"/api/restaurants/{restaurant.id_restaurante}").json()["price_tier"] is None


def test_unknown_or_not_bookable_answers_404(client: TestClient, session: Session) -> None:
    without_tables = add_bookable_restaurant(session, groups=[])

    assert client.get(f"/api/restaurants/{uuid4()}").status_code == 404
    assert client.get(f"/api/restaurants/{without_tables.id_restaurante}").status_code == 404
