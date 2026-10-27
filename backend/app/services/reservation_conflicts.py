from dataclasses import dataclass
from datetime import date, time
from uuid import UUID


@dataclass(frozen=True)
class ReservationConflictRequest:
    restaurant_id: UUID
    group_capacity: int
    date: date
    start_time: time
    end_time: time
    quantity_delta: int


@dataclass(frozen=True)
class AffectedReservation:
    reservation_id: UUID
    date: date
    start_time: time
    quantity: int


@dataclass(frozen=True)
class ReservationConflictResult:
    has_conflict: bool
    affected_reservations: list[AffectedReservation]


def check_reservation_conflict(
    request: ReservationConflictRequest,
) -> ReservationConflictResult:
    """Default stub; the future reservation feature replaces this implementation."""
    del request
    return ReservationConflictResult(has_conflict=False, affected_reservations=[])
