from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import SESSION_EXPIRED_DETAIL, TokenClaimsDep
from app.db import SessionDep
from app.models.diner import Diner
from app.models.restaurant import Restaurant
from app.schemas.auth import AccountResponse
from app.services.roles import DINER, RESTAURANT

router = APIRouter(tags=["account"])


@router.get(
    "/me",
    response_model=AccountResponse,
    responses={401: {"description": "Sesión inválida o vencida."}},
)
def get_account(claims: TokenClaimsDep, session: SessionDep) -> AccountResponse:
    """Who is signed in: the role, the name and the email of the account in the token."""
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail=SESSION_EXPIRED_DETAIL
    )
    try:
        account_id = UUID(claims["sub"])
        role = claims["rol"]
    except (KeyError, ValueError) as error:
        raise unauthorized from error

    if role == DINER:
        diner = session.get(Diner, account_id)
        if diner is None:
            raise unauthorized
        return AccountResponse(
            rol=DINER, id=diner.id_comensal, nombre=diner.nombre, email=diner.email
        )
    if role == RESTAURANT:
        restaurant = session.get(Restaurant, account_id)
        if restaurant is None:
            raise unauthorized
        return AccountResponse(
            rol=RESTAURANT,
            id=restaurant.id_restaurante,
            nombre=restaurant.nombre,
            email=restaurant.email,
        )
    raise unauthorized
