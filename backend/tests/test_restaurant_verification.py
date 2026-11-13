"""Acceptance tests for spec 026, US-44: a restaurant validates its account with its email."""

import re
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.restaurant import Restaurant
from app.models.restaurant_access import RestaurantEmailVerification
from app.services import mail as mail_service
from app.services.mail import Mail, MailError
from tests.reservations import add_bookable_restaurant

EMAIL = "local@example.com"
PASSWORD = "Segura123"
CUIT = "30712345671"
SUBJECT = "Verificá el email de tu restaurante en Servido!"
LINK = re.compile(r"https://servido\.test/restaurante/verificar-email\?token=([\w-]+)")


def register(client: TestClient, email: str = EMAIL, cuit: str = CUIT):
    return client.post(
        "/api/restaurantes",
        json={
            "nombre": "La Esquina de Palermo",
            "email": email,
            "cuit": cuit,
            "telefono": "1155554444",
            "password": PASSWORD,
            "terms_accepted": True,
        },
    )


def sign_in(client: TestClient, email: str = EMAIL, password: str = PASSWORD) -> dict[str, str]:
    response = client.post("/api/auth/restaurante", json={"email": email, "password": password})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def is_verified(client: TestClient, email: str = EMAIL) -> bool:
    return client.get("/api/me", headers=sign_in(client, email)).json()["email_verificado"]


def verification_mails(outbox: list[Mail]) -> list[Mail]:
    return [mail for mail in outbox if mail.subject == SUBJECT]


def token_in(mail: Mail) -> str:
    match = LINK.search(mail.text)
    assert match, mail.text
    return match.group(1)


def verify(client: TestClient, token: str):
    return client.post("/api/restaurantes/verificacion", json={"token": token})


def resend(client: TestClient, headers: dict[str, str]):
    return client.post("/api/restaurantes/verificacion/reenvio", headers=headers)


def visible(client: TestClient, restaurant: Restaurant) -> bool:
    listed = client.get("/api/restaurants").json()["restaurants"]
    return str(restaurant.id_restaurante) in [item["id"] for item in listed]


def test_us44_s1_registration_sends_a_verification_mail(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    response = register(client)

    assert response.status_code == 201
    assert response.json()["email_verificado"] is False
    assert [mail.to for mail in verification_mails(mail_outbox)] == [EMAIL]
    assert is_verified(client) is False


def test_us44_s2_valid_link_verifies_the_account(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)

    response = verify(client, token_in(verification_mails(mail_outbox)[0]))

    assert response.status_code == 200
    assert response.json() == {"detail": "¡Listo! Tu email quedó verificado."}
    assert is_verified(client) is True


def test_us44_s3_invalid_or_expired_link_is_rejected(
    client: TestClient, session: Session, mail_outbox: list[Mail]
) -> None:
    register(client)
    token = token_in(verification_mails(mail_outbox)[0])

    altered = verify(client, token[:-1] + ("A" if token[-1] != "A" else "B"))
    session.execute(
        update(RestaurantEmailVerification).values(
            expires_at=datetime.now(UTC) - timedelta(minutes=1)
        )
    )
    expired = verify(client, token)

    for response in (altered, expired):
        assert response.status_code == 400
        assert response.json()["detail"] == (
            "No pudimos verificar tu email: el enlace no es válido o venció."
        )
    assert is_verified(client) is False

    # The page offers a new link, and it works (S3, S4).
    assert resend(client, sign_in(client)).status_code == 202
    fresh = token_in(verification_mails(mail_outbox)[1])
    assert verify(client, fresh).json() == {"detail": "¡Listo! Tu email quedó verificado."}


def test_us44_s4_resend_replaces_the_previous_link(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)
    first = token_in(verification_mails(mail_outbox)[0])

    response = resend(client, sign_in(client))

    assert response.status_code == 202
    assert response.json() == {"detail": "Te enviamos un nuevo mail de verificación."}
    second = token_in(verification_mails(mail_outbox)[1])
    assert second != first
    assert verify(client, first).status_code == 400
    assert verify(client, second).status_code == 200


def test_us44_s5_unverified_restaurant_is_hidden(client: TestClient, session: Session) -> None:
    restaurant = add_bookable_restaurant(session)
    restaurant.email_verified_at = None
    session.flush()
    diner_headers = _diner_headers(client)

    assert visible(client, restaurant) is False
    assert client.get(f"/api/restaurants/{restaurant.id_restaurante}").status_code == 404
    availability = client.get(
        f"/api/restaurants/{restaurant.id_restaurante}/availability",
        params={"date": "2026-11-03", "party_size": 2},
        headers=diner_headers,
    )
    assert availability.status_code == 404


def test_us44_s6_verified_restaurant_is_visible(
    client: TestClient, session: Session, mail_outbox: list[Mail]
) -> None:
    restaurant = add_bookable_restaurant(session)
    restaurant.email_verified_at = None
    session.flush()
    assert visible(client, restaurant) is False

    assert resend(client, sign_in(client, restaurant.email)).status_code == 202
    token = token_in(verification_mails(mail_outbox)[-1])
    assert verify(client, token).status_code == 200

    assert visible(client, restaurant) is True
    assert client.get(f"/api/restaurants/{restaurant.id_restaurante}").status_code == 200


def test_us44_edge_google_restaurant_starts_verified(
    client: TestClient, mail_outbox: list[Mail], google_token
) -> None:
    response = client.post(
        "/api/restaurantes/google",
        json={
            "credential": google_token(email="google-local@example.com"),
            "nombre": "La Esquina de Palermo",
            "cuit": "30722222225",
            "telefono": "1155554444",
            "terms_accepted": True,
        },
    )

    assert response.status_code == 201
    assert response.json()["restaurante"]["email_verificado"] is True
    # Google already proved the address: no verification mail (research R8).
    assert verification_mails(mail_outbox) == []


def test_us44_edge_used_link_reports_already_verified(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)
    token = token_in(verification_mails(mail_outbox)[0])
    verify(client, token)

    response = verify(client, token)

    assert response.status_code == 200
    assert response.json() == {"detail": "Tu email ya estaba verificado."}


def test_us44_edge_the_link_does_not_sign_in(client: TestClient, mail_outbox: list[Mail]) -> None:
    register(client)

    response = verify(client, token_in(verification_mails(mail_outbox)[0]))

    assert "access_token" not in response.text
    assert EMAIL not in response.text


def test_us44_edge_mail_failure_still_creates_the_account(
    client: TestClient, session: Session, monkeypatch
) -> None:
    def fail(_mail: Mail) -> None:
        raise MailError("SES is down")

    monkeypatch.setattr("app.services.restaurant_verification.send_mail", fail)

    response = register(client)

    assert response.status_code == 201
    assert session.scalar(select(Restaurant).where(Restaurant.email == EMAIL)) is not None
    assert mail_service.outbox == []
    # The Responsable can ask for a new link from the dashboard (S3, S4).
    assert resend(client, sign_in(client)).status_code == 202


def test_us44_edge_resend_is_only_for_unverified_restaurants(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)
    verify(client, token_in(verification_mails(mail_outbox)[0]))

    verified = resend(client, sign_in(client))
    anonymous = resend(client, {})
    diner = resend(client, _diner_headers(client))

    assert verified.status_code == 409
    assert verified.json() == {"detail": "Tu email ya está verificado."}
    assert anonymous.status_code == 401
    assert diner.status_code == 403


def _diner_headers(client: TestClient) -> dict[str, str]:
    client.post(
        "/api/comensales",
        json={
            "nombre": "Martín",
            "email": "martin@example.com",
            "password": "Segura123",
            "terms_accepted": True,
        },
    )
    response = client.post(
        "/api/auth/comensal", json={"email": "martin@example.com", "password": "Segura123"}
    )
    return {"Authorization": f"Bearer {response.json()['access_token']}"}
