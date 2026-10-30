"""Local mode (`make up-local`): sign-up without opening a mail, and demo data to try the app."""

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import Settings, settings
from app.dev_seed import DINER_EMAIL, DISHES, RESTAURANT_EMAIL, seed
from app.models.diner import Diner
from app.models.restaurant import Restaurant
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


def test_local_seed_adds_a_bookable_restaurant_and_a_verified_diner_once(
    client: TestClient, session: Session
) -> None:
    seed(session)
    seed(session)

    restaurant = session.scalar(select(Restaurant).where(Restaurant.email == RESTAURANT_EMAIL))
    detail = client.get(f"/api/restaurants/{restaurant.id_restaurante}")
    assert detail.status_code == 200
    assert len(detail.json()["menu"]) == len(DISHES)
    diner = session.scalar(select(Diner).where(Diner.email == DINER_EMAIL))
    assert diner.email_verified_at is not None
    count = select(func.count()).select_from(Restaurant).where(Restaurant.email == RESTAURANT_EMAIL)
    assert session.scalar(count) == 1
