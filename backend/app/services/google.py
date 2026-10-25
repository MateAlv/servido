from typing import Any

import jwt
from jwt import PyJWKClient

from app.config import settings

GOOGLE_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUERS = ("accounts.google.com", "https://accounts.google.com")

# Keeps Google's public keys in memory and refetches them when a token names an unknown key.
_google_keys = PyJWKClient(GOOGLE_CERTS_URL)


class InvalidGoogleTokenError(Exception):
    """The ID token is not a valid Google sign-in for this app."""


def google_signing_key(token: str) -> Any:
    return _google_keys.get_signing_key_from_jwt(token).key


def verify_google_id_token(token: str) -> dict[str, Any]:
    """Claims of a Google ID token issued to our client for a verified email (research R2)."""
    try:
        claims: dict[str, Any] = jwt.decode(
            token,
            google_signing_key(token),
            algorithms=["RS256"],
            audience=settings.google_client_id,
            issuer=GOOGLE_ISSUERS,
            options={"require": ["exp", "iss", "aud", "email"]},
        )
    except jwt.PyJWTError as error:
        raise InvalidGoogleTokenError from error
    if claims.get("email_verified") is not True:
        raise InvalidGoogleTokenError
    return claims
