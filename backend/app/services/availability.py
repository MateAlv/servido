"""When a restaurant can seat a party (spec 005, rules in data-model.md).

Dates and times are local to Buenos Aires. Reservations last 90 minutes and start every 30
minutes, and a start is offered only if its 90 minutes fit inside a shift.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import and_, exists, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.opening_shift import OpeningShift
from app.models.reservation import RESERVATION_MINUTES, Reservation
from app.models.restaurant import Restaurant
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


def bookable_condition():
    """Where clause for restaurants a diner can book: coordinates, an active shift and an
    available table group (decision D4)."""
    return and_(
        Restaurant.latitud.is_not(None),
        exists().where(
            OpeningShift.restaurant_id == Restaurant.id_restaurante,
            OpeningShift.active.is_(True),
        ),
        exists().where(
            TableInventoryGroup.restaurant_id == Restaurant.id_restaurante,
            TableInventoryGroup.available.is_(True),
        ),
    )


class ConfirmationConflictError(Exception):
    """The selection was valid when the diner chose it but isn't anymore (409)."""


START_PASSED = "Ese horario ya pasó. Elegí otro."
NO_LONGER_OPEN = "El restaurante ya no atiende en ese horario. Elegí otro."
ABOVE_MAXIMUM = "El grupo supera la capacidad máxima del restaurante."
TABLE_GONE = "Esa mesa ya no está disponible. Elegí otro horario o tipo de mesa."
TABLE_TAKEN = "La mesa se ocupó mientras confirmabas. Elegí otro horario o tipo de mesa."
NOT_BOOKABLE = "El restaurante ya no está tomando reservas."


@dataclass(frozen=True)
class ReservationChoice:
    restaurant_id: UUID
    day: date
    start: time
    party_size: int
    capacity: int
    seating_area: str
    request_id: UUID


def locked_group(session: Session, choice: ReservationChoice) -> TableInventoryGroup | None:
    query = (
        select(TableInventoryGroup)
        .where(
            TableInventoryGroup.restaurant_id == choice.restaurant_id,
            TableInventoryGroup.capacity == choice.capacity,
            TableInventoryGroup.seating_area == choice.seating_area,
        )
        .with_for_update()
    )
    # If the restaurant re-saved its tables while we waited for the lock, the row we waited on
    # is gone and its replacement only shows up in a new query.
    return session.scalar(query) or session.scalar(query)


def confirm_reservation(
    session: Session, diner_id: UUID, choice: ReservationChoice, now: datetime
) -> tuple[Reservation, bool]:
    """Creates the reservation, or returns the one this request already created (rule 9).

    Returns the reservation and whether it is new. Raises UnavailableStartError for a malformed
    start (400) and ConfirmationConflictError for whatever changed during the review (409).
    """
    existing = session.scalar(
        select(Reservation).where(Reservation.request_id == choice.request_id)
    )
    if existing is not None:
        if existing.diner_id != diner_id:
            raise ConfirmationConflictError(TABLE_TAKEN)
        return existing, False

    if choice.start.minute % SLOT_MINUTES or choice.start.second or choice.start.microsecond:
        raise UnavailableStartError(INVALID_START)
    if (
        session.scalar(
            select(Restaurant.id_restaurante).where(
                Restaurant.id_restaurante == choice.restaurant_id, bookable_condition()
            )
        )
        is None
    ):
        raise ConfirmationConflictError(NOT_BOOKABLE)

    group = locked_group(session, choice)
    if group is None or not group.available or group.capacity < choice.party_size:
        raise ConfirmationConflictError(TABLE_GONE)

    starts_at = local_datetime(choice.day, choice.start)
    if starts_at <= now:
        raise ConfirmationConflictError(START_PASSED)
    shifts = active_shifts(session, choice.restaurant_id, choice.day)
    if choice.start not in starts_in(shifts, choice.day):
        raise ConfirmationConflictError(NO_LONGER_OPEN)
    if choice.party_size > max_party_size(available_groups(session, choice.restaurant_id)):
        raise ConfirmationConflictError(ABOVE_MAXIMUM)

    taken = taken_tables(session, choice.restaurant_id, starts_at).get(
        (group.capacity, group.seating_area), set()
    )
    free = [number for number in range(1, group.quantity + 1) if number not in taken]
    if not free:
        raise ConfirmationConflictError(TABLE_TAKEN)

    reservation = Reservation(
        diner_id=diner_id,
        restaurant_id=choice.restaurant_id,
        table_capacity=group.capacity,
        seating_area=group.seating_area,
        table_number=free[0],
        party_size=choice.party_size,
        starts_at=starts_at,
        ends_at=starts_at + DURATION,
        request_id=choice.request_id,
    )
    session.add(reservation)
    try:
        # The exclusion constraint is the last guard against a concurrent confirmation.
        with session.begin_nested():
            session.flush()
    except IntegrityError as error:
        raise ConfirmationConflictError(TABLE_TAKEN) from error
    return reservation, True


def diner_reservations_of_day(session: Session, diner_id: UUID, day: date) -> list[Reservation]:
    """The diner's confirmed reservations whose block touches that Buenos Aires day."""
    day_start = local_datetime(day, time.min)
    return list(
        session.scalars(
            select(Reservation)
            .where(
                Reservation.diner_id == diner_id,
                Reservation.status == "confirmed",
                Reservation.starts_at < day_start + timedelta(days=1),
                Reservation.ends_at > day_start,
            )
            .order_by(Reservation.starts_at)
        )
    )
