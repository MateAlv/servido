"""Acceptance tests for spec 003: sign-up (US-2 S5, S6) and sign-in (US-28) with Google."""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import GoogleTokenFactory

GOOGLE_EMAIL = "local@example.com"
VALID_CUIT = "30-71234567-1"


def details(**changes: str) -> dict[str, str]:
    return {
        "nombre": "La Esquina de Palermo",
        "cuit": VALID_CUIT,
        "telefono": "11 5555-4444",
    } | changes


def register_with_google(client: TestClient, credential: str, **changes: str):
    return client.post(
        "/api/restaurantes/google", json={"credential": credential, **details(**changes)}
    )


def sign_in_with_google(client: TestClient, credential: str):
    return client.post("/api/auth/restaurante/google", json={"credential": credential})


def test_us2_s5_google_sign_up_takes_the_email_from_google_and_signs_in(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    response = register_with_google(client, google_token(email="Local@Example.com"))

    assert response.status_code == 201
    body = response.json()
    assert body["restaurante"]["email"] == GOOGLE_EMAIL
    assert body["restaurante"]["cuit"] == "30712345671"
    me = client.get("/api/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.json()["rol"] == "restaurant"
    assert me.json()["nombre"] == "La Esquina de Palermo"


@pytest.mark.parametrize("field", ["nombre", "cuit", "telefono"])
def test_us2_s5_google_sign_up_still_requires_the_restaurant_details(
    client: TestClient, google_token: GoogleTokenFactory, field: str
) -> None:
    response = register_with_google(client, google_token(email=GOOGLE_EMAIL), **{field: ""})

    assert response.status_code == 400
    assert field in {error["loc"][-1] for error in response.json()["detail"]}


def test_us2_s5_google_sign_up_rejects_a_taken_email_or_cuit(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    register_with_google(client, google_token(email=GOOGLE_EMAIL))

    same_email = register_with_google(
        client, google_token(email=GOOGLE_EMAIL), cuit="20-12345678-6"
    )
    same_cuit = register_with_google(client, google_token(email="otro@example.com"))

    assert same_email.status_code == 409
    assert same_cuit.status_code == 409


def test_us2_s6_invalid_google_token_creates_nothing(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    response = register_with_google(client, google_token(email=GOOGLE_EMAIL, email_verified=False))

    assert response.status_code == 401
    assert (
        response.json()["detail"]
        == "No pudimos registrar el restaurante con Google. Probá de nuevo."
    )
    assert sign_in_with_google(client, google_token(email=GOOGLE_EMAIL)).status_code == 404


def test_us28_s2_google_account_with_a_restaurant_signs_in(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    client.post(
        "/api/restaurantes",
        json={**details(), "email": GOOGLE_EMAIL, "password": "Segura123"},
    )

    response = sign_in_with_google(client, google_token(email=GOOGLE_EMAIL))

    assert response.status_code == 200
    assert response.json()["restaurante"]["email"] == GOOGLE_EMAIL
    token = response.json()["access_token"]
    me = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert me.json()["rol"] == "restaurant"


def test_us28_s3_google_account_without_a_restaurant_is_not_found(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    response = sign_in_with_google(client, google_token(email=GOOGLE_EMAIL))

    assert response.status_code == 404
    assert response.json()["detail"] == (
        "No existe una cuenta de restaurante asociada a ese email de Google."
    )
    assert "access_token" not in response.text


def test_us28_s4_invalid_google_token_is_rejected(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    register_with_google(client, google_token(email=GOOGLE_EMAIL))

    response = sign_in_with_google(client, google_token(email=GOOGLE_EMAIL, aud="another-client"))

    assert response.status_code == 401
    assert response.json()["detail"] == "No pudimos ingresar con Google. Probá de nuevo."


def test_us28_edge_diner_with_that_email_does_not_sign_in_as_restaurant(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    client.post("/api/comensales/google", json={"credential": google_token(email=GOOGLE_EMAIL)})

    response = sign_in_with_google(client, google_token(email=GOOGLE_EMAIL))

    assert response.status_code == 404


def test_us2_edge_google_restaurant_has_no_password(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    register_with_google(client, google_token(email=GOOGLE_EMAIL))

    response = client.post(
        "/api/auth/restaurante", json={"email": GOOGLE_EMAIL, "password": "Segura123"}
    )

    assert response.status_code == 401
