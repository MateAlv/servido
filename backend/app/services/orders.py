"""The pre-order of a reservation and the cart it is built in (spec 009, US-17, US-19, US-21).

Every rule about orders lives here: what the menu is, when an order can change, its totals and
estimate, and the arrival and preparation times the restaurant-side stories read (US-20, US-22).
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import case, delete, exists, select
from sqlalchemy.orm import Session

from app.models.cart import Cart, CartItem
from app.models.diner import Diner
from app.models.dish import Dish
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.reservation import Reservation
from app.services.availability import BUENOS_AIRES

ORDER_CUTOFF_MINUTES = 45
MAX_DISHES = 50
CATEGORY_ORDER = ("entrada", "plato_principal", "postre", "bebida")

ORDER_CLOSED = "Ya no se puede cambiar el pedido de esta reserva."
EMAIL_NOT_VERIFIED = "Verificá tu email para confirmar tu pedido."
NOTHING_TO_CONFIRM = "Agregá al menos un plato para confirmar tu pedido."
MENU_CHANGED = "El menú cambió. Revisá tu pedido antes de confirmarlo."


class ReservationNotFoundError(Exception):
    pass


class OrderClosedError(Exception):
    pass


class EmailNotVerifiedError(Exception):
    pass


class NothingToConfirmError(Exception):
    pass


class MenuChangedError(Exception):
    pass


@dataclass(frozen=True)
class ItemInput:
    """A dish as the page showed it: the confirmation compares these values with the menu (P9)."""

    dish_id: UUID
    quantity: int
    name: str
    unit_price: Decimal
    prep_time_minutes: int | None


@dataclass(frozen=True)
class OrderSummary:
    total: Decimal
    prep_time_minutes: int | None


def menu_dishes(session: Session, restaurant_id: UUID) -> list[Dish]:
    """The dishes a diner can order: the available ones (US-15), by category (entradas first)
    and then by name. A dish that stops being available counts as off the menu (P9)."""
    category_rank = case(
        {category: rank for rank, category in enumerate(CATEGORY_ORDER)},
        value=Dish.categoria,
        else_=len(CATEGORY_ORDER),
    )
    return list(
        session.scalars(
            select(Dish)
            .where(
                Dish.id_restaurante == restaurant_id,
                Dish.disponible.is_(True),
                Dish.deleted_at.is_(None),
            )
            .order_by(category_rank, Dish.nombre)
        )
    )


def has_menu(session: Session, restaurant_id: UUID) -> bool:
    return bool(
        session.scalar(
            select(
                exists().where(
                    Dish.id_restaurante == restaurant_id,
                    Dish.disponible.is_(True),
                    Dish.deleted_at.is_(None),
                )
            )
        )
    )


def order_deadline(reservation: Reservation) -> datetime:
    return (reservation.starts_at - timedelta(minutes=ORDER_CUTOFF_MINUTES)).astimezone(
        BUENOS_AIRES
    )


def order_open(session: Session, reservation: Reservation, now: datetime) -> bool:
    """Whether the order can be created or changed (P6, P12, P14)."""
    return (
        reservation.status == "confirmed"
        and now < order_deadline(reservation)
        and has_menu(session, reservation.restaurant_id)
    )


def subtotal(item: OrderItem | CartItem) -> Decimal:
    return item.quantity * item.unit_price


def order_summary(items: list[OrderItem]) -> OrderSummary:
    """Total and estimate of an order: prices include taxes (P3); the estimate is the slowest
    dish that has a time, whatever the quantities (P2)."""
    times = [item.prep_time_minutes for item in items if item.prep_time_minutes is not None]
    return OrderSummary(
        total=sum((subtotal(item) for item in items), Decimal("0.00")),
        prep_time_minutes=max(times, default=None),
    )


def arrival_time(reservation: Reservation) -> datetime:
    """When the diner arrives: the reservation start until US-43 lets them choose (P7)."""
    return reservation.starts_at.astimezone(BUENOS_AIRES)


def prep_start_time(reservation: Reservation, order: Order) -> datetime:
    """When the kitchen should start so the order is ready on arrival (for US-20)."""
    return suggested_start(reservation, order.items)


def suggested_start(reservation: Reservation, items: list[OrderItem] | list[ItemInput]) -> datetime:
    """Arrival minus the slowest dish's time (P2); the arrival when no dish has a time."""
    times = [item.prep_time_minutes for item in items if item.prep_time_minutes is not None]
    arrival = arrival_time(reservation)
    return arrival - timedelta(minutes=max(times)) if times else arrival


def order_of(session: Session, reservation_id: UUID) -> Order | None:
    return session.scalar(select(Order).where(Order.reservation_id == reservation_id))


def cart_of(session: Session, reservation_id: UUID) -> Cart | None:
    return session.scalar(select(Cart).where(Cart.reservation_id == reservation_id))


def has_order(session: Session, reservation_id: UUID) -> bool:
    return bool(session.scalar(select(exists().where(Order.reservation_id == reservation_id))))


def open_cart(session: Session, reservation: Reservation, now: datetime) -> Cart | None:
    """Keep the draft reviewable within its time window, even when its menu is now empty."""
    if reservation.status != "confirmed" or now >= order_deadline(reservation):
        return None
    return cart_of(session, reservation.id)


def diner_reservation(
    session: Session, diner_id: UUID, reservation_id: UUID, *, lock: bool = False
) -> Reservation:
    """The diner's own reservation; anyone else's is reported as missing (rule 1)."""
    query = select(Reservation).where(
        Reservation.id == reservation_id, Reservation.diner_id == diner_id
    )
    if lock:
        query = query.with_for_update()
    reservation = session.scalar(query)
    if reservation is None:
        raise ReservationNotFoundError
    return reservation


def check_on_menu(session: Session, restaurant_id: UUID, items: list[ItemInput]) -> None:
    """Every dish must be on the restaurant's menu (a cart save, rule 7)."""
    menu = {dish.id_plato for dish in menu_dishes(session, restaurant_id)}
    if any(item.dish_id not in menu for item in items):
        raise MenuChangedError


def check_against_menu(session: Session, restaurant_id: UUID, items: list[ItemInput]) -> None:
    """Every dish must be on the menu with the values the diner saw (a confirmation, rule 5)."""
    menu = {dish.id_plato: dish for dish in menu_dishes(session, restaurant_id)}
    for item in items:
        dish = menu.get(item.dish_id)
        if (
            dish is None
            or dish.nombre != item.name
            or dish.precio != item.unit_price
            or dish.tiempo_preparacion_minutos != item.prep_time_minutes
        ):
            raise MenuChangedError


def item_values(item: ItemInput) -> dict:
    return {
        "dish_id": item.dish_id,
        "dish_name": item.name,
        "unit_price": item.unit_price,
        "prep_time_minutes": item.prep_time_minutes,
        "quantity": item.quantity,
    }


def confirm_order(
    session: Session, diner_id: UUID, reservation_id: UUID, items: list[ItemInput], now: datetime
) -> tuple[Reservation, Order | None]:
    """Replaces the reservation's order with these items, or removes it when there are none
    (P11), and deletes the cart. Checks follow data-model.md rule 6."""
    reservation = diner_reservation(session, diner_id, reservation_id, lock=True)
    order = order_of(session, reservation.id)
    if reservation.status != "confirmed" or now >= order_deadline(reservation):
        raise OrderClosedError
    if session.get(Diner, diner_id).email_verified_at is None:
        raise EmailNotVerifiedError
    check_against_menu(session, reservation.restaurant_id, items)
    if not has_menu(session, reservation.restaurant_id):
        raise OrderClosedError
    if not items and order is None:
        raise NothingToConfirmError
    session.execute(delete(Cart).where(Cart.reservation_id == reservation.id))
    if not items:
        session.delete(order)
        session.flush()
        return reservation, None
    if order is None:
        # Every order US-17 writes is confirmed: the cart is what is still pending (P1).
        order = Order(
            reservation_id=reservation.id,
            restaurant_id=reservation.restaurant_id,
            status="confirmed",
            prep_start_time=suggested_start(reservation, items),
            confirmed_at=now,
        )
        session.add(order)
        session.flush()
    else:
        # The ORM would insert the new items before deleting the old ones and trip the unique
        # (order_id, dish_id) whenever a dish stays in the order.
        session.execute(delete(OrderItem).where(OrderItem.order_id == order.id))
        session.expire(order, ["items"])
        order.status = "confirmed"
        order.prep_start_time = suggested_start(reservation, items)
        order.confirmed_at = now
    session.add_all(OrderItem(order_id=order.id, **item_values(item)) for item in items)
    session.flush()
    session.expire(order, ["items"])
    return reservation, order


def save_cart(
    session: Session, diner_id: UUID, reservation_id: UUID, items: list[ItemInput], now: datetime
) -> Cart | None:
    """Replaces the reservation's cart (rule 7). An empty cart only makes sense for a confirmed
    order the diner emptied; otherwise the cart is deleted and None is returned."""
    reservation = diner_reservation(session, diner_id, reservation_id, lock=True)
    if not order_open(session, reservation, now):
        raise OrderClosedError
    check_on_menu(session, reservation.restaurant_id, items)
    cart = cart_of(session, reservation.id)
    if not items and not has_order(session, reservation.id):
        if cart is not None:
            session.delete(cart)
            session.flush()
        return None
    if cart is None:
        cart = Cart(reservation_id=reservation.id, updated_at=now)
        session.add(cart)
        session.flush()
    else:
        session.execute(delete(CartItem).where(CartItem.cart_id == cart.id))
        session.expire(cart, ["items"])
        cart.updated_at = now
    session.add_all(CartItem(cart_id=cart.id, **item_values(item)) for item in items)
    session.flush()
    session.expire(cart, ["items"])
    return cart


def discard_cart(session: Session, diner_id: UUID, reservation_id: UUID) -> None:
    reservation = diner_reservation(session, diner_id, reservation_id, lock=True)
    session.execute(delete(Cart).where(Cart.reservation_id == reservation.id))


def upcoming_reservations(session: Session, diner_id: UUID, now: datetime) -> list[Reservation]:
    """The diner's confirmed reservations that haven't started, soonest first (P4)."""
    return list(
        session.scalars(
            select(Reservation)
            .where(
                Reservation.diner_id == diner_id,
                Reservation.status == "confirmed",
                Reservation.starts_at > now,
            )
            .order_by(Reservation.starts_at)
            .limit(20)
        )
    )
