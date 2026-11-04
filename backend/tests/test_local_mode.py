"""Local mode (`make up-local`): sign-up without opening a mail."""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.config import Settings, settings
from app.services import mail


def test_us51_edge_local_mode_verifies_new_diners(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "auto_verify_emails", True)

    response = client.post(
        "/api/comensales",
        json={"nombre": "Local", "email": "local@example.com", "password": "Segura123"},
    )

    assert response.status_code == 201
    assert response.json()["email_verificado"] is True
    assert mail.outbox == []


def test_us51_edge_local_mode_never_runs_with_real_mail() -> None:
    for backend in ("ses", "smtp"):
        with pytest.raises(ValidationError):
            Settings(auto_verify_emails=True, mail_backend=backend)
    assert Settings(auto_verify_emails=True, mail_backend="console").auto_verify_emails
