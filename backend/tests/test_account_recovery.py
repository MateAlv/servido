"""Acceptance tests for spec 013, US-31: a diner recovers access to their account."""

import re
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from app.models.password_reset import PasswordReset, PasswordResetRequest
from app.services.mail import Mail, MailError

EMAIL = "martin@example.com"
PASSWORD = "Segura123"
NEW_PASSWORD = "NuevaClave456"
RECOVERY_SUBJECT = "Recuperá tu cuenta de Servido!"
LINK = re.compile(r"https://servido\.test/restablecer\?token=([\w-]+)")
RECOVERY_SENT = (
    "Si existe una cuenta asociada a ese email, te enviamos un correo con instrucciones."
)


def register(client: TestClient, email: str = EMAIL, password: str = PASSWORD):
    return client.post(
        "/api/comensales",
        json={"nombre": "Martín", "email": email, "password": password, "terms_accepted": True},
    )


def ask(client: TestClient, email: str = EMAIL):
    return client.post("/api/comensales/recuperacion", json={"email": email})


def recovery_mails(outbox: list[Mail]) -> list[Mail]:
    return [mail for mail in outbox if mail.subject == RECOVERY_SUBJECT]


def token_in(mail: Mail) -> str:
    match = LINK.search(mail.text)
    assert match, mail.text
    return match.group(1)


def check(client: TestClient, token: str):
    return client.post("/api/comensales/recuperacion/validacion", json={"token": token})


def change(client: TestClient, token: str, password: str = NEW_PASSWORD):
    return client.put("/api/comensales/recuperacion", json={"token": token, "password": password})


def sign_in(client: TestClient, password: str = PASSWORD, email: str = EMAIL):
    return client.post("/api/auth/comensal", json={"email": email, "password": password})


def headers(response) -> dict[str, str]:
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_us31_s1_request_with_a_registered_email_is_accepted(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)

    response = ask(client)

    assert response.status_code == 202
    assert response.json() == {"detail": RECOVERY_SENT}
    assert len(recovery_mails(mail_outbox)) == 1


def test_us31_s2_mail_contains_the_recovery_link(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)
    ask(client)

    mail = recovery_mails(mail_outbox)[0]
    token = token_in(mail)
    assert mail.to == EMAIL
    assert token in mail.html
    assert "15 minutos" in mail.text


def test_us31_s3_valid_link_sets_a_new_password(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)
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


def test_us31_s4_weak_password_is_reported_and_not_saved(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    email = "martin1@example.com"
    register(client, email)
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
    assert sign_in(client, "sololetras", email).status_code == 401


def test_us31_s5_sign_in_uses_the_new_password(client: TestClient, mail_outbox: list[Mail]) -> None:
    register(client)
    ask(client)
    change(client, token_in(recovery_mails(mail_outbox)[0]))

    assert sign_in(client, NEW_PASSWORD).status_code == 200
    assert sign_in(client, PASSWORD).status_code == 401


def test_us31_s6_used_link_is_refused_and_a_new_one_can_be_asked_for(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)
    ask(client)
    token = token_in(recovery_mails(mail_outbox)[0])
    change(client, token)

    reused = check(client, token)
    again = change(client, token, "OtraClave789")
    ask(client)
    fresh = token_in(recovery_mails(mail_outbox)[1])

    assert reused.status_code == 400
    assert reused.json() == {
        "detail": "Ese link ya se usó para cambiar la contraseña. Pedí uno nuevo."
    }
    assert again.status_code == 400
    assert check(client, fresh).status_code == 200


def test_us31_s7_expired_link_is_refused_and_a_new_one_can_be_asked_for(
    client: TestClient, session: Session, mail_outbox: list[Mail]
) -> None:
    register(client)
    ask(client)
    token = token_in(recovery_mails(mail_outbox)[0])
    session.execute(
        update(PasswordReset).values(expires_at=datetime.now(UTC) - timedelta(minutes=1))
    )

    expired = check(client, token)
    ask(client)
    fresh = token_in(recovery_mails(mail_outbox)[1])

    assert expired.status_code == 400
    assert expired.json() == {"detail": "Ese link venció. Pedí uno nuevo."}
    assert check(client, fresh).status_code == 200


def test_us31_s8_unknown_email_gets_the_same_message(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)

    known = ask(client, EMAIL)
    unknown = ask(client, "nadie@example.com")

    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json() == {"detail": RECOVERY_SENT}
    assert [mail.to for mail in recovery_mails(mail_outbox)] == [EMAIL]


def test_us31_edge_a_new_request_voids_the_previous_link(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)
    ask(client)
    first = token_in(recovery_mails(mail_outbox)[0])
    ask(client)
    second = token_in(recovery_mails(mail_outbox)[1])

    assert second != first
    assert check(client, first).json() == {"detail": "Ese link no es válido. Pedí uno nuevo."}
    assert check(client, second).status_code == 200


def test_us31_edge_google_account_is_told_to_use_google(
    client: TestClient, session: Session, mail_outbox: list[Mail], google_token
) -> None:
    client.post(
        "/api/comensales/google",
        json={"credential": google_token(email="google@example.com"), "terms_accepted": True},
    )

    response = ask(client, "google@example.com")

    assert response.status_code == 202
    mail = recovery_mails(mail_outbox)[0]
    assert "Google" in mail.text
    assert "restablecer?token=" not in mail.text
    assert session.scalar(select(PasswordReset)) is None


def test_us31_edge_unverified_diner_can_recover(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)
    assert sign_in(client).json()["comensal"]["email_verificado"] is False

    ask(client)
    token = token_in(recovery_mails(mail_outbox)[0])

    assert check(client, token).status_code == 200
    assert change(client, token).status_code == 200
    assert sign_in(client, NEW_PASSWORD).status_code == 200


def test_us31_edge_sixth_request_in_half_an_hour_is_limited(
    client: TestClient, session: Session, mail_outbox: list[Mail]
) -> None:
    # Manual use of the dev database can leave requests behind: the test starts from zero.
    session.execute(delete(PasswordResetRequest))
    register(client)
    for _ in range(5):
        assert ask(client).status_code == 202
    for _ in range(5):
        assert ask(client, "nadie@example.com").status_code == 202

    limited = ask(client)
    unknown_limited = ask(client, "nadie@example.com")

    assert limited.status_code == 429
    assert limited.json() == {
        "detail": "Pediste demasiados links. Esperá unos minutos y probá de nuevo."
    }
    assert unknown_limited.status_code == 429
    assert len(recovery_mails(mail_outbox)) == 5


def test_us31_edge_mail_failure_is_reported(client: TestClient, monkeypatch) -> None:
    def fail(_mail: Mail) -> None:
        raise MailError("SES is down")

    monkeypatch.setattr("app.services.password_recovery.send_mail", fail)
    register(client)

    response = ask(client)

    assert response.status_code == 502
    assert response.json() == {"detail": "No pudimos enviar el correo. Probá de nuevo."}


def test_us31_edge_invalid_email_is_reported(client: TestClient) -> None:
    response = ask(client, "no-es-email")

    assert response.status_code == 400
    assert response.json()["detail"][0]["msg"] == "Ingresá un email válido."


def test_us31_edge_password_change_closes_open_sessions(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)
    old_session = headers(sign_in(client))
    assert client.get("/api/me", headers=old_session).status_code == 200

    ask(client)
    change(client, token_in(recovery_mails(mail_outbox)[0]))

    assert client.get("/api/me", headers=old_session).status_code == 401
    new_session = headers(sign_in(client, NEW_PASSWORD))
    assert client.get("/api/me", headers=new_session).status_code == 200


def test_us31_edge_the_password_is_never_returned(
    client: TestClient, mail_outbox: list[Mail]
) -> None:
    register(client)
    ask(client)
    token = token_in(recovery_mails(mail_outbox)[0])

    response = change(client, token)

    assert NEW_PASSWORD not in response.text
    diner = client.get("/api/me", headers=headers(sign_in(client, NEW_PASSWORD))).json()
    assert "password" not in diner
