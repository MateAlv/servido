from fastapi import APIRouter, HTTPException, status

from app.db import SessionDep
from app.models.restaurant import Restaurant
from app.schemas.auth import (
    MessageResponse,
    PasswordResetRequest,
    RecoveryLinkRequest,
    RecoveryRequest,
)
from app.services.auth import validate_password
from app.services.password_recovery import LinkState, TooManyRequestsError, link_state
from app.services.restaurant_recovery import (
    TooSoonError,
    change_password,
    find_link,
    request_recovery_mail,
)

router = APIRouter(tags=["restaurant recovery"])

RECOVERY_SENT_DETAIL = (
    "Si existe una cuenta asociada a ese email, te enviamos un correo con instrucciones."
)
TOO_SOON_DETAIL = "Esperá un minuto antes de pedir otro link."
TOO_MANY_DETAIL = "Pediste demasiados links. Esperá unos minutos y probá de nuevo."
LINK_IS_VALID_DETAIL = "El link es válido. Elegí tu nueva contraseña."
LINK_INVALID_DETAIL = "Ese link no es válido. Pedí uno nuevo."
LINK_MESSAGES = {
    LinkState.USED: "Ese link ya se usó para cambiar la contraseña. Pedí uno nuevo.",
    LinkState.EXPIRED: "Ese link venció. Pedí uno nuevo.",
}
PASSWORD_CHANGED_DETAIL = "¡Listo! Tu contraseña quedó actualizada. Ya podés ingresar."


def link_error(state: LinkState) -> HTTPException:
    """The 400 for a link that can't be used, saying why (S7)."""
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=LINK_MESSAGES.get(state, LINK_INVALID_DETAIL),
    )


@router.post(
    "/restaurantes/recuperacion",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={
        400: {"description": "El email no tiene un formato válido."},
        429: {"description": "Un minuto entre pedidos, o demasiadas solicitudes."},
    },
)
def request_restaurant_recovery(payload: RecoveryRequest, session: SessionDep) -> MessageResponse:
    """Mails a recovery link if the email has an account. The answer is the same either way."""
    try:
        request_recovery_mail(session, payload.email)
    except TooSoonError as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=TOO_SOON_DETAIL
        ) from error
    except TooManyRequestsError as error:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=TOO_MANY_DETAIL
        ) from error
    return MessageResponse(detail=RECOVERY_SENT_DETAIL)


@router.post(
    "/restaurantes/recuperacion/validacion",
    response_model=MessageResponse,
    responses={400: {"description": "El link ya se usó, venció o no existe."}},
)
def check_restaurant_recovery_link(
    payload: RecoveryLinkRequest, session: SessionDep
) -> MessageResponse:
    """Checks the link before showing the form. It does not use the link up."""
    state = link_state(find_link(session, payload.token))
    if state is not LinkState.VALID:
        raise link_error(state)
    return MessageResponse(detail=LINK_IS_VALID_DETAIL)


@router.put(
    "/restaurantes/recuperacion",
    response_model=MessageResponse,
    responses={
        400: {"description": "El link no se puede usar, o la contraseña no cumple los requisitos."}
    },
)
def reset_restaurant_password(
    payload: PasswordResetRequest, session: SessionDep
) -> MessageResponse:
    """Sets the new password with the token of the link. It never signs in (S3)."""
    reset = find_link(session, payload.token)
    state = link_state(reset)
    if reset is None or state is not LinkState.VALID:
        raise link_error(state)
    restaurant = session.get(Restaurant, reset.restaurant_id)
    if restaurant is None:
        raise link_error(LinkState.INVALID)
    error = validate_password(payload.password, restaurant.email)
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    change_password(session, reset, restaurant, payload.password)
    return MessageResponse(detail=PASSWORD_CHANGED_DETAIL)
