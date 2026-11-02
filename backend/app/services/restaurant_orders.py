from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.dish import Dish
from app.models.opening_shift import OpeningShift
from app.models.order import Order
from app.models.order_item import OrderItem
from app.models.reservation import Reservation
from app.services import availability


@dataclass(frozen=True)
class OrderItemData:
    dish_name: str
    quantity: int
    prep_time_minutes: int
    unit_price: Decimal
    subtotal: Decimal


@dataclass(frozen=True)
class RestaurantOrderData:
    id: UUID
    reservation_id: UUID
    arrival_at: datetime
    prep_start_at: datetime
    prep_time_warning: bool
    items: list[OrderItemData]
    total: Decimal


def current_shift(session: Session, restaurant_id: UUID, now: datetime) -> OpeningShift | None:
    local_now = now.astimezone(availability.BUENOS_AIRES)
    shifts = session.scalars(
        select(OpeningShift)
        .where(
            OpeningShift.restaurant_id == restaurant_id,
            OpeningShift.day_of_week == local_now.isoweekday(),
            OpeningShift.active.is_(True),
        )
        .order_by(OpeningShift.start_time)
    ).all()
    return next(
        (shift for shift in shifts if shift.start_time <= local_now.time() < shift.end_time),
        None,
    )


def order_items(session: Session, order_id: UUID) -> list[OrderItemData]:
    rows = session.execute(
        select(OrderItem, Dish)
        .join(Dish, Dish.id_plato == OrderItem.dish_id)
        .where(OrderItem.order_id == order_id)
        .order_by(OrderItem.id)
    ).all()
    return [
        OrderItemData(
            dish_name=dish.nombre,
            quantity=item.quantity,
            prep_time_minutes=item.prep_time_minutes or 0,
            unit_price=item.unit_price,
            subtotal=item.unit_price * item.quantity,
        )
        for item, dish in rows
    ]


def order_data(session: Session, order: Order, reservation: Reservation) -> RestaurantOrderData:
    items = order_items(session, order.id)
    prep_minutes = max((item.prep_time_minutes for item in items), default=0)
    warning = any(item.prep_time_minutes == 0 for item in items)
    arrival_at = reservation.starts_at.astimezone(availability.BUENOS_AIRES)
    prep_start_at = arrival_at - timedelta(minutes=prep_minutes)
    return RestaurantOrderData(
        id=order.id,
        reservation_id=reservation.id,
        arrival_at=arrival_at,
        prep_start_at=prep_start_at,
        prep_time_warning=warning,
        items=items,
        total=sum((item.subtotal for item in items), Decimal("0.00")),
    )


def restaurant_orders(
    session: Session, restaurant_id: UUID, now: datetime
) -> tuple[OpeningShift | None, list[RestaurantOrderData]]:
    shift = current_shift(session, restaurant_id, now)
    if shift is None:
        return None, []
    local_now = now.astimezone(availability.BUENOS_AIRES)
    shift_start = datetime.combine(local_now.date(), shift.start_time, availability.BUENOS_AIRES)
    shift_end = datetime.combine(local_now.date(), shift.end_time, availability.BUENOS_AIRES)
    rows = session.execute(
        select(Order, Reservation)
        .join(Reservation, Reservation.id == Order.reservation_id)
        .where(
            Order.restaurant_id == restaurant_id,
            Order.status == "confirmed",
            Reservation.restaurant_id == restaurant_id,
            Reservation.status == "confirmed",
            Reservation.starts_at >= shift_start,
            Reservation.starts_at < shift_end,
        )
    ).all()
    orders = [order_data(session, order, reservation) for order, reservation in rows]
    orders.sort(key=lambda item: (item.arrival_at, item.prep_start_at, str(item.id)))
    return shift, orders


def restaurant_order(
    session: Session, restaurant_id: UUID, order_id: UUID
) -> RestaurantOrderData | None:
    row = session.execute(
        select(Order, Reservation)
        .join(Reservation, Reservation.id == Order.reservation_id)
        .where(
            Order.id == order_id,
            Order.restaurant_id == restaurant_id,
            Order.status == "confirmed",
            Reservation.restaurant_id == restaurant_id,
            Reservation.status == "confirmed",
        )
    ).first()
    if row is None:
        return None
    order, reservation = row
    return order_data(session, order, reservation)


def format_local_time(value: datetime) -> str:
    return value.astimezone(availability.BUENOS_AIRES).strftime("%H:%M")
