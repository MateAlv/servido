from collections.abc import Callable, Iterator
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
import pytest
from alembic import command
from alembic.config import Config
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.config import settings
from app.db import engine, get_session
from app.main import app
from app.services import availability, google, mail
from tests.reservations import NOW


@pytest.fixture(scope="session", autouse=True)
def migrated_database() -> None:
    command.upgrade(Config("alembic.ini"), "head")


@pytest.fixture(autouse=True)
def mail_outbox(monkeypatch: pytest.MonkeyPatch) -> Iterator[list[mail.Mail]]:
    """Every test keeps its mails in memory instead of sending them."""
    monkeypatch.setattr(settings, "mail_backend", "memory")
    monkeypatch.setattr(settings, "app_base_url", "https://servido.test")
    mail.outbox.clear()
    yield mail.outbox
    mail.outbox.clear()


@pytest.fixture
def session() -> Iterator[Session]:
    """A session whose changes are rolled back after each test, even if the code commits."""
    with engine.connect() as connection:
        transaction = connection.begin()
        session = Session(bind=connection, join_transaction_mode="create_savepoint")
        try:
            yield session
        finally:
            session.close()
            transaction.rollback()


@pytest.fixture
def client(session: Session) -> Iterator[TestClient]:
    app.dependency_overrides[get_session] = lambda: session
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


GOOGLE_TEST_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
GoogleTokenFactory = Callable[..., str]


@pytest.fixture
def google_token(monkeypatch: pytest.MonkeyPatch) -> GoogleTokenFactory:
    """Signs Google-like ID tokens with a local key that the API trusts instead of Google's."""
    monkeypatch.setattr(google, "google_signing_key", lambda _token: GOOGLE_TEST_KEY.public_key())

    def sign(key: Any = GOOGLE_TEST_KEY, **claims: Any) -> str:
        now = datetime.now(UTC)
        payload = {
            "iss": "https://accounts.google.com",
            "aud": settings.google_client_id,
            "sub": "1234567890",
            "email": "comensal@example.com",
            "email_verified": True,
            "name": "Comensal",
            "iat": now,
            "exp": now + timedelta(hours=1),
            **claims,
        }
        return jwt.encode(payload, key, algorithm="RS256", headers={"kid": "test"})

    return sign


@pytest.fixture(autouse=True)
def fixed_now(monkeypatch: pytest.MonkeyPatch) -> None:
    """Reservations depend on the clock: every test runs on Monday 2 November 2026, 09:00 in
    Buenos Aires (tests/reservations.py)."""
    monkeypatch.setattr(availability, "current_time", lambda: NOW)
