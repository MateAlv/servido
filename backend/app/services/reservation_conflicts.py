"""Whether a change to the table groups would leave a reservation without a table (spec 004,
US-10 S3; rule 11 of specs/005-reservar-mesa/data-model.md, decision D9)."""

from dataclasses import dataclass
from datetime import date, datetime, time
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.reservation import Reservation


@dataclass(frozen=True)
class AffectedReservation:
    reservation_id: UUID
    date: date
    start_time: time
    party_size: int


@dataclass(frozen=True)
class ReservationConflictResult:
    has_conflict: bool
    affected_reservations: list[AffectedReservation]


def check_reservation_conflict(
    session: Session,
    restaurant_id: UUID,
    capacity: int,
    seating_area: str,
    new_quantity: int,
    now: datetime,
) -> ReservationConflictResult:
    """A group may keep `new_quantity` tables only if no confirmed reservation that hasn't ended
    holds a table numbered above it. Removing, disabling or changing the group means 0."""
    reservations = session.scalars(
        select(Reservation)
        .where(
            Reservation.restaurant_id == restaurant_id,
            Reservation.table_capacity == capacity,
            Reservation.seating_area == seating_area,
            Reservation.status == "confirmed",
            Reservation.ends_at > now,
            Reservation.table_number > new_quantity,
        )
        .order_by(Reservation.starts_at)
    )
    affected = []
    for reservation in reservations:
        starts_at = reservation.starts_at.astimezone(now.tzinfo)
        affected.append(
            AffectedReservation(
                reservation_id=reservation.id,
                date=starts_at.date(),
                start_time=starts_at.time(),
                party_size=reservation.party_size,
            )
        )
    return ReservationConflictResult(has_conflict=bool(affected), affected_reservations=affected)
