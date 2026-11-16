import re
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.config import settings

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
PASSWORD_HASHER = PasswordHasher()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def validate_email(email: str) -> bool:
    return bool(EMAIL_PATTERN.fullmatch(normalize_email(email)))


def validate_password(password: str, email: str) -> str | None:
    if not 8 <= len(password) <= 128:
        return "La contraseña debe tener entre 8 y 128 caracteres."
    if not re.search(r"[^\W\d_]", password, flags=re.UNICODE):
        return "La contraseña debe contener al menos una letra."
    if not re.search(r"\d", password):
        return "La contraseña debe contener al menos un número."
    if password == normalize_email(email):
        return "La contraseña no puede ser igual al email."
    return None


def hash_password(password: str) -> str:
    return PASSWORD_HASHER.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return PASSWORD_HASHER.verify(password_hash, password)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False


def create_access_token(
    account_id: str, email: str, role: str, password_changed_at: datetime | None = None
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, object] = {
        "sub": account_id,
        "email": email,
        "rol": role,
        "iat": now,
        "exp": now + timedelta(hours=1),
    }
    # Spec 013: the password's generation. A password change makes it differ, which closes the
    # sessions opened before (FR-011).
    version = password_session_version(password_changed_at)
    if version is not None:
        payload["pwd"] = version
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def password_session_version(password_changed_at: datetime | None) -> int | None:
    """Identifies the password generation of an account. `None` while it never changed."""
    if password_changed_at is None:
        return None
    return int(password_changed_at.timestamp() * 1_000_000)
