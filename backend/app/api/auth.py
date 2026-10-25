from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db import SessionDep
from app.models.diner import Diner
from app.models.restaurant import Restaurant
from app.schemas.auth import (
    Credentials,
    DinerResponse,
    GoogleCredential,
    LoginResponse,
    RegistrationRequest,
)
from app.schemas.restaurant import RestaurantLoginResponse, RestaurantResponse
from app.services.auth import (
    create_access_token,
    hash_password,
    normalize_email,
    verify_password,
)
from app.services.google import InvalidGoogleTokenError, verify_google_id_token
from app.services.roles import DINER, RESTAURANT

router = APIRouter(tags=["auth"])

INVALID_CREDENTIALS_DETAIL = "Credenciales inválidas"
GOOGLE_SIGN_IN_FAILED_DETAIL = "No pudimos ingresar con Google. Probá de nuevo."
NO_DINER_FOR_GOOGLE_DETAIL = "No existe una cuenta de Servido! asociada a ese email de Google."


def diner_session(diner: Diner) -> LoginResponse:
    return LoginResponse(
        comensal=DinerResponse.model_validate(diner),
        access_token=create_access_token(str(diner.id_comensal), diner.email, DINER),
    )


@router.post(
    "/comensales",
    response_model=DinerResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"description": "Datos de registro inválidos."},
        409: {"description": "El email ya está registrado."},
    },
)
def register_diner(payload: RegistrationRequest, session: SessionDep) -> Diner:
    diner = Diner(
        nombre=payload.nombre,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    session.add(diner)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise HTTPException(
            status_code=409, detail="Ya existe una cuenta asociada a ese email."
        ) from error
    session.refresh(diner)
    return diner


@router.post(
    "/auth/comensal",
    response_model=LoginResponse,
    responses={
        400: {"description": "Credenciales con formato inválido."},
        401: {"description": "Credenciales inválidas."},
    },
)
def login_diner(payload: Credentials, session: SessionDep) -> LoginResponse:
    diner = session.scalar(select(Diner).where(Diner.email == payload.email))
    if diner is None or not verify_password(payload.password, diner.password_hash):
        raise HTTPException(status_code=401, detail=INVALID_CREDENTIALS_DETAIL)
    return diner_session(diner)


@router.post(
    "/auth/comensal/google",
    response_model=LoginResponse,
    responses={
        400: {"description": "Falta la credencial de Google."},
        401: {"description": "La credencial de Google no es válida."},
        404: {"description": "No hay un comensal con el email de esa cuenta de Google."},
    },
)
def login_diner_with_google(payload: GoogleCredential, session: SessionDep) -> LoginResponse:
    try:
        claims = verify_google_id_token(payload.credential)
    except InvalidGoogleTokenError as error:
        raise HTTPException(status_code=401, detail=GOOGLE_SIGN_IN_FAILED_DETAIL) from error
    email = normalize_email(claims["email"])
    diner = session.scalar(select(Diner).where(Diner.email == email))
    if diner is None:
        raise HTTPException(status_code=404, detail=NO_DINER_FOR_GOOGLE_DETAIL)
    return diner_session(diner)


@router.post(
    "/auth/restaurante",
    response_model=RestaurantLoginResponse,
    responses={
        400: {"description": "Credenciales con formato inválido."},
        401: {"description": "Credenciales inválidas."},
    },
)
def login_restaurant(payload: Credentials, session: SessionDep) -> RestaurantLoginResponse:
    restaurant = session.scalar(select(Restaurant).where(Restaurant.email == payload.email))
    if restaurant is None or not verify_password(payload.password, restaurant.password_hash):
        raise HTTPException(status_code=401, detail=INVALID_CREDENTIALS_DETAIL)
    return RestaurantLoginResponse(
        restaurante=RestaurantResponse.model_validate(restaurant),
        access_token=create_access_token(
            str(restaurant.id_restaurante), restaurant.email, RESTAURANT
        ),
    )
