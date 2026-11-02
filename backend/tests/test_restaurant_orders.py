from datetime import datetime, time, timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, select
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
        {
            "dish_name": "Ravioles",
            "quantity": 2,
            "prep_time_minutes": 10,
            "unit_price": "12000.00",
            "subtotal": "24000.00",
        }
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


def test_us22_s1_confirmed_order_is_unpaid(client: TestClient, session: Session) -> None:
    restaurant, orders = restaurant_with_orders(session)
    response = client.get(
        f"/api/restaurante/pedidos/{orders[0].id}", headers=restaurant_headers(restaurant)
    )
    assert response.status_code == 200
    assert orders[0].status == "confirmed"
    assert response.json()["payment"] == {
        "status": "pending",
        "method": "No seleccionado",
        "total": "24000.00",
    }


def test_us22_s2_historical_prices_and_exact_totals(client: TestClient, session: Session) -> None:
    restaurant, orders = restaurant_with_orders(session)
    item = session.scalar(select(OrderItem).where(OrderItem.order_id == orders[0].id))
    item.unit_price = Decimal("100.10")
    item.quantity = 3
    dish = session.get(Dish, item.dish_id)
    dish.precio = Decimal("999.99")
    session.add(
        OrderItem(
            order_id=orders[0].id,
            dish_id=item.dish_id,
            quantity=2,
            unit_price=Decimal("10.05"),
            prep_time_minutes=10,
        )
    )
    session.flush()
    headers = restaurant_headers(restaurant)
    detail = client.get(f"/api/restaurante/pedidos/{orders[0].id}", headers=headers).json()
    assert {(i["unit_price"], i["subtotal"]) for i in detail["items"]} == {
        ("100.10", "300.30"),
        ("10.05", "20.10"),
    }
    assert detail["payment"]["total"] == "320.40"
    listed = client.get("/api/restaurante/pedidos/turno-actual", headers=headers).json()
    assert next(o for o in listed["orders"] if o["id"] == str(orders[0].id)) == detail


def test_us22_edge_gets_do_not_write(client: TestClient, session: Session) -> None:
    restaurant, orders = restaurant_with_orders(session)
    headers = restaurant_headers(restaurant)
    statements = []
    connection = session.connection()

    def capture(conn, cursor, statement, parameters, context, executemany):
        statements.append(statement.strip().split()[0].upper())

    event.listen(connection, "before_cursor_execute", capture)
    try:
        for path in ("turno-actual", str(orders[0].id)):
            assert (
                client.get(f"/api/restaurante/pedidos/{path}", headers=headers).status_code == 200
            )
    finally:
        event.remove(connection, "before_cursor_execute", capture)
    assert not {"INSERT", "UPDATE", "DELETE", "MERGE"}.intersection(statements)
    assert not session.new and not session.dirty and not session.deleted


@pytest.mark.parametrize("detail", [False, True])
def test_us22_edge_authentication_and_ownership(
    client: TestClient, session: Session, detail: bool
) -> None:
    restaurant, orders = restaurant_with_orders(session)
    path = f"/api/restaurante/pedidos/{orders[0].id if detail else 'turno-actual'}"
    assert client.get(path).status_code == 401
    diner = session.scalar(select(Diner))
    diner_token = create_access_token(str(diner.id_comensal), diner.email, "diner")
    assert client.get(path, headers={"Authorization": f"Bearer {diner_token}"}).status_code == 403
    other = Restaurant(
        nombre="Otro",
        cuit="30712345888",
        email="otro@example.com",
        telefono="1155554444",
        password_hash=restaurant.password_hash,
    )
    session.add(other)
    session.flush()
    session.add(
        OpeningShift(
            restaurant_id=other.id_restaurante, day_of_week=1, start_time=time(8), end_time=time(13)
        )
    )
    session.flush()
    result = client.get(path, headers=restaurant_headers(other))
    if detail:
        assert result.status_code == 404
    else:
        assert result.status_code == 200
        assert result.json()["orders"] == []


def test_us22_edge_cancelled_reservations_and_unconfirmed_orders_are_hidden(
    client: TestClient, session: Session
) -> None:
    restaurant, orders = restaurant_with_orders(session)
    reservation = session.get(Reservation, orders[1].reservation_id)
    reservation.status = "cancelled"
    reservation.cancelled_at = datetime.now(BUENOS_AIRES)
    session.flush()
    headers = restaurant_headers(restaurant)
    result = client.get("/api/restaurante/pedidos/turno-actual", headers=headers)
    assert [o["id"] for o in result.json()["orders"]] == [str(orders[0].id)]
    for order in orders[1:]:
        assert (
            client.get(f"/api/restaurante/pedidos/{order.id}", headers=headers).status_code == 404
        )
