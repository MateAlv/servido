"""US-15 public menu acceptance tests."""

from datetime import UTC, datetime
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.dish import Dish
from app.models.restaurant import Restaurant
from app.services.auth import hash_password
from tests.reservations import add_bookable_restaurant


def add_dish(
    session: Session,
    restaurant_id,
    name: str,
    category: str,
    price: str = "1000.00",
    *,
    available: bool = True,
    description: str | None = None,
    photo_url: str | None = None,
) -> Dish:
    dish = Dish(
        id_restaurante=restaurant_id,
        nombre=name,
        categoria=category,
        precio=Decimal(price),
        descripcion=description,
        foto_url=photo_url,
        restricciones_alimenticias=[],
        disponible=available,
        creado_en=datetime.now(UTC),
    )
    session.add(dish)
    session.flush()
    return dish


def public_menu(client: TestClient, restaurant_id) -> dict:
    response = client.get(f"/api/restaurants/{restaurant_id}")
    assert response.status_code == 200
    return response.json()


def test_us15_s1_menu_shows_name_description_and_current_price(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    dish = add_dish(
        session,
        restaurant.id_restaurante,
        "Ravioles",
        "plato_principal",
        description="Con salsa de tomate.",
        price="1200.00",
    )
    assert public_menu(client, restaurant.id_restaurante)["menu"][0]["price"] == "1200.00"

    dish.precio = Decimal("1450.00")
    session.flush()
    [item] = public_menu(client, restaurant.id_restaurante)["menu"]
    assert item["name"] == "Ravioles"
    assert item["description"] == "Con salsa de tomate."
    assert item["price"] == "1450.00"


def test_us15_s2_only_available_dishes_are_listed(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    add_dish(session, restaurant.id_restaurante, "Disponible", "entrada")
    add_dish(session, restaurant.id_restaurante, "Agotado", "entrada", available=False)

    assert [dish["name"] for dish in public_menu(client, restaurant.id_restaurante)["menu"]] == [
        "Disponible"
    ]


def test_us15_s3_menu_is_ordered_by_category_then_name(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    for name, category in (
        ("Zanahoria", "bebida"),
        ("Alfajor", "postre"),
        ("Bife", "plato_principal"),
        ("Empanada", "entrada"),
    ):
        add_dish(session, restaurant.id_restaurante, name, category)

    categories = [
        dish["category"] for dish in public_menu(client, restaurant.id_restaurante)["menu"]
    ]
    assert categories == [
        "entrada",
        "plato_principal",
        "postre",
        "bebida",
    ]


def test_us15_s4_dish_with_photo_exposes_photo_url(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    add_dish(
        session,
        restaurant.id_restaurante,
        "Plato con foto",
        "entrada",
        photo_url="/media/dishes/example.png",
    )
    assert public_menu(client, restaurant.id_restaurante)["menu"][0]["photo_url"] == (
        "/media/dishes/example.png"
    )


def test_us15_s4_dish_without_photo_has_null_photo_url(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    add_dish(session, restaurant.id_restaurante, "Sin foto", "entrada")
    assert public_menu(client, restaurant.id_restaurante)["menu"][0]["photo_url"] is None


def test_us15_edge_has_menu_ignores_unavailable_dishes(
    client: TestClient, session: Session
) -> None:
    restaurant = add_bookable_restaurant(session)
    add_dish(session, restaurant.id_restaurante, "Agotado", "entrada", available=False)

    data = public_menu(client, restaurant.id_restaurante)
    assert data["has_menu"] is False
    assert data["menu"] == []


def test_us15_edge_new_dishes_are_available_by_default(
    client: TestClient, session: Session
) -> None:
    restaurant = Restaurant(
        nombre="Local de prueba",
        cuit="30712345999",
        email="local-us15@example.com",
        telefono="1155554444",
        password_hash=hash_password("Segura123"),
    )
    session.add(restaurant)
    session.flush()
    response = client.post(
        "/api/auth/restaurante",
        json={"email": restaurant.email, "password": "Segura123"},
    )
    token = response.json()["access_token"]
    created = client.post(
        "/api/restaurantes/me/platos",
        headers={"Authorization": f"Bearer {token}"},
        data={"nombre": "Nuevo", "categoria": "entrada", "precio": "1200"},
    )

    assert created.status_code == 201
    assert created.json()["disponible"] is True


def test_us34_edge_recreate_removed_name(client, session):
    from tests.test_order import restaurant_headers

    restaurant = add_bookable_restaurant(session)
    headers = restaurant_headers(client, restaurant)
    data = {"nombre": "Reutilizable", "categoria": "entrada", "precio": "1000"}
    created = client.post("/api/restaurantes/me/platos", headers=headers, data=data)
    assert created.status_code == 201
    dish_id = created.json()["id"]
    path = f"/api/restaurant/dishes/{dish_id}"
    assert (
        client.patch(
            path + "/availability",
            headers=headers,
            json={"available": False, "expected_revision": 1},
        ).status_code
        == 200
    )
    assert client.post("/api/restaurantes/me/platos", headers=headers, data=data).status_code == 409
    assert client.delete(path, headers=headers).status_code == 204
    recreated = client.post("/api/restaurantes/me/platos", headers=headers, data=data)
    assert recreated.status_code == 201
    assert recreated.json()["id"] != dish_id
