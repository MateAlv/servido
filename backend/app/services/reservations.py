from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.reservation import Reservation

CANCELLATION_WINDOW = timedelta(minutes=45)
ALREADY_CANCELLED = "La reserva ya estaba cancelada."
CANCELLATION_TOO_LATE = "No podés cancelar la reserva con menos de 45 minutos de anticipación."
RESERVATION_PASSED = "No podés cancelar una reserva que ya pasó."


class ReservationNotFoundError(Exception):
    pass


class ReservationAlreadyCancelledError(Exception):
    pass


class ReservationCancellationWindowError(Exception):
    pass


def active_reservations(session: Session, diner_id: UUID, now: datetime) -> list[Reservation]:
    return list(
        session.scalars(
            select(Reservation)
            .where(
                Reservation.diner_id == diner_id,
                Reservation.status == "confirmed",
                Reservation.starts_at > now,
            )
            .order_by(Reservation.starts_at)
        )
    )


def cancel_reservation(
    session: Session, diner_id: UUID, reservation_id: UUID, now: datetime
) -> Reservation:
    reservation = session.scalar(
        select(Reservation)
        .where(Reservation.id == reservation_id, Reservation.diner_id == diner_id)
        .with_for_update()
    )
    if reservation is None:
        raise ReservationNotFoundError
    if reservation.status == "cancelled":
        raise ReservationAlreadyCancelledError
    if reservation.starts_at <= now:
        raise ReservationCancellationWindowError(RESERVATION_PASSED)
    if reservation.starts_at - now < CANCELLATION_WINDOW:
        raise ReservationCancellationWindowError(CANCELLATION_TOO_LATE)
    reservation.status = "cancelled"
    reservation.cancelled_at = now
    session.flush()
    return reservation
