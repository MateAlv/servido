from dataclasses import dataclass
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.diner import Diner
from app.models.notification import Notification
from app.models.order import Order
from app.models.refund import Refund
from app.models.reservation import Reservation
from app.models.restaurant import Restaurant
from app.services import refunds
from app.services.mail import Mail, restaurant_cancellation_mail
from app.services.reservations import (
    CANCELLATION_TOO_LATE,
    RESERVATION_PASSED,
    ReservationCancellationWindowError,
)


class CancellationNotFoundError(Exception):
    pass


class CancellationAlreadyDoneError(Exception):
    pass


@dataclass(frozen=True)
class CancellationResult:
    reservation: Reservation
    refund: Refund | None
    notification: Notification
    mail: Mail
    already_done: bool = False


def cancel_restaurant_reservation(
    session: Session,
    restaurant: Restaurant,
    reservation_id: UUID,
    request_id: UUID,
    now: datetime,
) -> CancellationResult:
    reservation = session.scalar(
        select(Reservation)
        .where(
            Reservation.id == reservation_id,
            Reservation.restaurant_id == restaurant.id_restaurante,
        )
        .with_for_update()
    )
    if reservation is None:
        raise CancellationNotFoundError
    if reservation.status == "cancelled":
        if reservation.cancellation_request_id == request_id:
            notification = session.scalar(
                select(Notification).where(
                    Notification.reservation_id == reservation.id,
                    Notification.kind == "restaurant_cancellation",
                )
            )
            refund = session.scalar(
                select(Refund)
                .join(Order, Refund.order_id == Order.id)
                .where(Order.reservation_id == reservation.id)
            )
            if notification is not None:
                diner = session.get(Diner, reservation.diner_id)
                return CancellationResult(
                    reservation,
                    refund,
                    notification,
                    cancellation_mail(
                        restaurant, reservation, refund, diner.email if diner else ""
                    ),
                    True,
                )
        raise CancellationAlreadyDoneError
    if reservation.starts_at <= now:
        raise ReservationCancellationWindowError(RESERVATION_PASSED)
    if reservation.starts_at - now < timedelta(minutes=45):
        raise ReservationCancellationWindowError(CANCELLATION_TOO_LATE)

    order = session.scalar(select(Order).where(Order.reservation_id == reservation.id))
    refund = None
    if order is not None and order.payment_status == "paid":
        refund = refunds.refund_order(session, order, now)
    local_start = reservation.starts_at.astimezone(refunds.BUENOS_AIRES)
    refund_text = (
        f" Se reembolsaron ${refund.amount:.2f} por {refund.method}."
        if refund
        else " No había un pago para reembolsar."
    )
    message = (
        f"El restaurante {restaurant.nombre} canceló tu reserva del "
        f"{local_start:%d/%m/%Y} a las {local_start:%H:%M}.{refund_text}"
    )
    notification = Notification(
        diner_id=reservation.diner_id,
        reservation_id=reservation.id,
        kind="restaurant_cancellation",
        message=message,
    )
    session.add(notification)
    reservation.status = "cancelled"
    reservation.cancelled_at = now
    reservation.cancelled_by_restaurant_id = restaurant.id_restaurante
    reservation.cancellation_request_id = request_id
    if order is not None:
        order.status = "cancelled"
    session.flush()
    diner = session.get(Diner, reservation.diner_id)
    return CancellationResult(
        reservation,
        refund,
        notification,
        cancellation_mail(restaurant, reservation, refund, diner.email if diner else ""),
    )


def cancellation_mail(
    restaurant: Restaurant, reservation: Reservation, refund: Refund | None, to: str | None = None
) -> Mail:
    local_start = reservation.starts_at.astimezone(refunds.BUENOS_AIRES)
    refund_text = (
        f" Recibirá un reembolso de ${refund.amount:.2f} por {refund.method}." if refund else ""
    )
    return restaurant_cancellation_mail(
        to or "",
        restaurant.nombre,
        f"{local_start:%d/%m/%Y} a las {local_start:%H:%M}",
        refund_text,
    )
