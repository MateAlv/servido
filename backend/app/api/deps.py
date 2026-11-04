from typing import Annotated, Any
from uuid import UUID

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.db import SessionDep
from app.models.diner import Diner
from app.services.roles import DINER

bearer_scheme = HTTPBearer(auto_error=False)

SESSION_EXPIRED_DETAIL = "Tu sesión no es válida o venció. Volvé a ingresar."
DINERS_ONLY = "Esta acción es solo para comensales."


def get_token_claims(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, Any]:
    """Returns the claims of a valid access token; otherwise answers 401."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=SESSION_EXPIRED_DETAIL)
    try:
        return jwt.decode(credentials.credentials, settings.jwt_secret, algorithms=["HS256"])
    except jwt.InvalidTokenError as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=SESSION_EXPIRED_DETAIL
        ) from error


TokenClaimsDep = Annotated[dict[str, Any], Depends(get_token_claims)]


def require_diner(claims: TokenClaimsDep, session: SessionDep) -> UUID:
    if claims.get("rol") != DINER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=DINERS_ONLY)
    diner_id = UUID(str(claims["sub"]))
    # A token can outlive its account: treat it as an expired session.
    if session.get(Diner, diner_id) is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=SESSION_EXPIRED_DETAIL)
    return diner_id
