import secrets

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError

from app.api.auth import google_claims, restaurant_session
from app.db import SessionDep
from app.models.restaurant import Restaurant
from app.schemas.restaurant import (
    RestaurantGoogleRegistration,
    RestaurantLoginResponse,
    RestaurantRegistrationRequest,
    RestaurantResponse,
)
from app.services.auth import hash_password, normalize_email

router = APIRouter(tags=["restaurant"])

DUPLICATE_DETAIL = "Ya existe una cuenta de restaurante asociada a ese email o CUIT."
GOOGLE_SIGN_UP_FAILED_DETAIL = "No pudimos registrar el restaurante con Google. Probá de nuevo."


def save_restaurant(session: SessionDep, restaurant: Restaurant) -> Restaurant:
    duplicate = session.scalar(
        select(Restaurant).where(
            or_(Restaurant.email == restaurant.email, Restaurant.cuit == restaurant.cuit)
        )
    )
    if duplicate is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=DUPLICATE_DETAIL)
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
    restaurant = Restaurant(
        nombre=payload.nombre,
        cuit=payload.cuit,
        email=payload.email,
        telefono=payload.telefono,
        password_hash=hash_password(payload.password),
    )
    return save_restaurant(session, restaurant)


@router.post(
    "/restaurantes/google",
    response_model=RestaurantLoginResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"description": "Datos de registro inválidos."},
        401: {"description": "La credencial de Google no es válida."},
        409: {"description": "El email de Google o el CUIT ya están registrados."},
    },
)
def register_restaurant_with_google(
    payload: RestaurantGoogleRegistration, session: SessionDep
) -> RestaurantLoginResponse:
    claims = google_claims(payload.credential, GOOGLE_SIGN_UP_FAILED_DETAIL)
    restaurant = Restaurant(
        nombre=payload.nombre,
        cuit=payload.cuit,
        email=normalize_email(claims["email"]),
        telefono=payload.telefono,
        # Nobody knows this secret, so the account has no usable password (spec 007, research R10).
        password_hash=hash_password(secrets.token_urlsafe(32)),
    )
    return restaurant_session(save_restaurant(session, restaurant))
