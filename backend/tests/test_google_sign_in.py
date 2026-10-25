"""Acceptance tests for spec 007, US-52: sign in with Google."""

from datetime import UTC, datetime, timedelta

import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from tests.conftest import GoogleTokenFactory

GOOGLE_EMAIL = "comensal@example.com"


def register_diner(client: TestClient, email: str = GOOGLE_EMAIL) -> None:
    response = client.post(
        "/api/comensales", json={"nombre": "Martín", "email": email, "password": "Segura123"}
    )
    assert response.status_code == 201


def sign_in_with_google(client: TestClient, credential: str):
    return client.post("/api/auth/comensal/google", json={"credential": credential})


def test_us52_s2_google_account_with_a_diner_signs_in(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    register_diner(client)

    response = sign_in_with_google(client, google_token())

    assert response.status_code == 200
    body = response.json()
    assert body["comensal"]["email"] == GOOGLE_EMAIL
    me = client.get("/api/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.json()["rol"] == "diner"
    assert me.json()["nombre"] == "Martín"


def test_us52_s2_google_email_matches_regardless_of_case(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    register_diner(client)

    response = sign_in_with_google(client, google_token(email="Comensal@Example.com"))

    assert response.status_code == 200


def test_us52_s3_google_account_without_a_diner_is_not_found(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    response = sign_in_with_google(client, google_token(email="nadie@example.com"))

    assert response.status_code == 404
    assert response.json()["detail"] == (
        "No existe una cuenta de Servido! asociada a ese email de Google."
    )
    assert "access_token" not in response.text


@pytest.mark.parametrize(
    "claims",
    [
        {"aud": "another-client.apps.googleusercontent.com"},
        {"iss": "https://evil.example.com"},
        {"exp": datetime.now(UTC) - timedelta(minutes=5)},
        {"email_verified": False},
        {"key": rsa.generate_private_key(public_exponent=65537, key_size=2048)},
    ],
    ids=["another-audience", "another-issuer", "expired", "unverified-email", "forged-signature"],
)
def test_us52_s4_invalid_google_token_is_rejected(
    client: TestClient, google_token: GoogleTokenFactory, claims: dict
) -> None:
    register_diner(client)

    response = sign_in_with_google(client, google_token(**claims))

    assert response.status_code == 401
    assert response.json()["detail"] == "No pudimos ingresar con Google. Probá de nuevo."
    assert "access_token" not in response.text


def test_us52_s4_garbage_credential_is_rejected(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    assert sign_in_with_google(client, "not-a-token").status_code == 401
    assert sign_in_with_google(client, "").status_code == 400


def test_us52_edge_restaurant_email_does_not_sign_in(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    client.post(
        "/api/restaurantes",
        json={
            "nombre": "La Esquina",
            "email": GOOGLE_EMAIL,
            "cuit": "30-71234567-1",
            "telefono": "11 5555-4444",
            "password": "Segura123",
        },
    )

    response = sign_in_with_google(client, google_token())

    assert response.status_code == 404


def test_us52_s5_google_sign_in_verifies_the_account(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    register_diner(client)

    response = sign_in_with_google(client, google_token())

    assert response.json()["comensal"]["email_verificado"] is True
    token = response.json()["access_token"]
    me = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["email_verificado"] is True


def test_us52_edge_rejected_token_logs_why(
    client: TestClient, google_token: GoogleTokenFactory, caplog: pytest.LogCaptureFixture
) -> None:
    sign_in_with_google(client, google_token(email="alguien@hotmail.com", email_verified=False))
    sign_in_with_google(client, google_token(aud="another-client.apps.googleusercontent.com"))

    assert "Google hasn't verified the @hotmail.com email" in caplog.text
    assert "Audience doesn't match" in caplog.text
