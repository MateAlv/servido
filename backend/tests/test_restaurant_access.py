"""Acceptance tests for spec 003: restaurant sign-up (US-2) and login (US-4)."""

import jwt
import pytest
from fastapi.testclient import TestClient

from app.config import settings

VALID_CUIT = "30-71234567-1"


def restaurant_payload(**changes: str) -> dict[str, str]:
    payload = {
        "nombre": "La Esquina de Palermo",
        "email": "local@example.com",
        "cuit": VALID_CUIT,
        "telefono": "11 5555-4444",
        "password": "Segura123",
    }
    return {**payload, **changes}


def fields_with_errors(response) -> set[str]:
    return {error["loc"][-1] for error in response.json()["detail"]}


@pytest.mark.parametrize("field", ["email", "cuit", "telefono"])
def test_us2_s1_missing_required_field_is_rejected(client: TestClient, field: str) -> None:
    response = client.post("/api/restaurantes", json=restaurant_payload(**{field: ""}))

    assert response.status_code == 400
    assert field in fields_with_errors(response)


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("email", "no-es-un-email"),
        ("cuit", "123"),
        ("cuit", "30-71234567-2"),  # right length, wrong verifier digit
    ],
)
def test_us2_s1_invalid_email_or_cuit_says_what_to_fix(
    client: TestClient, field: str, value: str
) -> None:
    response = client.post("/api/restaurantes", json=restaurant_payload(**{field: value}))

    assert response.status_code == 400
    assert fields_with_errors(response) == {field}
    assert (
        client.post(
            "/api/auth/restaurante", json={"email": "local@example.com", "password": "Segura123"}
        ).status_code
        == 401
    )


@pytest.mark.parametrize(
    "duplicate",
    [
        {"cuit": "20-12345678-6"},  # same email, another CUIT
        {"email": "otro@example.com"},  # same CUIT, another email
    ],
)
def test_us2_s2_duplicate_email_or_cuit_is_rejected(
    client: TestClient, duplicate: dict[str, str]
) -> None:
    assert client.post("/api/restaurantes", json=restaurant_payload()).status_code == 201

    response = client.post("/api/restaurantes", json=restaurant_payload(**duplicate))

    assert response.status_code == 409
    assert response.json()["detail"] == (
        "Ya existe una cuenta de restaurante asociada a ese email o CUIT."
    )


def test_us2_s3_valid_data_creates_the_account_without_exposing_the_password(
    client: TestClient,
) -> None:
    response = client.post("/api/restaurantes", json=restaurant_payload())

    assert response.status_code == 201
    body = response.json()
    assert body["nombre"] == "La Esquina de Palermo"
    assert body["cuit"] == "30712345671"
    assert "password" not in response.text
    assert "Segura123" not in response.text


def test_us4_s1_wrong_credentials_use_the_same_generic_message(client: TestClient) -> None:
    client.post("/api/restaurantes", json=restaurant_payload())

    wrong_password = client.post(
        "/api/auth/restaurante", json={"email": "local@example.com", "password": "Incorrecta123"}
    )
    unknown_email = client.post(
        "/api/auth/restaurante", json={"email": "nadie@example.com", "password": "Segura123"}
    )

    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json() == {"detail": "Credenciales inválidas"}


def test_us4_s2_valid_login_opens_a_restaurant_session(client: TestClient) -> None:
    client.post("/api/restaurantes", json=restaurant_payload())

    response = client.post(
        "/api/auth/restaurante", json={"email": "local@example.com", "password": "Segura123"}
    )
    token = response.json()["access_token"]
    me = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200
    assert jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])["exp"]
    # The frontend opens the restaurant panel for this role (HomePage.test.tsx).
    assert me.status_code == 200
    assert me.json()["rol"] == "restaurant"
    assert me.json()["nombre"] == "La Esquina de Palermo"


def test_us4_edge_restaurant_credentials_do_not_open_a_diner_session(
    client: TestClient,
) -> None:
    client.post("/api/restaurantes", json=restaurant_payload())

    response = client.post(
        "/api/auth/comensal", json={"email": "local@example.com", "password": "Segura123"}
    )

    assert response.status_code == 401
