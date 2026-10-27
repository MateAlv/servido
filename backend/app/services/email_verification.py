import hashlib
import logging
import secrets
from datetime import UTC, datetime, timedelta
from enum import Enum
from html import escape

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.diner import Diner
from app.models.email_verification import EmailVerification
from app.services.mail import Mail, MailError, send_mail

logger = logging.getLogger(__name__)

LINK_LIFETIME = timedelta(hours=24)


class VerificationResult(Enum):
    VERIFIED = "verified"
    ALREADY_VERIFIED = "already_verified"
    INVALID = "invalid"


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def issue_link(session: Session, diner: Diner) -> str:
    """Creates the diner's link, or replaces it so that earlier links stop working (FR-012)."""
    token = secrets.token_urlsafe(32)
    verification = session.scalar(
        select(EmailVerification).where(EmailVerification.diner_id == diner.id_comensal)
    )
    if verification is None:
        verification = EmailVerification(diner_id=diner.id_comensal)
        session.add(verification)
    verification.token_hash = hash_token(token)
    verification.expires_at = datetime.now(UTC) + LINK_LIFETIME
    verification.used_at = None
    session.commit()
    return token


def verification_mail(diner: Diner, link: str) -> Mail:
    greeting = f"Hola, {diner.nombre}" if diner.nombre else "Hola"
    text = (
        f"{greeting}:\n\n"
        "Para terminar de crear tu cuenta en Servido!, verificá tu email con este enlace:\n"
        f"{link}\n\n"
        "El enlace vence en 24 horas. Si no creaste una cuenta en Servido!, ignorá este mail.\n\n"
        "Servido! · Reservá. Pedí. Disfrutá."
    )
    html = f"""<div style="font-family: sans-serif; color: #3b1f18; max-width: 480px">
  <p>{escape(greeting)}:</p>
  <p>Para terminar de crear tu cuenta en Servido!, verificá tu email:</p>
  <p><a href="{escape(link)}" style="display: inline-block; padding: 12px 20px;
    background: #d2441c; color: #ffffff; border-radius: 999px; font-weight: bold;
    text-decoration: none">Verificar mi email</a></p>
  <p style="color: #6b4a40; font-size: 14px">El enlace vence en 24 horas. Si no creaste
    una cuenta en Servido!, ignorá este mail.</p>
  <p style="color: #6b4a40; font-size: 14px">Servido! · Reservá. Pedí. Disfrutá.</p>
</div>"""
    return Mail(to=diner.email, subject="Verificá tu email en Servido!", text=text, html=html)


def send_verification_mail(session: Session, diner: Diner) -> None:
    """Mails a new link. A failed send is logged: the account stays, and the diner can resend."""
    token = issue_link(session, diner)
    link = f"{settings.app_base_url}/verificar-email?token={token}"
    try:
        send_mail(verification_mail(diner, link))
    except MailError:
        logger.exception("Could not send the verification mail to %s", diner.email)


def mark_verified(diner: Diner) -> None:
    if diner.email_verified_at is None:
        diner.email_verified_at = datetime.now(UTC)


def verify_token(session: Session, token: str) -> VerificationResult:
    verification = session.scalar(
        select(EmailVerification).where(EmailVerification.token_hash == hash_token(token))
    )
    if verification is None:
        return VerificationResult.INVALID
    if verification.used_at is not None:
        return VerificationResult.ALREADY_VERIFIED
    now = datetime.now(UTC)
    if verification.expires_at <= now:
        return VerificationResult.INVALID
    diner = session.get(Diner, verification.diner_id)
    if diner is None:
        return VerificationResult.INVALID
    verification.used_at = now
    mark_verified(diner)
    session.commit()
    return VerificationResult.VERIFIED
