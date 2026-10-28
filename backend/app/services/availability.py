"""When a restaurant can seat a party (spec 005, rules in data-model.md).

Dates and times are local to Buenos Aires. Reservations last 90 minutes and start every 30
minutes, and a start is offered only if its 90 minutes fit inside a shift.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.opening_shift import OpeningShift
from app.models.reservation import RESERVATION_MINUTES, Reservation
from app.models.table_inventory import TableInventoryGroup

BUENOS_AIRES = ZoneInfo("America/Argentina/Buenos_Aires")
SLOT_MINUTES = 30
DURATION = timedelta(minutes=RESERVATION_MINUTES)

PAST_DATE = "No podés reservar en una fecha pasada."
INVALID_START = "Ese horario no es válido."
CLOSED_AT_START = "El restaurante no atiende en ese horario."
PAST_START = "Ese horario ya pasó."


def current_time() -> datetime:
    """The clock of every availability rule; tests replace it."""
    return datetime.now(BUENOS_AIRES)


class UnavailableStartError(ValueError):
    """The requested date or start can't be booked; the message is for the diner."""


@dataclass(frozen=True)
class Slot:
    start: time
    available: bool


@dataclass(frozen=True)
class DayAvailability:
    open: bool
    max_party_size: int
    slots: list[Slot]


@dataclass(frozen=True)
class FreeGroup:
    capacity: int
    seating_area: str
    free: int


def local_datetime(day: date, start: time) -> datetime:
    return datetime.combine(day, start, tzinfo=BUENOS_AIRES)


def active_shifts(session: Session, restaurant_id: UUID, day: date) -> list[OpeningShift]:
    return list(
        session.scalars(
            select(OpeningShift)
            .where(
                OpeningShift.restaurant_id == restaurant_id,
                OpeningShift.day_of_week == day.isoweekday(),
                OpeningShift.active.is_(True),
            )
            .order_by(OpeningShift.start_time)
        )
    )


def available_groups(session: Session, restaurant_id: UUID) -> list[TableInventoryGroup]:
    return list(
        session.scalars(
            select(TableInventoryGroup)
            .where(
                TableInventoryGroup.restaurant_id == restaurant_id,
                TableInventoryGroup.available.is_(True),
            )
            .order_by(TableInventoryGroup.capacity, TableInventoryGroup.seating_area)
        )
    )


def max_party_size(groups: list[TableInventoryGroup]) -> int:
    """One reservation holds one table, so the largest available table caps the party."""
    return max((group.capacity for group in groups), default=0)


def starts_in(shifts: list[OpeningShift], day: date) -> list[time]:
    starts = []
    for shift in shifts:
        start = local_datetime(day, shift.start_time)
        while start + DURATION <= local_datetime(day, shift.end_time):
            starts.append(start.time())
            start += timedelta(minutes=SLOT_MINUTES)
    return starts


def taken_tables(
    session: Session, restaurant_id: UUID, starts_at: datetime
) -> dict[tuple[int, str], set[int]]:
    """Table numbers of each group held by a confirmed reservation overlapping the block."""
    overlapping = session.execute(
        select(
            Reservation.table_capacity, Reservation.seating_area, Reservation.table_number
        ).where(
            Reservation.restaurant_id == restaurant_id,
            Reservation.status == "confirmed",
            Reservation.starts_at < starts_at + DURATION,
            Reservation.ends_at > starts_at,
        )
    )
    taken: dict[tuple[int, str], set[int]] = {}
    for capacity, seating_area, table_number in overlapping:
        taken.setdefault((capacity, seating_area), set()).add(table_number)
    return taken


def free_groups(
    session: Session,
    restaurant_id: UUID,
    groups: list[TableInventoryGroup],
    party_size: int,
    starts_at: datetime,
) -> list[FreeGroup]:
    """Groups that seat the party with at least one table free for the whole block.

    A table counts once however many reservations it holds: a 19:00 and a 21:00 on table 1
    both overlap 20:00, but they take one table, not two.
    """
    taken = taken_tables(session, restaurant_id, starts_at)
    result = []
    for group in groups:
        if group.capacity < party_size:
            continue
        numbers = taken.get((group.capacity, group.seating_area), set())
        free = group.quantity - len({number for number in numbers if number <= group.quantity})
        if free > 0:
            result.append(FreeGroup(group.capacity, group.seating_area, free))
    return result


def check_date(day: date, now: datetime) -> None:
    if day < now.date():
        raise UnavailableStartError(PAST_DATE)


def check_start(
    session: Session, restaurant_id: UUID, day: date, start: time, now: datetime
) -> datetime:
    """The start as a datetime, if it is on the grid, inside a shift and not past."""
    check_date(day, now)
    if start.minute % SLOT_MINUTES or start.second or start.microsecond:
        raise UnavailableStartError(INVALID_START)
    if start not in starts_in(active_shifts(session, restaurant_id, day), day):
        raise UnavailableStartError(CLOSED_AT_START)
    starts_at = local_datetime(day, start)
    if starts_at <= now:
        raise UnavailableStartError(PAST_START)
    return starts_at


def day_availability(
    session: Session, restaurant_id: UUID, day: date, party_size: int, now: datetime
) -> DayAvailability:
    check_date(day, now)
    shifts = active_shifts(session, restaurant_id, day)
    groups = available_groups(session, restaurant_id)
    cap = max_party_size(groups)
    if not shifts:
        return DayAvailability(open=False, max_party_size=cap, slots=[])
    if party_size > cap:
        return DayAvailability(open=True, max_party_size=cap, slots=[])
    slots = []
    for start in starts_in(shifts, day):
        starts_at = local_datetime(day, start)
        if starts_at <= now:
            continue
        free = free_groups(session, restaurant_id, groups, party_size, starts_at)
        slots.append(Slot(start=start, available=bool(free)))
    return DayAvailability(open=True, max_party_size=cap, slots=slots)


def groups_at(
    session: Session,
    restaurant_id: UUID,
    day: date,
    start: time,
    party_size: int,
    now: datetime,
) -> tuple[datetime, list[FreeGroup]]:
    """The block's start and the groups with a free table for it, smallest capacity first."""
    starts_at = check_start(session, restaurant_id, day, start, now)
    groups = available_groups(session, restaurant_id)
    return starts_at, free_groups(session, restaurant_id, groups, party_size, starts_at)
