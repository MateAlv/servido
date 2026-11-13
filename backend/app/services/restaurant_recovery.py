import hashlib
import logging
import secrets
from datetime import UTC, datetime, timedelta
from html import escape

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.password_reset import PasswordResetRequest
from app.models.restaurant import Restaurant
from app.models.restaurant_access import RestaurantPasswordReset
from app.services.auth import hash_password, normalize_email
from app.services.mail import Mail, MailError, send_mail
from app.services.password_recovery import count_request
from app.services.restaurant_verification import send_verification_mail

logger = logging.getLogger(__name__)

LINK_LIFETIME = timedelta(minutes=15)
# Spec 026, edge case: at least 60 seconds between one request and the next.
SECONDS_BETWEEN_REQUESTS = 60


class TooSoonError(Exception):
    """That email asked for a link less than a minute ago (edge case of the spec)."""


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def issue_link(session: Session, restaurant: Restaurant) -> str:
    """Creates the restaurant's link, or replaces it so earlier links stop working (FR-013)."""
    token = secrets.token_urlsafe(32)
    reset = session.scalar(
        select(RestaurantPasswordReset).where(
            RestaurantPasswordReset.restaurant_id == restaurant.id_restaurante
        )
    )
    if reset is None:
        reset = RestaurantPasswordReset(restaurant_id=restaurant.id_restaurante)
        session.add(reset)
    reset.token_hash = hash_token(token)
    reset.expires_at = datetime.now(UTC) + LINK_LIFETIME
    reset.used_at = None
    return token


def find_link(session: Session, token: str) -> RestaurantPasswordReset | None:
    return session.scalar(
        select(RestaurantPasswordReset).where(
            RestaurantPasswordReset.token_hash == hash_token(token)
        )
    )


def change_password(
    session: Session, reset: RestaurantPasswordReset, restaurant: Restaurant, password: str
) -> None:
    """Replaces the password, uses up the link and closes the sessions opened before (FR-012)."""
    now = datetime.now(UTC)
    restaurant.password_hash = hash_password(password)
    restaurant.has_password = True
    restaurant.password_changed_at = now
    reset.used_at = now
    session.commit()


def request_recovery_mail(session: Session, email: str) -> None:
    """Mails a link to the account, if there is one. An unknown email sends nothing (FR-009)."""
    normalized = normalize_email(email)
    now = datetime.now(UTC)
    last_request = session.scalar(
        select(func.max(PasswordResetRequest.requested_at)).where(
            PasswordResetRequest.email == normalized
        )
    )
    if last_request is not None and now - last_request < timedelta(
        seconds=SECONDS_BETWEEN_REQUESTS
    ):
        raise TooSoonError
    # The same table as the diner: the limits count by email, never by role (research R1, R3).
    count_request(session, normalized)
    restaurant = session.scalar(select(Restaurant).where(Restaurant.email == normalized))
    if restaurant is None:
        session.commit()
        return
    if restaurant.email_verified_at is None:
        # Never mail recovery instructions to an address nobody proved: the owner gets the
        # verification link instead, and asking again afterwards sends the recovery one (FR-009).
        session.commit()
        send_verification_mail(session, restaurant)
        return
    token = issue_link(session, restaurant) if restaurant.has_password else None
    session.commit()
    try:
        send_mail(recovery_mail(restaurant, link_for(token) if token else None))
    except MailError:
        # Spec 026: a send failure keeps the neutral answer, so the request reveals nothing.
        logger.exception("Could not send the recovery mail to %s", restaurant.email)


def link_for(token: str) -> str:
    return f"{settings.app_base_url}/restaurante/restablecer?token={token}"


def recovery_mail(restaurant: Restaurant, link: str | None) -> Mail:
    greeting = f"Hola, {restaurant.nombre}"
    subject = "Recuperá la cuenta de tu restaurante en Servido!"
    if link is None:
        text = (
            f"{greeting}:\n\n"
            "Recibimos una solicitud para recuperar el acceso a la cuenta de tu restaurante "
            "en Servido!.\n\n"
            "La cuenta se creó con Google, así que no tiene una contraseña de Servido!: para "
            "ingresar, usá «Ingresar con Google» con esa cuenta de Google.\n\n"
            "Si no pediste esto, ignorá este mail.\n\n"
            "Servido! · Reservá. Pedí. Disfrutá."
        )
        html = f"""<div style="font-family: sans-serif; color: #3b1f18; max-width: 480px">
  <p>{escape(greeting)}:</p>
  <p>Recibimos una solicitud para recuperar el acceso a la cuenta de tu restaurante en
    Servido!.</p>
  <p>La cuenta se creó con Google, así que no tiene una contraseña de Servido!: para ingresar,
    usá <strong>Ingresar con Google</strong> con esa cuenta de Google.</p>
  <p style="color: #6b4a40; font-size: 14px">Si no pediste esto, ignorá este mail.</p>
  <p style="color: #6b4a40; font-size: 14px">Servido! · Reservá. Pedí. Disfrutá.</p>
</div>"""
        return Mail(to=restaurant.email, subject=subject, text=text, html=html)

    text = (
        f"{greeting}:\n\n"
        "Recibimos una solicitud para recuperar el acceso a la cuenta de tu restaurante en "
        "Servido!.\n\n"
        "Para elegir una nueva contraseña, abrí este enlace:\n"
        f"{link}\n\n"
        "El enlace vence en 15 minutos y se puede usar una sola vez. Si no lo pediste, ignorá "
        "este mail: tu contraseña sigue igual.\n\n"
        "Servido! · Reservá. Pedí. Disfrutá."
    )
    html = f"""<div style="font-family: sans-serif; color: #3b1f18; max-width: 480px">
  <p>{escape(greeting)}:</p>
  <p>Recibimos una solicitud para recuperar el acceso a la cuenta de tu restaurante en
    Servido!.</p>
  <p><a href="{escape(link)}" style="display: inline-block; padding: 12px 20px;
    background: #d2441c; color: #ffffff; border-radius: 999px; font-weight: bold;
    text-decoration: none">Elegir nueva contraseña</a></p>
  <p style="color: #6b4a40; font-size: 14px">El enlace vence en 15 minutos y se puede usar una
    sola vez. Si no lo pediste, ignorá este mail: tu contraseña sigue igual.</p>
  <p style="color: #6b4a40; font-size: 14px">Servido! · Reservá. Pedí. Disfrutá.</p>
</div>"""
    return Mail(to=restaurant.email, subject=subject, text=text, html=html)
