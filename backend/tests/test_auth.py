from datetime import UTC, datetime

import jwt
from fastapi.testclient import TestClient

from app.config import settings


def registration_payload(
    email: str = "comensal@example.com", password: str = "Segura123"
) -> dict[str, str]:
    return {"email": email, "password": password}


def test_us1_s1_registration_form_accepts_required_fields(client: TestClient) -> None:
    response = client.post("/api/comensales", json=registration_payload())
    assert response.status_code == 201
    assert response.json()["email"] == "comensal@example.com"


def test_us1_s2_empty_registration_fields_are_rejected(client: TestClient) -> None:
    response = client.post("/api/comensales", json={"email": "", "password": ""})
    assert response.status_code == 400
    assert response.json()["detail"]


def test_us1_s3_invalid_registration_reports_what_to_correct(client: TestClient) -> None:
    response = client.post(
        "/api/comensales",
        json=registration_payload(email="not-an-email", password="1234567"),
    )
    assert response.status_code == 400
    assert response.json()["detail"]


def test_us1_s4_valid_registration_creates_one_account(client: TestClient) -> None:
    response = client.post("/api/comensales", json=registration_payload())
    assert response.status_code == 201
    assert "password" not in response.text
    assert "password_hash" not in response.text


def test_us1_edge_duplicate_email_is_rejected(client: TestClient) -> None:
    payload = registration_payload()
    assert client.post("/api/comensales", json=payload).status_code == 201
    duplicate = client.post("/api/comensales", json=payload)
    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Ya existe una cuenta asociada a ese email."


def test_us1_edge_password_of_exactly_7_characters_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/comensales",
        json=registration_payload(password="a123456"),
    )
    assert response.status_code == 400


def test_us1_edge_password_of_exactly_129_characters_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/api/comensales",
        json=registration_payload(password="a1" + "x" * 127),
    )
    assert response.status_code == 400


def test_us1_edge_password_boundaries_are_accepted(client: TestClient) -> None:
    for index, password in enumerate(("a1" + "x" * 6, "a1" + "x" * 126)):
        response = client.post(
            "/api/comensales",
            json=registration_payload(email=f"comensal{index}@example.com", password=password),
        )
        assert response.status_code == 201


def test_us1_edge_email_is_normalized(client: TestClient) -> None:
    response = client.post(
        "/api/comensales",
        json=registration_payload(email="  Comensal@Example.COM  "),
    )
    assert response.status_code == 201
    assert response.json()["email"] == "comensal@example.com"


def test_us1_edge_password_must_differ_from_email(client: TestClient) -> None:
    response = client.post(
        "/api/comensales",
        json=registration_payload(email="comensal@example.com", password="comensal@example.com"),
    )
    assert response.status_code == 400


def test_us3_s1_login_requests_credentials(client: TestClient) -> None:
    client.post("/api/comensales", json=registration_payload())
    response = client.post("/api/auth/comensal", json=registration_payload())
    assert response.status_code == 200


def test_us3_s2_invalid_login_is_rejected_before_attempt(client: TestClient) -> None:
    response = client.post(
        "/api/auth/comensal",
        json=registration_payload(email="invalid", password="short"),
    )
    assert response.status_code == 400


def test_us3_s3_valid_login_returns_one_hour_hs256_jwt(client: TestClient) -> None:
    client.post("/api/comensales", json=registration_payload())
    response = client.post("/api/auth/comensal", json=registration_payload())
    body = response.json()
    claims = jwt.decode(body["access_token"], settings.jwt_secret, algorithms=["HS256"])
    assert response.status_code == 200
    assert body["token_type"] == "bearer"
    assert claims["email"] == "comensal@example.com"
    assert claims["exp"] - claims["iat"] == 3600
    assert datetime.fromtimestamp(claims["exp"], UTC) > datetime.now(UTC)


def test_us3_s4_wrong_credentials_use_same_generic_message(client: TestClient) -> None:
    client.post("/api/comensales", json=registration_payload())
    wrong_password = client.post(
        "/api/auth/comensal",
        json=registration_payload(password="Incorrecta123"),
    )
    unknown_email = client.post(
        "/api/auth/comensal",
        json=registration_payload(email="otro@example.com"),
    )
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json() == {"detail": "Credenciales inválidas"}


def test_us3_s5_login_does_not_return_password_or_hash(client: TestClient) -> None:
    client.post("/api/comensales", json=registration_payload())
    response = client.post("/api/auth/comensal", json=registration_payload())
    assert "password" not in response.text
    assert "password_hash" not in response.text
