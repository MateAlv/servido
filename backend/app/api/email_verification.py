from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from app.api.deps import SESSION_EXPIRED_DETAIL, TokenClaimsDep
from app.db import SessionDep
from app.models.diner import Diner
from app.schemas.auth import MessageResponse, VerificationRequest
from app.services.email_verification import (
    VerificationResult,
    send_verification_mail,
    verify_token,
)
from app.services.roles import DINER

router = APIRouter(tags=["email verification"])

VERIFICATION_MESSAGES = {
    VerificationResult.VERIFIED: "¡Listo! Tu email quedó verificado.",
    VerificationResult.ALREADY_VERIFIED: "Tu email ya estaba verificado.",
}
INVALID_LINK_DETAIL = "No pudimos verificar tu email: el enlace no es válido o venció."


@router.post(
    "/comensales/verificacion",
    response_model=MessageResponse,
    responses={400: {"description": "El enlace no es válido o venció."}},
)
def verify_email(payload: VerificationRequest, session: SessionDep) -> MessageResponse:
    """Verifies a diner's email with the token of the mailed link. It never signs in (FR-011)."""
    result = verify_token(session, payload.token)
    if result is VerificationResult.INVALID:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INVALID_LINK_DETAIL)
    return MessageResponse(detail=VERIFICATION_MESSAGES[result])


@router.post(
    "/comensales/verificacion/reenvio",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        401: {"description": "Sesión inválida o vencida."},
        403: {"description": "La sesión no es de un comensal."},
        409: {"description": "El email ya está verificado."},
    },
)
def resend_verification(claims: TokenClaimsDep, session: SessionDep) -> MessageResponse:
    """Mails the signed-in diner a new link; the previous one stops working (FR-012)."""
    if claims.get("rol") != DINER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Esta acción es solo para comensales."
        )
    try:
        diner = session.get(Diner, UUID(claims["sub"]))
    except (KeyError, ValueError):
        diner = None
    if diner is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=SESSION_EXPIRED_DETAIL)
    if diner.email_verified_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Tu email ya está verificado."
        )
    send_verification_mail(session, diner)
    return MessageResponse(detail="Te enviamos un nuevo mail de verificación.")
