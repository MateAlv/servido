from fastapi.testclient import TestClient
from sqlalchemy import select

from app.models.diner import Diner
from app.models.restaurant import Restaurant
from tests.conftest import GoogleTokenFactory


def diner_payload(**changes: object) -> dict[str, object]:
    return {
        "nombre": "Comensal",
        "email": "terms@example.com",
        "password": "Segura123",
        "terms_accepted": True,
        **changes,
    }


def restaurant_payload(**changes: object) -> dict[str, object]:
    return {
        "nombre": "Local",
        "email": "terms-local@example.com",
        "cuit": "30-71234567-1",
        "telefono": "11 5555-4444",
        "password": "Segura123",
        "terms_accepted": True,
        **changes,
    }


def test_us29_s1_terms_are_required_before_diner_registration(client: TestClient) -> None:
    response = client.post("/api/comensales", json=diner_payload(terms_accepted=False))

    assert response.status_code == 400
    assert response.json()["detail"][0]["msg"] == "Primero aceptá los términos y condiciones."


def test_us29_s3_diner_registration_stores_terms_acceptance(client: TestClient, session) -> None:
    response = client.post("/api/comensales", json=diner_payload())

    assert response.status_code == 201
    diner = session.scalar(select(Diner).where(Diner.email == "terms@example.com"))
    assert diner is not None
    assert diner.terms_version == "1.0"
    assert diner.terms_accepted_at is not None


def test_us29_s4_google_registration_requires_terms(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    response = client.post(
        "/api/comensales/google",
        json={"credential": google_token(), "terms_accepted": False},
    )

    assert response.status_code == 400
    assert response.json()["detail"][0]["msg"] == "Primero aceptá los términos y condiciones."


def test_us26_s1_terms_are_required_before_restaurant_registration(
    client: TestClient,
) -> None:
    response = client.post("/api/restaurantes", json=restaurant_payload(terms_accepted=False))

    assert response.status_code == 400
    assert response.json()["detail"][0]["msg"] == "Primero aceptá los términos y condiciones."


def test_us26_s3_restaurant_registration_stores_terms_acceptance(
    client: TestClient, session
) -> None:
    response = client.post("/api/restaurantes", json=restaurant_payload())

    assert response.status_code == 201
    restaurant = session.scalar(
        select(Restaurant).where(Restaurant.email == "terms-local@example.com")
    )
    assert restaurant is not None
    assert restaurant.terms_version == "1.0"
    assert restaurant.terms_accepted_at is not None


def test_us26_s4_google_registration_requires_terms(
    client: TestClient, google_token: GoogleTokenFactory
) -> None:
    response = client.post(
        "/api/restaurantes/google",
        json={
            "credential": google_token(email="terms-local@example.com"),
            "nombre": "Local",
            "cuit": "30-71234567-1",
            "telefono": "11 5555-4444",
            "terms_accepted": False,
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"][0]["msg"] == "Primero aceptá los términos y condiciones."


def test_us26_edge_failed_registration_saves_no_acceptance(client: TestClient, session) -> None:
    client.post("/api/restaurantes", json=restaurant_payload())
    response = client.post(
        "/api/restaurantes",
        json=restaurant_payload(email="other@example.com"),
    )

    assert response.status_code == 409
    restaurants = session.scalars(select(Restaurant)).all()
    assert len(restaurants) == 1
    assert restaurants[0].terms_accepted_at is not None


def test_us29_edge_login_does_not_ask_terms(client: TestClient) -> None:
    client.post("/api/comensales", json=diner_payload())

    response = client.post(
        "/api/auth/comensal",
        json={"email": "terms@example.com", "password": "Segura123"},
    )

    assert response.status_code == 200


def test_us29_edge_existing_accounts_can_sign_in(client: TestClient, session) -> None:
    diner = Diner(
        nombre="Anterior",
        email="old@example.com",
        password_hash="$argon2id$v=19$m=65536,t=3,p=4$invalid",
    )
    session.add(diner)
    session.flush()
    from app.services.auth import hash_password

    diner.password_hash = hash_password("Segura123")
    session.commit()

    response = client.post(
        "/api/auth/comensal",
        json={"email": "old@example.com", "password": "Segura123"},
    )

    assert response.status_code == 200
    assert session.get(Diner, diner.id_comensal).terms_accepted_at is None
