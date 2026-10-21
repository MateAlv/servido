from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.db import SessionDep
from app.models.diner import Diner
from app.models.restaurant import Restaurant
from app.schemas.auth import Credentials, DinerResponse, LoginResponse, RegistrationRequest
from app.schemas.restaurant import RestaurantLoginResponse, RestaurantResponse
from app.services.auth import create_access_token, hash_password, verify_password
from app.services.roles import DINER, RESTAURANT

router = APIRouter(tags=["auth"])

INVALID_CREDENTIALS_DETAIL = "Credenciales inválidas"


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
    return LoginResponse(
        comensal=DinerResponse.model_validate(diner),
        access_token=create_access_token(str(diner.id_comensal), diner.email, DINER),
    )


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
