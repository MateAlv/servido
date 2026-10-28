from datetime import date, time, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.api.deps import SESSION_EXPIRED_DETAIL, TokenClaimsDep
from app.db import SessionDep
from app.models.diner import Diner
from app.models.reservation import RESERVATION_MINUTES, Reservation
from app.models.restaurant import Restaurant
from app.schemas.reservation import (
    AvailabilityResponse,
    DayReservationsResponse,
    FreeGroupResponse,
    ReservationRequest,
    ReservationResponse,
    ReservationRestaurant,
    SlotResponse,
    TableChoice,
    TablesAvailabilityResponse,
)
from app.schemas.table_inventory import MAX_TABLE_CAPACITY
from app.services import availability
from app.services.roles import DINER

router = APIRouter(tags=["reservation"])

DINERS_ONLY = "Esta acción es solo para comensales."
RESTAURANT_NOT_FOUND = "No encontramos ese restaurante."

PartySize = Annotated[int, Query(ge=1, le=MAX_TABLE_CAPACITY)]


def require_diner(claims: TokenClaimsDep, session: SessionDep) -> UUID:
    if claims.get("rol") != DINER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=DINERS_ONLY)
    diner_id = UUID(str(claims["sub"]))
    # A token can outlive its account: treat it as an expired session.
    if session.get(Diner, diner_id) is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=SESSION_EXPIRED_DETAIL)
    return diner_id


def existing_restaurant(session: SessionDep, restaurant_id: UUID) -> Restaurant:
    restaurant = session.get(Restaurant, restaurant_id)
    if restaurant is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=RESTAURANT_NOT_FOUND)
    return restaurant


def hour_and_minute(value: time) -> str:
    return value.strftime("%H:%M")


@router.get(
    "/restaurants/{restaurant_id}/availability",
    response_model=AvailabilityResponse,
    responses={
        400: {"description": "Fecha pasada o datos inválidos."},
        401: {"description": "Falta la sesión o venció."},
        403: {"description": "Solo para comensales."},
        404: {"description": "El restaurante no existe."},
    },
)
def get_availability(
    restaurant_id: UUID,
    date: date,
    party_size: PartySize,
    claims: TokenClaimsDep,
    session: SessionDep,
) -> AvailabilityResponse:
    require_diner(claims, session)
    existing_restaurant(session, restaurant_id)
    try:
        day = availability.day_availability(
            session, restaurant_id, date, party_size, availability.current_time()
        )
    except availability.UnavailableStartError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    return AvailabilityResponse(
        restaurant_id=restaurant_id,
        date=date,
        open=day.open,
        duration_minutes=RESERVATION_MINUTES,
        max_party_size=day.max_party_size,
        seating_areas=day.seating_areas,
        slots=[
            SlotResponse(start_time=hour_and_minute(slot.start), available=slot.available)
            for slot in day.slots
        ],
    )


@router.get(
    "/restaurants/{restaurant_id}/availability/tables",
    response_model=TablesAvailabilityResponse,
    responses={
        400: {"description": "Fecha u horario no válidos."},
        401: {"description": "Falta la sesión o venció."},
        403: {"description": "Solo para comensales."},
        404: {"description": "El restaurante no existe."},
    },
)
def get_available_tables(
    restaurant_id: UUID,
    date: date,
    start_time: time,
    party_size: PartySize,
    claims: TokenClaimsDep,
    session: SessionDep,
) -> TablesAvailabilityResponse:
    require_diner(claims, session)
    existing_restaurant(session, restaurant_id)
    try:
        starts_at, groups = availability.groups_at(
            session, restaurant_id, date, start_time, party_size, availability.current_time()
        )
    except availability.UnavailableStartError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    return TablesAvailabilityResponse(
        restaurant_id=restaurant_id,
        date=date,
        start_time=hour_and_minute(start_time),
        ends_at=starts_at + availability.DURATION,
        tables=[
            FreeGroupResponse(
                capacity=group.capacity, seating_area=group.seating_area, free=group.free
            )
            for group in groups
        ],
    )


def reservation_response(reservation: Reservation, restaurant: Restaurant) -> ReservationResponse:
    starts_at = reservation.starts_at.astimezone(availability.BUENOS_AIRES)
    ends_at = reservation.ends_at.astimezone(availability.BUENOS_AIRES)
    return ReservationResponse(
        id=reservation.id,
        restaurant=ReservationRestaurant(id=restaurant.id_restaurante, nombre=restaurant.nombre),
        date=starts_at.date(),
        start_time=hour_and_minute(starts_at.time()),
        end_time=hour_and_minute(ends_at.time()),
        party_size=reservation.party_size,
        table=TableChoice(
            capacity=reservation.table_capacity, seating_area=reservation.seating_area
        ),
        status=reservation.status,
    )


@router.post(
    "/reservations",
    response_model=ReservationResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        200: {"description": "La misma confirmación ya había creado esta reserva."},
        400: {"description": "Datos inválidos."},
        401: {"description": "Falta la sesión o venció."},
        403: {"description": "Solo para comensales."},
        404: {"description": "El restaurante no existe."},
        409: {"description": "Algo cambió durante la revisión: la reserva no se creó."},
    },
)
def confirm_reservation(
    payload: ReservationRequest, claims: TokenClaimsDep, session: SessionDep, response: Response
) -> ReservationResponse:
    diner_id = require_diner(claims, session)
    existing_restaurant(session, payload.restaurant_id)
    choice = availability.ReservationChoice(
        restaurant_id=payload.restaurant_id,
        day=payload.date,
        start=payload.start_time,
        party_size=payload.party_size,
        capacity=payload.table.capacity,
        seating_area=payload.table.seating_area,
        request_id=payload.request_id,
    )
    try:
        reservation, created = availability.confirm_reservation(
            session, diner_id, choice, availability.current_time()
        )
    except availability.UnavailableStartError as error:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except availability.ConfirmationConflictError as error:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    session.commit()
    if not created:
        response.status_code = status.HTTP_200_OK
    # A repeated request answers with its own reservation, whatever this payload says.
    return reservation_response(reservation, session.get(Restaurant, reservation.restaurant_id))


@router.get(
    "/reservations",
    response_model=DayReservationsResponse,
    responses={
        401: {"description": "Falta la sesión o venció."},
        403: {"description": "Solo para comensales."},
    },
)
def list_day_reservations(
    date: date, claims: TokenClaimsDep, session: SessionDep
) -> DayReservationsResponse:
    diner_id = require_diner(claims, session)
    today = availability.current_time().date()
    if (
        not today - timedelta(days=366)
        <= date
        <= today + timedelta(days=availability.MAX_DAYS_AHEAD)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Esa fecha no es válida."
        )
    reservations = availability.diner_reservations_of_day(session, diner_id, date)
    return DayReservationsResponse(
        date=date,
        reservations=[
            reservation_response(reservation, session.get(Restaurant, reservation.restaurant_id))
            for reservation in reservations
        ],
    )
