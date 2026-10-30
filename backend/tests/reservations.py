"""Builders for the reservation and order tests (specs 005 and 009): a bookable restaurant, a
diner, a reservation, dishes, an order and a cart."""

from datetime import date, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.diner import Diner
from app.models.dish import Dish
from app.models.opening_shift import OpeningShift
from app.models.order import Cart, CartItem, Order, OrderItem
from app.models.reservation import RESERVATION_MINUTES, Reservation
from app.models.restaurant import Restaurant
from app.models.table_inventory import TableInventoryGroup
from app.services.auth import hash_password

BUENOS_AIRES = ZoneInfo("America/Argentina/Buenos_Aires")
# Monday 2 November 2026, 09:00 in Buenos Aires: "now" in every reservation test.
NOW = datetime(2026, 11, 2, 9, 0, tzinfo=BUENOS_AIRES)
TODAY = NOW.date()
TOMORROW = TODAY + timedelta(days=1)

# Every day: lunch 12:00–15:00 and dinner 20:00–23:30.
DEFAULT_SHIFTS = ((time(12), time(15)), (time(20), time(23, 30)))


def add_bookable_restaurant(
    session: Session,
    groups: list[tuple[int, int, str]] = ((2, 2, "indoor"), (4, 1, "terrace")),
    shifts: tuple[tuple[time, time], ...] = DEFAULT_SHIFTS,
    closed_days: tuple[int, ...] = (),
    cuit: str = "30712345671",
) -> Restaurant:
    """A restaurant with coordinates, shifts on every day but `closed_days` (ISO weekdays) and
    table groups given as (capacity, quantity, seating area)."""
    restaurant = Restaurant(
        nombre="La Esquina de Palermo",
        cuit=cuit,
        email=f"{cuit}@example.com",
        telefono="1155554444",
        password_hash=hash_password("Segura123"),
        latitud=Decimal("-34.588500"),
        longitud=Decimal("-58.426500"),
    )
    session.add(restaurant)
    session.flush()
    for day in range(1, 8):
        if day in closed_days:
            continue
        for start, end in shifts:
            session.add(
                OpeningShift(
                    restaurant_id=restaurant.id_restaurante,
                    day_of_week=day,
                    start_time=start,
                    end_time=end,
                )
            )
    for capacity, quantity, seating_area in groups:
        session.add(
            TableInventoryGroup(
                restaurant_id=restaurant.id_restaurante,
                capacity=capacity,
                quantity=quantity,
                seating_area=seating_area,
            )
        )
    session.flush()
    return restaurant


def diner_headers(client: TestClient, email: str = "martin@example.com") -> dict[str, str]:
    client.post(
        "/api/comensales", json={"nombre": "Martín", "email": email, "password": "Segura123"}
    )
    token = client.post(
        "/api/auth/comensal", json={"email": email, "password": "Segura123"}
    ).json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def diner_id(client: TestClient, headers: dict[str, str]) -> UUID:
    return UUID(client.get("/api/me", headers=headers).json()["id"])


def add_reservation(
    session: Session,
    restaurant: Restaurant,
    diner: UUID,
    day: date,
    start: time,
    capacity: int,
    seating_area: str,
    table_number: int = 1,
    party_size: int = 2,
) -> Reservation:
    starts_at = datetime.combine(day, start, tzinfo=BUENOS_AIRES)
    reservation = Reservation(
        diner_id=diner,
        restaurant_id=restaurant.id_restaurante,
        table_capacity=capacity,
        seating_area=seating_area,
        table_number=table_number,
        party_size=party_size,
        starts_at=starts_at,
        ends_at=starts_at + timedelta(minutes=RESERVATION_MINUTES),
        request_id=uuid4(),
    )
    session.add(reservation)
    session.flush()
    return reservation


def verify_diner(session: Session, diner: UUID) -> None:
    """Confirming an order requires a verified email (spec 007, US-51 S5)."""
    session.get(Diner, diner).email_verified_at = NOW
    session.flush()


def add_dish(
    session: Session,
    restaurant: Restaurant,
    name: str,
    price: str,
    prep_time_minutes: int | None = None,
    category: str = "plato_principal",
) -> Dish:
    dish = Dish(
        id_restaurante=restaurant.id_restaurante,
        nombre=name,
        categoria=category,
        precio=Decimal(price),
        tiempo_preparacion_minutos=prep_time_minutes,
        restricciones_alimenticias=[],
        creado_en=NOW,
    )
    session.add(dish)
    session.flush()
    return dish


def item_of(dish: Dish, quantity: int = 1) -> dict:
    """An order or cart item as the page sends it: the dish with the values it showed."""
    return {
        "dish_id": str(dish.id_plato),
        "quantity": quantity,
        "name": dish.nombre,
        "unit_price": str(dish.precio),
        "prep_time_minutes": dish.tiempo_preparacion_minutos,
    }


def add_order(session: Session, reservation: Reservation, dishes: list[tuple[Dish, int]]) -> Order:
    order = Order(reservation_id=reservation.id, confirmed_at=NOW)
    session.add(order)
    session.flush()
    for dish, quantity in dishes:
        session.add(
            OrderItem(
                order_id=order.id,
                dish_id=dish.id_plato,
                dish_name=dish.nombre,
                unit_price=dish.precio,
                prep_time_minutes=dish.tiempo_preparacion_minutos,
                quantity=quantity,
            )
        )
    session.flush()
    return order


def add_cart(session: Session, reservation: Reservation, dishes: list[tuple[Dish, int]]) -> Cart:
    cart = Cart(reservation_id=reservation.id, updated_at=NOW)
    session.add(cart)
    session.flush()
    for dish, quantity in dishes:
        session.add(
            CartItem(
                cart_id=cart.id,
                dish_id=dish.id_plato,
                dish_name=dish.nombre,
                unit_price=dish.precio,
                prep_time_minutes=dish.tiempo_preparacion_minutos,
                quantity=quantity,
            )
        )
    session.flush()
    return cart
