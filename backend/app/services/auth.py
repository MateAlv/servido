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


def create_access_token(account_id: str, email: str, role: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": account_id,
        "email": email,
        "rol": role,
        "iat": now,
        "exp": now + timedelta(hours=1),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
