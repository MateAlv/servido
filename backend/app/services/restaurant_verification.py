import hashlib
import logging
import secrets
from datetime import UTC, datetime, timedelta
from html import escape

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.restaurant import Restaurant
from app.models.restaurant_access import RestaurantEmailVerification
from app.services.email_verification import VerificationResult
from app.services.mail import Mail, MailError, send_mail

logger = logging.getLogger(__name__)

LINK_LIFETIME = timedelta(hours=24)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def issue_link(session: Session, restaurant: Restaurant) -> str:
    """Creates the restaurant's link, or replaces it so that earlier links stop working (FR-004)."""
    token = secrets.token_urlsafe(32)
    verification = session.scalar(
        select(RestaurantEmailVerification).where(
            RestaurantEmailVerification.restaurant_id == restaurant.id_restaurante
        )
    )
    if verification is None:
        verification = RestaurantEmailVerification(restaurant_id=restaurant.id_restaurante)
        session.add(verification)
    verification.token_hash = hash_token(token)
    verification.expires_at = datetime.now(UTC) + LINK_LIFETIME
    verification.used_at = None
    session.commit()
    return token


def verification_mail(restaurant: Restaurant, link: str) -> Mail:
    greeting = f"Hola, {restaurant.nombre}"
    text = (
        f"{greeting}:\n\n"
        "Para terminar de crear la cuenta de tu restaurante en Servido!, verificá su email "
        f"con este enlace:\n{link}\n\n"
        "Mientras no lo verifiques, tu restaurante no aparece en el mapa ni puede recibir "
        "reservas. El enlace vence en 24 horas. Si no creaste una cuenta en Servido!, ignorá "
        "este mail.\n\n"
        "Servido! · Reservá. Pedí. Disfrutá."
    )
    html = f"""<div style="font-family: sans-serif; color: #3b1f18; max-width: 480px">
  <p>{escape(greeting)}:</p>
  <p>Para terminar de crear la cuenta de tu restaurante en Servido!, verificá su email:</p>
  <p><a href="{escape(link)}" style="display: inline-block; padding: 12px 20px;
    background: #d2441c; color: #ffffff; border-radius: 999px; font-weight: bold;
    text-decoration: none">Verificar mi email</a></p>
  <p style="color: #6b4a40; font-size: 14px">Mientras no lo verifiques, tu restaurante no
    aparece en el mapa ni puede recibir reservas. El enlace vence en 24 horas. Si no creaste
    una cuenta en Servido!, ignorá este mail.</p>
  <p style="color: #6b4a40; font-size: 14px">Servido! · Reservá. Pedí. Disfrutá.</p>
</div>"""
    return Mail(
        to=restaurant.email,
        subject="Verificá el email de tu restaurante en Servido!",
        text=text,
        html=html,
    )


def send_verification_mail(session: Session, restaurant: Restaurant) -> None:
    """Mails a new link. A failed send is logged: the account stays, and it can resend."""
    token = issue_link(session, restaurant)
    link = f"{settings.app_base_url}/restaurante/verificar-email?token={token}"
    try:
        send_mail(verification_mail(restaurant, link))
    except MailError:
        logger.exception("Could not send the verification mail to %s", restaurant.email)


def mark_verified(restaurant: Restaurant) -> None:
    if restaurant.email_verified_at is None:
        restaurant.email_verified_at = datetime.now(UTC)


def verify_token(session: Session, token: str) -> VerificationResult:
    verification = session.scalar(
        select(RestaurantEmailVerification).where(
            RestaurantEmailVerification.token_hash == hash_token(token)
        )
    )
    if verification is None:
        return VerificationResult.INVALID
    if verification.used_at is not None:
        return VerificationResult.ALREADY_VERIFIED
    now = datetime.now(UTC)
    if verification.expires_at <= now:
        return VerificationResult.INVALID
    restaurant = session.get(Restaurant, verification.restaurant_id)
    if restaurant is None:
        return VerificationResult.INVALID
    verification.used_at = now
    mark_verified(restaurant)
    session.commit()
    return VerificationResult.VERIFIED
