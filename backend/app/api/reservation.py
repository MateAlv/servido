from datetime import date, time
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.api.deps import TokenClaimsDep
from app.db import SessionDep
from app.models.reservation import RESERVATION_MINUTES
from app.models.restaurant import Restaurant
from app.schemas.reservation import (
    AvailabilityResponse,
    FreeGroupResponse,
    SlotResponse,
    TablesAvailabilityResponse,
)
from app.services import availability
from app.services.roles import DINER

router = APIRouter(tags=["reservation"])

DINERS_ONLY = "Esta acción es solo para comensales."
RESTAURANT_NOT_FOUND = "No encontramos ese restaurante."

PartySize = Annotated[int, Query(ge=1)]


def require_diner(claims: TokenClaimsDep) -> UUID:
    if claims.get("rol") != DINER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=DINERS_ONLY)
    return UUID(str(claims["sub"]))


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
    require_diner(claims)
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
    require_diner(claims)
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
