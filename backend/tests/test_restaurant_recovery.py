"""Acceptance tests for spec 026, US-46: a restaurant recovers access to its account."""

import re
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.models.password_reset import PasswordResetRequest
from app.models.restaurant_access import RestaurantPasswordReset
from app.services.mail import Mail, MailError

EMAIL = "local@example.com"
PASSWORD = "Segura123"
NEW_PASSWORD = "NuevaClave456"
CUIT = "30712345671"
RECOVERY_SUBJECT = "Recuperá la cuenta de tu restaurante en Servido!"
VERIFICATION_SUBJECT = "Verificá el email de tu restaurante en Servido!"
LINK = re.compile(r"https://servido\.test/restaurante/restablecer\?token=([\w-]+)")
VERIFICATION_LINK = re.compile(r"https://servido\.test/restaurante/verificar-email\?token=([\w-]+)")
RECOVERY_SENT = (
    "Si existe una cuenta asociada a ese email, te enviamos un correo con instrucciones."
)


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


def verification_mails(outbox: list[Mail]) -> list[Mail]:
    return [mail for mail in outbox if mail.subject == VERIFICATION_SUBJECT]


def recovery_mails(outbox: list[Mail]) -> list[Mail]:
    return [mail for mail in outbox if mail.subject == RECOVERY_SUBJECT]


def token_in(mail: Mail, link: re.Pattern[str] = LINK) -> str:
    match = link.search(mail.text)
    assert match, mail.text
    return match.group(1)


def register_verified(client: TestClient, mail_outbox: list[Mail], email: str = EMAIL) -> None:
    """Registers and opens the verification link, so recovery has a verified account."""
    assert register(client, email).status_code == 201
    token = token_in(verification_mails(mail_outbox)[0], VERIFICATION_LINK)
    assert client.post("/api/restaurantes/verificacion", json={"token": token}).status_code == 200


def ask(client: TestClient, email: str = EMAIL):
    return client.post("/api/restaurantes/recuperacion", json={"email": email})


def check(client: TestClient, token: str):
    return client.post("/api/restaurantes/recuperacion/validacion", json={"token": token})


def change(client: TestClient, token: str, password: str = NEW_PASSWORD):
    return client.put("/api/restaurantes/recuperacion", json={"token": token, "password": password})


def sign_in(client: TestClient, password: str = PASSWORD, email: str = EMAIL):
    return client.post("/api/auth/restaurante", json={"email": email, "password": password})


def headers(response) -> dict[str, str]:
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def lapse(session: Session, seconds: int = 61) -> None:
    """Moves the requests back so the 60 seconds between one and the next have passed."""
    session.execute(
        update(PasswordResetRequest).values(
            requested_at=PasswordResetRequest.requested_at - timedelta(seconds=seconds)
        )
    )


def test_us46_s1_request_with_a_registered_email_is_accepted(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register_verified(client, mail_outbox)

    response = ask(client)

    assert response.status_code == 202
    assert response.json() == {"detail": RECOVERY_SENT}


def test_us46_s2_mail_contains_the_recovery_instructions(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register_verified(client, mail_outbox)

    ask(client)

    mail = recovery_mails(mail_outbox)[0]
    token = token_in(mail)
    assert mail.to == EMAIL
    assert token in mail.html
    assert "15 minutos" in mail.text
    assert "nueva contraseña" in mail.text


def test_us46_s3_unknown_email_gets_the_same_message_and_no_mail(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register_verified(client, mail_outbox)

    known = ask(client, EMAIL)
    unknown = ask(client, "nadie@example.com")

    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json() == {"detail": RECOVERY_SENT}
    assert [mail.to for mail in recovery_mails(mail_outbox)] == [EMAIL]


def test_us46_s4_valid_link_sets_a_new_password(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register_verified(client, mail_outbox)
    ask(client)
    token = token_in(recovery_mails(mail_outbox)[0])

    checked = check(client, token)
    changed = change(client, token)

    assert checked.status_code == 200
    assert checked.json() == {"detail": "El link es válido. Elegí tu nueva contraseña."}
    assert changed.status_code == 200
    assert changed.json() == {
        "detail": "¡Listo! Tu contraseña quedó actualizada. Ya podés ingresar."
    }


def test_us46_s5_weak_password_is_reported_and_not_saved(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    email = "local1@example.com"
    register_verified(client, mail_outbox, email)
    ask(client, email)
    token = token_in(recovery_mails(mail_outbox)[0])

    too_short = change(client, token, "abc")
    no_number = change(client, token, "sololetras")
    same_as_email = change(client, token, email)

    assert too_short.status_code == 400
    assert too_short.json() == {"detail": "La contraseña debe tener entre 8 y 128 caracteres."}
    assert no_number.json() == {"detail": "La contraseña debe contener al menos un número."}
    assert same_as_email.json() == {"detail": "La contraseña no puede ser igual al email."}
    assert sign_in(client, email=email).status_code == 200


def test_us46_s6_the_previous_password_stops_working(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register_verified(client, mail_outbox)
    ask(client)
    change(client, token_in(recovery_mails(mail_outbox)[0]))

    assert sign_in(client, PASSWORD).status_code == 401


def test_us46_s7_sign_in_uses_the_new_password(client: TestClient, mail_outbox: list[Mail]) -> None:
    register_verified(client, mail_outbox)
    ask(client)
    change(client, token_in(recovery_mails(mail_outbox)[0]))

    response = sign_in(client, NEW_PASSWORD)

    assert response.status_code == 200
    assert response.json()["restaurante"]["email"] == EMAIL


def test_us46_edge_a_new_request_voids_the_previous_link(
    client: TestClient, session: Session, mail_outbox: list[Mail]
) -> None:
    register_verified(client, mail_outbox)
    ask(client)
    first = token_in(recovery_mails(mail_outbox)[0])
    lapse(session)
    ask(client)
    second = token_in(recovery_mails(mail_outbox)[1])

    assert second != first
    assert check(client, first).json() == {"detail": "Ese link no es válido. Pedí uno nuevo."}
    assert check(client, second).status_code == 200


def test_us46_edge_used_link_is_refused_and_a_new_one_can_be_asked_for(
    client: TestClient, session: Session, mail_outbox: list[Mail]
) -> None:
    register_verified(client, mail_outbox)
    ask(client)
    token = token_in(recovery_mails(mail_outbox)[0])
    change(client, token)

    reused = check(client, token)
    again = change(client, token, "OtraClave789")
    lapse(session)
    ask(client)
    fresh = token_in(recovery_mails(mail_outbox)[1])

    assert reused.status_code == 400
    assert reused.json() == {
        "detail": "Ese link ya se usó para cambiar la contraseña. Pedí uno nuevo."
    }
    assert again.status_code == 400
    assert check(client, fresh).status_code == 200


def test_us46_edge_expired_link_is_refused_and_a_new_one_can_be_asked_for(
    client: TestClient, session: Session, mail_outbox: list[Mail]
) -> None:
    register_verified(client, mail_outbox)
    ask(client)
    token = token_in(recovery_mails(mail_outbox)[0])
    session.execute(
        update(RestaurantPasswordReset).values(expires_at=datetime.now(UTC) - timedelta(minutes=1))
    )

    expired = check(client, token)
    lapse(session)
    ask(client)
    fresh = token_in(recovery_mails(mail_outbox)[1])

    assert expired.status_code == 400
    assert expired.json() == {"detail": "Ese link venció. Pedí uno nuevo."}
    assert check(client, fresh).status_code == 200


def test_us46_edge_google_account_is_told_to_use_google(
    client: TestClient, session: Session, mail_outbox: list[Mail], google_token
) -> None:
    client.post(
        "/api/restaurantes/google",
        json={
            "credential": google_token(email="google-local@example.com"),
            "nombre": "La Esquina de Palermo",
            "cuit": "30722222225",
            "telefono": "1155554444",
            "terms_accepted": True,
        },
    )

    response = ask(client, "google-local@example.com")

    assert response.status_code == 202
    assert response.json() == {"detail": RECOVERY_SENT}
    mail = recovery_mails(mail_outbox)[0]
    assert "Google" in mail.text
    assert "restablecer?token=" not in mail.text
    assert session.scalar(select(RestaurantPasswordReset)) is None


def test_us46_edge_unverified_account_gets_a_verification_link(
    client: TestClient, session: Session, mail_outbox: list[Mail]
) -> None:
    register(client)
    assert len(verification_mails(mail_outbox)) == 1

    response = ask(client)

    assert response.status_code == 202
    assert response.json() == {"detail": RECOVERY_SENT}
    assert recovery_mails(mail_outbox) == []
    assert len(verification_mails(mail_outbox)) == 2
    assert session.scalar(select(RestaurantPasswordReset)) is None
    # The new verification link works, and asking again afterwards sends the recovery one.
    token = token_in(verification_mails(mail_outbox)[1], VERIFICATION_LINK)
    assert client.post("/api/restaurantes/verificacion", json={"token": token}).status_code == 200
    lapse(session)
    ask(client)
    assert len(recovery_mails(mail_outbox)) == 1


def test_us46_edge_a_second_request_within_a_minute_is_refused(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register_verified(client, mail_outbox)
    assert ask(client).status_code == 202

    too_soon = ask(client)

    assert too_soon.status_code == 429
    assert too_soon.json() == {"detail": "Esperá un minuto antes de pedir otro link."}
    assert len(recovery_mails(mail_outbox)) == 1


def test_us46_edge_sixth_request_in_half_an_hour_is_limited(
    client: TestClient, session: Session, mail_outbox: list[Mail]
) -> None:
    # Manual use of the dev database can leave requests behind: the test starts from zero.
    session.execute(delete(PasswordResetRequest))
    register_verified(client, mail_outbox)
    for _ in range(5):
        assert ask(client).status_code == 202
        lapse(session)
    for _ in range(5):
        assert ask(client, "nadie@example.com").status_code == 202
        lapse(session)

    limited = ask(client)
    unknown_limited = ask(client, "nadie@example.com")

    assert limited.status_code == 429
    assert limited.json() == {
        "detail": "Pediste demasiados links. Esperá unos minutos y probá de nuevo."
    }
    assert unknown_limited.status_code == 429
    assert len(recovery_mails(mail_outbox)) == 5


def test_us46_edge_mail_failure_keeps_the_neutral_answer(
    client: TestClient, monkeypatch, mail_outbox: list[Mail]
) -> None:
    def fail(_mail: Mail) -> None:
        raise MailError("SES is down")

    monkeypatch.setattr("app.services.restaurant_recovery.send_mail", fail)
    register_verified(client, mail_outbox)

    response = ask(client)

    assert response.status_code == 202
    assert response.json() == {"detail": RECOVERY_SENT}


def test_us46_edge_password_change_closes_open_sessions(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register_verified(client, mail_outbox)
    old_session = headers(sign_in(client))
    assert client.get("/api/me", headers=old_session).status_code == 200

    ask(client)
    change(client, token_in(recovery_mails(mail_outbox)[0]))

    assert client.get("/api/me", headers=old_session).status_code == 401
    new_session = headers(sign_in(client, NEW_PASSWORD))
    assert client.get("/api/me", headers=new_session).status_code == 200


def test_us46_edge_the_password_is_never_returned(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register_verified(client, mail_outbox)
    ask(client)
    token = token_in(recovery_mails(mail_outbox)[0])

    response = change(client, token)

    assert NEW_PASSWORD not in response.text
    assert "password" not in response.json()
    restaurant = client.get("/api/me", headers=headers(sign_in(client, NEW_PASSWORD))).json()
    assert "password" not in restaurant


def test_us46_edge_the_email_is_matched_without_case(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register_verified(client, mail_outbox, "Local@Example.com")

    response = ask(client, "LOCAL@EXAMPLE.COM")

    assert response.status_code == 202
    assert [mail.to for mail in recovery_mails(mail_outbox)] == ["local@example.com"]
    assert token_in(recovery_mails(mail_outbox)[0])


def test_us46_edge_invalid_email_is_reported(client: TestClient) -> None:
    response = ask(client, "no-es-email")

    assert response.status_code == 400
    assert response.json()["detail"][0]["msg"] == "Ingresá un email válido."


def test_us46_edge_invalid_link_is_reported(client: TestClient) -> None:
    invalid = check(client, "no-es-un-token")
    changed = change(client, "no-es-un-token")

    assert invalid.status_code == 400
    assert invalid.json() == {"detail": "Ese link no es válido. Pedí uno nuevo."}
    assert changed.status_code == 400


def test_us46_edge_the_link_does_not_sign_in(client: TestClient, mail_outbox: list[Mail]) -> None:
    register_verified(client, mail_outbox)
    ask(client)

    response = change(client, token_in(recovery_mails(mail_outbox)[0]))

    assert "access_token" not in response.text
    assert EMAIL not in response.text
