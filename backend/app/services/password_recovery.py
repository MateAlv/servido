import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from enum import Enum
from html import escape

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models.diner import Diner
from app.models.password_reset import PasswordReset, PasswordResetRequest
from app.services.auth import hash_password, normalize_email
from app.services.mail import Mail, send_mail

LINK_LIFETIME = timedelta(minutes=15)
REQUEST_WINDOW = timedelta(minutes=30)
MAX_REQUESTS_PER_WINDOW = 5


class TooManyRequestsError(Exception):
    """An email asked for more links than the window allows (FR-012)."""


class LinkState(Enum):
    VALID = "valid"
    USED = "used"
    EXPIRED = "expired"
    INVALID = "invalid"


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def count_request(session: Session, email: str) -> None:
    """Counts one request for the email, or refuses it when the window is full (FR-012).

    The rows older than the window are deleted first, so the count is over the last 30 minutes
    and the table never grows; there is no cleanup job.
    """
    now = datetime.now(UTC)
    session.execute(
        delete(PasswordResetRequest).where(
            PasswordResetRequest.email == email,
            PasswordResetRequest.requested_at <= now - REQUEST_WINDOW,
        )
    )
    recent = session.scalar(
        select(func.count())
        .select_from(PasswordResetRequest)
        .where(PasswordResetRequest.email == email)
    )
    if recent is not None and recent >= MAX_REQUESTS_PER_WINDOW:
        raise TooManyRequestsError
    session.add(PasswordResetRequest(email=email, requested_at=now))


def issue_link(session: Session, diner: Diner) -> str:
    """Creates the diner's link, or replaces it so that earlier links stop working (FR-010)."""
    token = secrets.token_urlsafe(32)
    reset = session.scalar(select(PasswordReset).where(PasswordReset.diner_id == diner.id_comensal))
    if reset is None:
        reset = PasswordReset(diner_id=diner.id_comensal)
        session.add(reset)
    reset.token_hash = hash_token(token)
    reset.expires_at = datetime.now(UTC) + LINK_LIFETIME
    reset.used_at = None
    return token


def find_link(session: Session, token: str) -> PasswordReset | None:
    return session.scalar(
        select(PasswordReset).where(PasswordReset.token_hash == hash_token(token))
    )


def link_state(reset: PasswordReset | None) -> LinkState:
    """Whether a link can be used: unknown, already used, expired, or ready (FR-007, FR-008)."""
    if reset is None:
        return LinkState.INVALID
    if reset.used_at is not None:
        return LinkState.USED
    if reset.expires_at <= datetime.now(UTC):
        return LinkState.EXPIRED
    return LinkState.VALID


def change_password(session: Session, reset: PasswordReset, diner: Diner, password: str) -> None:
    """Replaces the password, uses up the link and closes the sessions opened before (FR-011)."""
    now = datetime.now(UTC)
    diner.password_hash = hash_password(password)
    diner.has_password = True
    diner.password_changed_at = now
    reset.used_at = now
    session.commit()


def request_recovery_mail(session: Session, email: str) -> None:
    """Mails a link to the account, if there is one. An unknown email sends nothing (FR-003)."""
    normalized = normalize_email(email)
    count_request(session, normalized)
    diner = session.scalar(select(Diner).where(Diner.email == normalized))
    if diner is None:
        session.commit()
        return
    token = issue_link(session, diner) if diner.has_password else None
    session.commit()
    # A failure here propagates as MailError: the diner has to know the mail didn't leave (R9).
    send_mail(recovery_mail(diner, link_for(token) if token else None))


def link_for(token: str) -> str:
    return f"{settings.app_base_url}/restablecer?token={token}"


def recovery_mail(diner: Diner, link: str | None) -> Mail:
    greeting = f"Hola, {diner.nombre}" if diner.nombre else "Hola"
    if link is None:
        text = (
            f"{greeting}:\n\n"
            "Recibimos una solicitud para recuperar el acceso a tu cuenta de Servido!.\n\n"
            "Tu cuenta se creó con Google, así que no tiene una contraseña de Servido!: para "
            "ingresar, usá «Ingresar con Google» con tu cuenta de Google.\n\n"
            "Si no pediste esto, ignorá este mail.\n\n"
            "Servido! · Reservá. Pedí. Disfrutá."
        )
        html = f"""<div style="font-family: sans-serif; color: #3b1f18; max-width: 480px">
  <p>{escape(greeting)}:</p>
  <p>Recibimos una solicitud para recuperar el acceso a tu cuenta de Servido!.</p>
  <p>Tu cuenta se creó con Google, así que no tiene una contraseña de Servido!: para ingresar,
    usá <strong>Ingresar con Google</strong> con tu cuenta de Google.</p>
  <p style="color: #6b4a40; font-size: 14px">Si no pediste esto, ignorá este mail.</p>
  <p style="color: #6b4a40; font-size: 14px">Servido! · Reservá. Pedí. Disfrutá.</p>
</div>"""
        return Mail(to=diner.email, subject="Recuperá tu cuenta de Servido!", text=text, html=html)

    text = (
        f"{greeting}:\n\n"
        "Recibimos una solicitud para recuperar el acceso a tu cuenta de Servido!.\n\n"
        "Para elegir una nueva contraseña, abrí este enlace:\n"
        f"{link}\n\n"
        "El enlace vence en 15 minutos y se puede usar una sola vez. Si no lo pediste, ignorá "
        "este mail: tu contraseña sigue igual.\n\n"
        "Servido! · Reservá. Pedí. Disfrutá."
    )
    html = f"""<div style="font-family: sans-serif; color: #3b1f18; max-width: 480px">
  <p>{escape(greeting)}:</p>
  <p>Recibimos una solicitud para recuperar el acceso a tu cuenta de Servido!.</p>
  <p><a href="{escape(link)}" style="display: inline-block; padding: 12px 20px;
    background: #d2441c; color: #ffffff; border-radius: 999px; font-weight: bold;
    text-decoration: none">Elegir nueva contraseña</a></p>
  <p style="color: #6b4a40; font-size: 14px">El enlace vence en 15 minutos y se puede usar una
    sola vez. Si no lo pediste, ignorá este mail: tu contraseña sigue igual.</p>
  <p style="color: #6b4a40; font-size: 14px">Servido! · Reservá. Pedí. Disfrutá.</p>
</div>"""
    return Mail(to=diner.email, subject="Recuperá tu cuenta de Servido!", text=text, html=html)
