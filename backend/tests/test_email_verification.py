"""Acceptance tests for spec 007, US-51: verification mail when a diner registers."""

import re
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models.diner import Diner
from app.models.email_verification import EmailVerification
from app.services import mail as mail_service
from app.services.mail import Mail, MailError

EMAIL = "martin@example.com"
LINK = re.compile(r"https://servido\.test/verificar-email\?token=([\w-]+)")


def register(client: TestClient, email: str = EMAIL):
    return client.post(
        "/api/comensales", json={"nombre": "Martín", "email": email, "password": "Segura123"}
    )


def token_in(mail: Mail) -> str:
    match = LINK.search(mail.text)
    assert match, mail.text
    return match.group(1)


def verify(client: TestClient, token: str):
    return client.post("/api/comensales/verificacion", json={"token": token})


def sign_in(client: TestClient, email: str = EMAIL) -> dict[str, str]:
    response = client.post("/api/auth/comensal", json={"email": email, "password": "Segura123"})
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def is_verified(client: TestClient, email: str = EMAIL) -> bool:
    return client.get("/api/me", headers=sign_in(client, email)).json()["email_verificado"]


def test_us51_s1_registration_sends_a_verification_mail(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    response = register(client)

    assert response.status_code == 201
    assert response.json()["email_verificado"] is False
    assert [mail.to for mail in mail_outbox] == [EMAIL]
    assert mail_outbox[0].subject == "Verificá tu email en Servido!"


def test_us51_s2_mail_contains_the_verification_link(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)

    token = token_in(mail_outbox[0])
    assert token in mail_outbox[0].html
    assert "24 horas" in mail_outbox[0].text


def test_us51_s3_valid_link_verifies_the_account(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)
    assert not is_verified(client)

    response = verify(client, token_in(mail_outbox[0]))

    assert response.status_code == 200
    assert response.json() == {"detail": "¡Listo! Tu email quedó verificado."}
    assert is_verified(client)


def test_us51_s3_the_link_does_not_sign_in(client: TestClient, mail_outbox: list[Mail]) -> None:
    register(client)

    response = verify(client, token_in(mail_outbox[0]))

    assert "access_token" not in response.text
    assert EMAIL not in response.text


def test_us51_s4_invalid_or_expired_link_is_rejected(
    client: TestClient, session: Session, mail_outbox: list[Mail]
) -> None:
    register(client)
    token = token_in(mail_outbox[0])

    altered = verify(client, token[:-1] + ("A" if token[-1] != "A" else "B"))
    session.execute(
        update(EmailVerification).values(expires_at=datetime.now(UTC) - timedelta(minutes=1))
    )
    expired = verify(client, token)

    for response in (altered, expired):
        assert response.status_code == 400
        assert response.json()["detail"] == (
            "No pudimos verificar tu email: el enlace no es válido o venció."
        )
    assert not is_verified(client)


def test_us51_s6_unverified_email_cannot_register_again(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)

    response = register(client)

    assert response.status_code == 409
    assert len(mail_outbox) == 1


def test_us51_s7_resend_replaces_the_previous_link(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)
    first = token_in(mail_outbox[0])

    response = client.post("/api/comensales/verificacion/reenvio", headers=sign_in(client))

    assert response.status_code == 202
    second = token_in(mail_outbox[1])
    assert second != first
    assert verify(client, first).status_code == 400
    assert verify(client, second).status_code == 200


def test_us51_s7_resend_is_only_for_unverified_diners(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)
    verify(client, token_in(mail_outbox[0]))

    verified = client.post("/api/comensales/verificacion/reenvio", headers=sign_in(client))
    anonymous = client.post("/api/comensales/verificacion/reenvio")

    assert verified.status_code == 409
    assert anonymous.status_code == 401


def test_us51_edge_used_link_reports_already_verified(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)
    token = token_in(mail_outbox[0])
    verify(client, token)

    response = verify(client, token)

    assert response.status_code == 200
    assert response.json() == {"detail": "Tu email ya estaba verificado."}


def test_us51_edge_mail_failure_still_creates_the_account(
    client: TestClient, session: Session, monkeypatch
) -> None:
    def fail(_mail: Mail) -> None:
        raise MailError("SES is down")

    monkeypatch.setattr("app.services.email_verification.send_mail", fail)

    response = register(client)

    assert response.status_code == 201
    assert session.scalar(select(Diner).where(Diner.email == EMAIL)) is not None
    assert mail_service.outbox == []
