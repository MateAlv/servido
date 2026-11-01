from datetime import datetime, time, timedelta
from decimal import Decimal
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.diner import Diner
from app.models.dish import Dish
from app.models.opening_shift import OpeningShift
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.reservation import Reservation
from app.models.restaurant import Restaurant
from app.services.auth import create_access_token, hash_password
from app.services.availability import BUENOS_AIRES
from app.services.roles import RESTAURANT


def restaurant_with_orders(session: Session) -> tuple[Restaurant, list[Order]]:
    restaurant = Restaurant(
        nombre="Pedidos del Turno",
        cuit="30712345999",
        email="pedidos@example.com",
        telefono="1155554444",
        password_hash=hash_password("Segura123"),
    )
    session.add(restaurant)
    session.flush()
    session.add(
        OpeningShift(
            restaurant_id=restaurant.id_restaurante,
            day_of_week=1,
            start_time=time(8),
            end_time=time(13),
        )
    )
    diner = Diner(
        nombre="Comensal",
        email="pedido-comensal@example.com",
        password_hash=hash_password("Segura123"),
    )
    session.add(diner)
    session.flush()
    reservations: list[Reservation] = []
    orders: list[Order] = []
    for index, start in enumerate((time(10), time(10, 30), time(11))):
        starts_at = datetime.combine(datetime(2026, 11, 2), start, tzinfo=BUENOS_AIRES)
        reservation = Reservation(
            diner_id=diner.id_comensal,
            restaurant_id=restaurant.id_restaurante,
            table_capacity=4,
            seating_area="indoor",
            table_number=index + 1,
            party_size=2,
            starts_at=starts_at,
            ends_at=starts_at + timedelta(minutes=90),
            request_id=uuid4(),
        )
        session.add(reservation)
        reservations.append(reservation)
    session.flush()
    for index, reservation in enumerate(reservations):
        order = Order(
            reservation_id=reservation.id,
            restaurant_id=restaurant.id_restaurante,
            status="confirmed" if index != 2 else "pending",
            prep_start_time=reservation.starts_at - timedelta(minutes=10 + index),
        )
        session.add(order)
        orders.append(order)
    session.flush()
    dish = Dish(
        id_restaurante=restaurant.id_restaurante,
        nombre="Ravioles",
        categoria="plato_principal",
        precio=Decimal("12000.00"),
        creado_en=datetime.now(BUENOS_AIRES),
        tiempo_preparacion_minutos=10,
    )
    session.add(dish)
    session.flush()
    for order in orders:
        session.add(
            OrderItem(
                order_id=order.id,
                dish_id=dish.id_plato,
                quantity=2,
                unit_price=Decimal("12000.00"),
                prep_time_minutes=10,
            )
        )
    session.flush()
    return restaurant, orders


def restaurant_headers(restaurant: Restaurant) -> dict[str, str]:
    token = create_access_token(str(restaurant.id_restaurante), restaurant.email, RESTAURANT)
    return {"Authorization": f"Bearer {token}"}


def test_us20_s1_lists_confirmed_orders(client: TestClient, session: Session) -> None:
    restaurant, orders = restaurant_with_orders(session)
    response = client.get(
        "/api/restaurante/pedidos/turno-actual", headers=restaurant_headers(restaurant)
    )

    assert response.status_code == 200
    assert [item["id"] for item in response.json()["orders"]] == [
        str(orders[0].id),
        str(orders[1].id),
    ]


def test_us20_s3_excludes_unconfirmed_and_cancelled(client: TestClient, session: Session) -> None:
    restaurant, orders = restaurant_with_orders(session)
    orders[1].status = "pending"
    response = client.get(
        "/api/restaurante/pedidos/turno-actual", headers=restaurant_headers(restaurant)
    )

    assert response.status_code == 200
    assert str(orders[1].id) not in {item["id"] for item in response.json()["orders"]}


def test_us20_s5_orders_by_arrival(client: TestClient, session: Session) -> None:
    restaurant, _ = restaurant_with_orders(session)
    response = client.get(
        "/api/restaurante/pedidos/turno-actual", headers=restaurant_headers(restaurant)
    )

    assert [item["arrival_time"] for item in response.json()["orders"]] == ["10:00", "10:30"]


def test_us20_s6_orders_ties_by_prep_start(client: TestClient, session: Session) -> None:
    restaurant, orders = restaurant_with_orders(session)
    first_reservation = session.get(Reservation, orders[0].reservation_id)
    second_reservation = session.get(Reservation, orders[1].reservation_id)
    second_reservation.starts_at = first_reservation.starts_at
    second_reservation.ends_at = first_reservation.ends_at
    session.scalar(
        select(OrderItem).where(OrderItem.order_id == orders[0].id)
    ).prep_time_minutes = 20
    session.flush()
    response = client.get(
        "/api/restaurante/pedidos/turno-actual", headers=restaurant_headers(restaurant)
    )
    assert [item["id"] for item in response.json()["orders"]] == [
        str(orders[0].id),
        str(orders[1].id),
    ]


def test_us20_s2_order_detail_shows_items_and_quantities(
    client: TestClient, session: Session
) -> None:
    restaurant, orders = restaurant_with_orders(session)
    response = client.get(
        f"/api/restaurante/pedidos/{orders[0].id}", headers=restaurant_headers(restaurant)
    )

    assert response.status_code == 200
    assert response.json()["reservation_id"] == str(orders[0].reservation_id)
    assert response.json()["items"] == [
        {"dish_name": "Ravioles", "quantity": 2, "prep_time_minutes": 10}
    ]


def test_us20_edge_outside_shift_returns_empty_list(client: TestClient, session: Session) -> None:
    restaurant, _ = restaurant_with_orders(session)
    session.query(OpeningShift).filter(
        OpeningShift.restaurant_id == restaurant.id_restaurante
    ).update({OpeningShift.start_time: time(12), OpeningShift.end_time: time(13)})
    session.flush()

    response = client.get(
        "/api/restaurante/pedidos/turno-actual", headers=restaurant_headers(restaurant)
    )

    assert response.status_code == 200
    assert response.json() == {"shift": None, "orders": []}
