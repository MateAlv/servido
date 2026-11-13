from fastapi import APIRouter, HTTPException, status

from app.api.deps import TokenClaimsDep
from app.api.restaurant import restaurant_from_claims
from app.db import SessionDep
from app.schemas.auth import MessageResponse, VerificationRequest
from app.services.restaurant_verification import (
    VerificationResult,
    send_verification_mail,
    verify_token,
)

router = APIRouter(tags=["restaurant verification"])

VERIFICATION_MESSAGES = {
    VerificationResult.VERIFIED: "¡Listo! Tu email quedó verificado.",
    VerificationResult.ALREADY_VERIFIED: "Tu email ya estaba verificado.",
}
INVALID_LINK_DETAIL = "No pudimos verificar tu email: el enlace no es válido o venció."


@router.post(
    "/restaurantes/verificacion",
    response_model=MessageResponse,
    responses={400: {"description": "El enlace no es válido o venció."}},
)
def verify_restaurant_email(payload: VerificationRequest, session: SessionDep) -> MessageResponse:
    """Verifies a restaurant's email with the token of the mailed link (FR-002)."""
    result = verify_token(session, payload.token)
    if result is VerificationResult.INVALID:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INVALID_LINK_DETAIL)
    return MessageResponse(detail=VERIFICATION_MESSAGES[result])


@router.post(
    "/restaurantes/verificacion/reenvio",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        401: {"description": "Sesión inválida o vencida."},
        403: {"description": "La sesión no es de un restaurante."},
        409: {"description": "El email ya está verificado."},
    },
)
def resend_restaurant_verification(claims: TokenClaimsDep, session: SessionDep) -> MessageResponse:
    """Mails the signed-in restaurant a new link; the previous one stops working (FR-004)."""
    restaurant = restaurant_from_claims(claims, session)
    if restaurant.email_verified_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Tu email ya está verificado."
        )
    send_verification_mail(session, restaurant)
    return MessageResponse(detail="Te enviamos un nuevo mail de verificación.")
