"""Acceptance tests for spec 007, US-58: create the diner account with Google."""

from fastapi.testclient import TestClient

from app.services.mail import Mail
from tests.conftest import GoogleTokenFactory

GOOGLE_EMAIL = "nueva@example.com"


def sign_up_with_google(client: TestClient, credential: str, **extra: str):
    return client.post("/api/comensales/google", json={"credential": credential, **extra})


def test_us58_s2_google_account_creates_a_verified_diner(
    client: TestClient, google_token: GoogleTokenFactory, mail_outbox: list[Mail]
) -> None:
    response = sign_up_with_google(client, google_token(email="Nueva@Example.com", name="Lucía"))

    assert response.status_code == 201
    body = response.json()
    assert body["comensal"]["email"] == GOOGLE_EMAIL
    assert body["comensal"]["nombre"] == "Lucía"
    assert body["comensal"]["email_verificado"] is True
    me = client.get("/api/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.json()["rol"] == "diner"
    assert me.json()["email_verificado"] is True
    assert mail_outbox == []


def test_us58_s3_missing_name_is_asked_for(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    credential = google_token(email=GOOGLE_EMAIL, name=None)

    asked = sign_up_with_google(client, credential)
    created = sign_up_with_google(client, credential, nombre="  Lucía  ")

    assert asked.status_code == 400
    assert asked.json()["detail"] == "Ingresá tu nombre para terminar de crear tu cuenta."
    assert created.status_code == 201
    assert created.json()["comensal"]["nombre"] == "Lucía"


def test_us58_s4_invalid_google_token_creates_nothing(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    response = sign_up_with_google(client, google_token(email=GOOGLE_EMAIL, email_verified=False))

    assert response.status_code == 401
    assert response.json()["detail"] == "No pudimos crear tu cuenta con Google. Probá de nuevo."
    google_login = client.post(
        "/api/auth/comensal/google", json={"credential": google_token(email=GOOGLE_EMAIL)}
    )
    assert google_login.status_code == 404


def test_us58_s5_existing_email_is_not_registered_again(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    client.post(
        "/api/comensales",
        json={"nombre": "Martín", "email": GOOGLE_EMAIL, "password": "Segura123"},
    )

    response = sign_up_with_google(client, google_token(email=GOOGLE_EMAIL))

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "Ya existe una cuenta de Servido! con ese email. Ingresá con Google."
    )


def test_us58_edge_google_account_has_no_password(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    sign_up_with_google(client, google_token(email=GOOGLE_EMAIL))

    response = client.post(
        "/api/auth/comensal", json={"email": GOOGLE_EMAIL, "password": "Segura123"}
    )

    assert response.status_code == 401


def test_us58_edge_long_google_name_is_cut(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    response = sign_up_with_google(client, google_token(email=GOOGLE_EMAIL, name="L" * 80))

    assert response.json()["comensal"]["nombre"] == "L" * 60
