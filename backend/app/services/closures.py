import logging
from datetime import date, datetime, time, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.cart import Cart
from app.models.closure import Closure
from app.models.diner import Diner
from app.models.reservation import Reservation
from app.models.restaurant import Restaurant
from app.schemas.closure import AffectedReservation, ClosureRequest
from app.services import mail

logger = logging.getLogger(__name__)
BUENOS_AIRES = ZoneInfo("America/Argentina/Buenos_Aires")


class ClosureValidationError(ValueError):
    pass


def closure_range(
    closure_date: date, start: time | None, end: time | None
) -> tuple[datetime, datetime]:
    start_at = datetime.combine(closure_date, start or time.min, tzinfo=BUENOS_AIRES)
    end_at = datetime.combine(
        closure_date + timedelta(days=1) if start is None else closure_date,
        end or time.min,
        tzinfo=BUENOS_AIRES,
    )
    return start_at, end_at


def validate(payload: ClosureRequest, now: datetime) -> None:
    if payload.date < now.date():
        raise ClosureValidationError("No podés bloquear una fecha pasada.")
    if (payload.start_time is None) != (payload.end_time is None):
        raise ClosureValidationError(
            "Elegí la hora de inicio y la de fin, o bloqueá el día completo."
        )
    if payload.start_time is not None and payload.end_time <= payload.start_time:
        raise ClosureValidationError("La hora de fin debe ser posterior a la de inicio.")
    if (
        payload.date == now.date()
        and payload.start_time is not None
        and payload.start_time < now.time().replace(second=0, microsecond=0)
    ):
        raise ClosureValidationError(
            "Esa franja ya comenzó. Elegí una hora posterior o bloqueá el día completo."
        )


def affected(session: Session, restaurant_id: UUID, payload: ClosureRequest) -> list[Reservation]:
    start_at, end_at = closure_range(payload.date, payload.start_time, payload.end_time)
    return list(
        session.scalars(
            select(Reservation)
            .where(
                Reservation.restaurant_id == restaurant_id,
                Reservation.status == "confirmed",
                Reservation.starts_at < end_at,
                Reservation.ends_at > start_at,
            )
            .order_by(Reservation.starts_at, Reservation.id)
        )
    )


def affected_response(reservations: list[Reservation]) -> list[AffectedReservation]:
    return [
        AffectedReservation(
            reservation_id=r.id,
            date=r.starts_at.astimezone(BUENOS_AIRES).date(),
            start_time=r.starts_at.astimezone(BUENOS_AIRES).strftime("%H:%M"),
            end_time=r.ends_at.astimezone(BUENOS_AIRES).strftime("%H:%M"),
            party_size=r.party_size,
        )
        for r in reservations
    ]


def response(closure: Closure):
    from app.schemas.closure import ClosureResponse

    return ClosureResponse(
        id=closure.id,
        date=closure.date,
        start_time=closure.start_time,
        end_time=closure.end_time,
        all_day=closure.all_day,
        created_at=closure.created_at,
    )


def create(
    session: Session, restaurant: Restaurant, payload: ClosureRequest, now: datetime
) -> tuple[Closure, bool, list[Reservation]]:
    validate(payload, now)
    existing = session.scalar(select(Closure).where(Closure.request_id == payload.request_id))
    if existing is not None:
        if existing.restaurant_id != restaurant.id_restaurante:
            raise ClosureValidationError("No pudimos guardar el bloqueo. Volvé a intentarlo.")
        return existing, False, []
    reservations = affected(session, restaurant.id_restaurante, payload)
    ids = {r.id for r in reservations}
    if reservations and (not payload.confirmed or set(payload.acknowledged_reservation_ids) != ids):
        return None, False, reservations  # type: ignore[return-value]
    closure = Closure(
        restaurant_id=restaurant.id_restaurante,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        request_id=payload.request_id,
    )
    session.add(closure)
    for reservation in reservations:
        reservation.status = "cancelled"
        reservation.cancelled_at = now.astimezone(ZoneInfo("UTC"))
        session.execute(delete(Cart).where(Cart.reservation_id == reservation.id))
    session.flush()
    session.commit()
    for reservation in reservations:
        diner = session.get(Diner, reservation.diner_id)
        if diner:
            try:
                local_start = reservation.starts_at.astimezone(BUENOS_AIRES)
                mail.send_mail(
                    mail.Mail(
                        to=diner.email,
                        subject=f"Se canceló tu reserva en {restaurant.nombre}",
                        text=(
                            f"El restaurante {restaurant.nombre} canceló tu reserva del "
                            f"{local_start:%d/%m/%Y} a las {local_start:%H:%M}."
                        ),
                        html=(
                            f"<p>El restaurante {restaurant.nombre} canceló tu reserva del "
                            f"{local_start:%d/%m/%Y} a las {local_start:%H:%M}.</p>"
                        ),
                    )
                )
            except mail.MailError:
                logger.exception("Could not notify diner about closure")
    return closure, True, reservations


def list_current(session: Session, restaurant_id: UUID, today: date) -> list[Closure]:
    return list(
        session.scalars(
            select(Closure)
            .where(Closure.restaurant_id == restaurant_id, Closure.date >= today)
            .order_by(Closure.date, Closure.start_time.nullsfirst(), Closure.end_time)
        )
    )
