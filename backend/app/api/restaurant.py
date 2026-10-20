from fastapi import APIRouter, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError

from app.db import SessionDep
from app.models.restaurant import Restaurant
from app.schemas.restaurant import RestaurantRegistrationRequest, RestaurantResponse
from app.services.auth import hash_password

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