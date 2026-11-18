from datetime import time

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.order import Order
from tests.reservations import (
    TODAY,
    add_bookable_restaurant,
    add_dish,
    add_order,
    add_reservation,
    diner_headers,
    diner_id,
)
from tests.test_restaurant_reservations import restaurant_headers


def setup(client: TestClient, session: Session):
    restaurant = add_bookable_restaurant(session)
    diner = diner_id(client, diner_headers(client))
    reservation = add_reservation(session, restaurant, diner, TODAY, time(20), 2, "indoor")
    return restaurant, reservation


def test_us36_s1_returns_the_confirmed_order_for_an_owned_reservation(
    client: TestClient, session: Session
) -> None:
    restaurant, reservation = setup(client, session)
    dish = add_dish(session, restaurant, "Ravioles", "12000.00")
    add_order(session, reservation, [(dish, 2)])

    response = client.get(
        f"/api/restaurante/reservas/{reservation.id}/pedido",
        headers=restaurant_headers(client, restaurant),
    )

    assert response.status_code == 200
    assert response.json()["reservation_status"] == "confirmed"
    assert response.json()["order"]["items"][0]["subtotal"] == "24000.00"
    assert response.json()["order"]["payment"]["total"] == "24000.00"


def test_us36_s2_returns_null_when_the_confirmed_reservation_has_no_order(
    client: TestClient, session: Session
) -> None:
    restaurant, reservation = setup(client, session)

    response = client.get(
        f"/api/restaurante/reservas/{reservation.id}/pedido",
        headers=restaurant_headers(client, restaurant),
    )

    assert response.status_code == 200
    assert response.json() == {"reservation_status": "confirmed", "order": None}


def test_us36_s3_returns_cancelled_status_and_historical_order(
    client: TestClient, session: Session
) -> None:
    restaurant, reservation = setup(client, session)
    dish = add_dish(session, restaurant, "Ravioles", "12000.00")
    add_order(session, reservation, [(dish, 1)])
    reservation.status = "cancelled"
    reservation.cancelled_at = reservation.starts_at

    response = client.get(
        f"/api/restaurante/reservas/{reservation.id}/pedido",
        headers=restaurant_headers(client, restaurant),
    )

    assert response.status_code == 200
    assert response.json()["reservation_status"] == "cancelled"
    assert response.json()["order"] is not None


def test_us36_s4_treats_an_unconfirmed_order_as_missing(
    client: TestClient, session: Session
) -> None:
    restaurant, reservation = setup(client, session)
    order = Order(
        reservation_id=reservation.id,
        restaurant_id=restaurant.id_restaurante,
        status="pending",
        prep_start_time=reservation.starts_at,
    )
    session.add(order)
    session.flush()

    response = client.get(
        f"/api/restaurante/reservas/{reservation.id}/pedido",
        headers=restaurant_headers(client, restaurant),
    )

    assert response.status_code == 200
    assert response.json()["order"] is None


def test_us36_s5_rejects_a_foreign_reservation(client: TestClient, session: Session) -> None:
    restaurant, reservation = setup(client, session)
    other = add_bookable_restaurant(session, cuit="30711111111")

    response = client.get(
        f"/api/restaurante/reservas/{reservation.id}/pedido",
        headers=restaurant_headers(client, other),
    )

    assert response.status_code == 404


def test_us36_edge_requires_a_restaurant_session(client: TestClient, session: Session) -> None:
    restaurant, reservation = setup(client, session)

    response = client.get(f"/api/restaurante/reservas/{reservation.id}/pedido")

    assert response.status_code == 401


def test_us36_edge_order_items_keep_the_confirmed_name_and_price(
    client: TestClient, session: Session
) -> None:
    restaurant, reservation = setup(client, session)
    dish = add_dish(session, restaurant, "Ravioles de jamón", "12500.00")
    order = add_order(session, reservation, [(dish, 2)])
    item = order.items[0]

    dish.nombre = "Nombre cambiado"
    dish.precio = 99999
    session.flush()

    response = client.get(
        f"/api/restaurante/reservas/{reservation.id}/pedido",
        headers=restaurant_headers(client, restaurant),
    )

    assert response.status_code == 200
    assert response.json()["order"]["items"][0]["dish_name"] == item.dish_name
    assert response.json()["order"]["items"][0]["unit_price"] == "12500.00"
