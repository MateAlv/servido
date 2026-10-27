from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import delete, or_, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import TokenClaimsDep
from app.db import SessionDep
from app.models.opening_shift import OpeningShift
from app.models.restaurant import Restaurant
from app.models.table_inventory import TableInventoryGroup
from app.schemas.opening_hours import OpeningHoursResponse, OpeningShiftPayload
from app.schemas.restaurant import (
    GeocodingPreview,
    GeocodingRequest,
    RestaurantProfileResponse,
    RestaurantProfileUpdate,
    RestaurantRegistrationRequest,
    RestaurantResponse,
)
from app.schemas.table_inventory import TableInventoryGroupPayload, TableInventoryGroupResponse
from app.services.auth import hash_password
from app.services.geocoding import GeocodingError, geocode_address
from app.services.opening_hours import validate_shifts
from app.services.roles import RESTAURANT
from app.services.table_inventory import ReservationConflictError, replace_inventory

router = APIRouter(tags=["restaurant"])

DUPLICATE_DETAIL = "Ya existe una cuenta de restaurante asociada a ese email o CUIT."


@router.post(
    "/restaurantes",
    response_model=RestaurantResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"description": "Datos de registro inválidos."},
        409: {"description": "El email o el CUIT ya están registrados."},
    },
)
def register_restaurant(payload: RestaurantRegistrationRequest, session: SessionDep) -> Restaurant:
    duplicate = session.scalar(
        select(Restaurant).where(
            or_(Restaurant.email == payload.email, Restaurant.cuit == payload.cuit)
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE_DETAIL)

    restaurant = Restaurant(
        nombre=payload.nombre,
        cuit=payload.cuit,
        email=payload.email,
        telefono=payload.telefono,
        password_hash=hash_password(payload.password),
    )
    session.add(restaurant)
    try:
        session.commit()
    except IntegrityError as error:
        # Two requests can pass the check above at the same time; the database has the last word.
        session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE_DETAIL
        ) from error
    session.refresh(restaurant)
    return restaurant


def restaurant_from_claims(claims: dict[str, object], session: SessionDep) -> Restaurant:
    if claims.get("rol") != RESTAURANT:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tenés permiso.")
    try:
        restaurant_id = UUID(str(claims["sub"]))
    except (KeyError, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Sesión inválida."
        ) from error
    restaurant = session.get(Restaurant, restaurant_id)
    if restaurant is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Restaurante no encontrado."
        )
    return restaurant


@router.get("/restaurante/perfil", response_model=RestaurantProfileResponse)
def get_restaurant_profile(claims: TokenClaimsDep, session: SessionDep) -> Restaurant:
    return restaurant_from_claims(claims, session)


@router.put("/restaurante/perfil", response_model=RestaurantProfileResponse)
def update_restaurant_profile(
    payload: RestaurantProfileUpdate, claims: TokenClaimsDep, session: SessionDep
) -> Restaurant:
    restaurant = restaurant_from_claims(claims, session)
    for field in (
        "nombre",
        "descripcion",
        "tipo_cocina",
        "rango_precio",
        "restricciones_tags",
        "direccion",
        "latitud",
        "longitud",
    ):
        setattr(restaurant, field, getattr(payload, field))
    restaurant.foto_url = str(payload.foto_url) if payload.foto_url is not None else None
    session.commit()
    session.refresh(restaurant)
    return restaurant


@router.post("/restaurante/perfil/geocodificar", response_model=GeocodingPreview)
def geocode_restaurant_address(
    payload: GeocodingRequest, claims: TokenClaimsDep, session: SessionDep
) -> dict[str, object]:
    restaurant_from_claims(claims, session)
    try:
        return geocode_address(payload.address)
    except GeocodingError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error


@router.get("/restaurante/horarios", response_model=list[OpeningHoursResponse])
def get_opening_hours(claims: TokenClaimsDep, session: SessionDep) -> list[OpeningShift]:
    restaurant = restaurant_from_claims(claims, session)
    return list(
        session.scalars(
            select(OpeningShift)
            .where(OpeningShift.restaurant_id == restaurant.id_restaurante)
            .where(OpeningShift.active.is_(True))
            .order_by(OpeningShift.day_of_week, OpeningShift.start_time)
        )
    )


@router.put("/restaurante/horarios", response_model=list[OpeningHoursResponse])
def replace_opening_hours(
    payload: list[OpeningShiftPayload], claims: TokenClaimsDep, session: SessionDep
) -> list[OpeningShift]:
    restaurant = restaurant_from_claims(claims, session)
    try:
        validate_shifts(
            [(item.day_of_week, item.start_time, item.end_time, item.active) for item in payload]
        )
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    session.execute(
        delete(OpeningShift).where(OpeningShift.restaurant_id == restaurant.id_restaurante)
    )
    shifts = [
        OpeningShift(
            restaurant_id=restaurant.id_restaurante,
            day_of_week=item.day_of_week,
            start_time=item.start_time,
            end_time=item.end_time,
            active=item.active,
        )
        for item in payload
    ]
    session.add_all(shifts)
    session.commit()
    return shifts


def table_inventory_response(group: TableInventoryGroup) -> TableInventoryGroupResponse:
    return TableInventoryGroupResponse(
        id=group.id,
        capacity=group.capacity,
        quantity=group.quantity,
        available=group.available,
        free_quantity=group.quantity if group.available else 0,
    )


@router.get("/restaurante/mesas", response_model=list[TableInventoryGroupResponse])
def get_table_inventory(
    claims: TokenClaimsDep, session: SessionDep
) -> list[TableInventoryGroupResponse]:
    restaurant = restaurant_from_claims(claims, session)
    groups = session.scalars(
        select(TableInventoryGroup)
        .where(TableInventoryGroup.restaurant_id == restaurant.id_restaurante)
        .order_by(TableInventoryGroup.capacity)
    )
    return [table_inventory_response(group) for group in groups]


@router.put("/restaurante/mesas", response_model=list[TableInventoryGroupResponse])
def replace_table_inventory(
    payload: list[TableInventoryGroupPayload], claims: TokenClaimsDep, session: SessionDep
) -> list[TableInventoryGroupResponse]:
    restaurant = restaurant_from_claims(claims, session)
    try:
        groups = replace_inventory(
            session,
            restaurant.id_restaurante,
            [item.model_dump() for item in payload],
        )
        session.commit()
    except ReservationConflictError as error:
        session.rollback()
        affected = [
            {
                "reservation_id": str(item.reservation_id),
                "date": item.date.isoformat(),
                "start_time": item.start_time.isoformat(),
                "quantity": item.quantity,
            }
            for item in error.result.affected_reservations
        ]
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "La modificación afecta reservas confirmadas.",
                "reservations": affected,
            },
        ) from error
    except ValueError as error:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    return [table_inventory_response(group) for group in groups]
