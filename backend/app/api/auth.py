import secrets
from typing import Any

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
    GoogleSignUp,
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
from app.services.email_verification import mark_verified, send_verification_mail
from app.services.google import InvalidGoogleTokenError, verify_google_id_token
from app.services.roles import DINER, RESTAURANT

router = APIRouter(tags=["auth"])

INVALID_CREDENTIALS_DETAIL = "Credenciales inválidas"
GOOGLE_SIGN_IN_FAILED_DETAIL = "No pudimos ingresar con Google. Probá de nuevo."
NO_DINER_FOR_GOOGLE_DETAIL = "No existe una cuenta de Servido! asociada a ese email de Google."
NO_RESTAURANT_FOR_GOOGLE_DETAIL = (
    "No existe una cuenta de restaurante asociada a ese email de Google."
)
GOOGLE_SIGN_UP_FAILED_DETAIL = "No pudimos crear tu cuenta con Google. Probá de nuevo."
GOOGLE_EMAIL_TAKEN_DETAIL = "Ya existe una cuenta de Servido! con ese email. Ingresá con Google."
NAME_MISSING_DETAIL = "Ingresá tu nombre para terminar de crear tu cuenta."
NAME_MAX_LENGTH = 60


def google_claims(credential: str, failure_detail: str) -> dict[str, Any]:
    try:
        return verify_google_id_token(credential)
    except InvalidGoogleTokenError as error:
        raise HTTPException(status_code=401, detail=failure_detail) from error


def restaurant_session(restaurant: Restaurant) -> RestaurantLoginResponse:
    return RestaurantLoginResponse(
        restaurante=RestaurantResponse.model_validate(restaurant),
        access_token=create_access_token(
            str(restaurant.id_restaurante), restaurant.email, RESTAURANT
        ),
    )


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
    send_verification_mail(session, diner)
    return diner


@router.post(
    "/comensales/google",
    response_model=LoginResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"description": "Falta la credencial, o Google no dio el nombre y no se envió."},
        401: {"description": "La credencial de Google no es válida."},
        409: {"description": "Ya hay un comensal con el email de esa cuenta de Google."},
    },
)
def register_diner_with_google(payload: GoogleSignUp, session: SessionDep) -> LoginResponse:
    claims = google_claims(payload.credential, GOOGLE_SIGN_UP_FAILED_DETAIL)
    nombre = payload.nombre or (claims.get("name") or "").strip()[:NAME_MAX_LENGTH].strip()
    if not nombre:
        raise HTTPException(status_code=400, detail=NAME_MISSING_DETAIL)
    diner = Diner(
        nombre=nombre,
        email=normalize_email(claims["email"]),
        # Nobody knows this secret, so the account has no usable password (research R10).
        password_hash=hash_password(secrets.token_urlsafe(32)),
    )
    # Google already proved that the email is theirs: no verification mail (FR-015).
    mark_verified(diner)
    session.add(diner)
    try:
        session.commit()
    except IntegrityError as error:
        session.rollback()
        raise HTTPException(status_code=409, detail=GOOGLE_EMAIL_TAKEN_DETAIL) from error
    session.refresh(diner)
    return diner_session(diner)


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
    claims = google_claims(payload.credential, GOOGLE_SIGN_IN_FAILED_DETAIL)
    email = normalize_email(claims["email"])
    diner = session.scalar(select(Diner).where(Diner.email == email))
    if diner is None:
        raise HTTPException(status_code=404, detail=NO_DINER_FOR_GOOGLE_DETAIL)
    # Google already proved that the email is theirs (FR-013).
    if diner.email_verified_at is None:
        mark_verified(diner)
        session.commit()
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
    return restaurant_session(restaurant)


@router.post(
    "/auth/restaurante/google",
    response_model=RestaurantLoginResponse,
    responses={
        400: {"description": "Falta la credencial de Google."},
        401: {"description": "La credencial de Google no es válida."},
        404: {"description": "No hay un restaurante con el email de esa cuenta de Google."},
    },
)
def login_restaurant_with_google(
    payload: GoogleCredential, session: SessionDep
) -> RestaurantLoginResponse:
    claims = google_claims(payload.credential, GOOGLE_SIGN_IN_FAILED_DETAIL)
    email = normalize_email(claims["email"])
    restaurant = session.scalar(select(Restaurant).where(Restaurant.email == email))
    if restaurant is None:
        raise HTTPException(status_code=404, detail=NO_RESTAURANT_FOR_GOOGLE_DETAIL)
    return restaurant_session(restaurant)
