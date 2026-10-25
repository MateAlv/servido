import smtplib
from email.message import EmailMessage

import pytest

from app.config import settings
from app.services import mail
from app.services.mail import Mail, MailError

MAIL = Mail(to="martin@example.com", subject="Asunto", text="Texto", html="<p>Texto</p>")


class FakeSmtp:
    """Records what the backend does with the SMTP server instead of connecting."""

    sent: list[EmailMessage] = []
    calls: list[tuple] = []
    fail_login = False

    def __init__(self, host: str, port: int, timeout: float) -> None:
        self.calls.append(("connect", host, port))

    def __enter__(self) -> "FakeSmtp":
        return self

    def __exit__(self, *exc_info: object) -> None:
        pass

    def starttls(self) -> None:
        self.calls.append(("starttls",))

    def login(self, username: str, password: str) -> None:
        if self.fail_login:
            raise smtplib.SMTPAuthenticationError(535, b"Bad credentials")
        self.calls.append(("login", username, password))

    def send_message(self, message: EmailMessage) -> None:
        self.sent.append(message)


@pytest.fixture
def smtp(monkeypatch: pytest.MonkeyPatch) -> type[FakeSmtp]:
    monkeypatch.setattr(settings, "mail_backend", "smtp")
    monkeypatch.setattr(settings, "smtp_password", "app-password")
    monkeypatch.setattr(mail.smtplib, "SMTP", FakeSmtp)
    FakeSmtp.sent, FakeSmtp.calls, FakeSmtp.fail_login = [], [], False
    return FakeSmtp


def test_smtp_backend_sends_from_the_team_gmail(smtp: type[FakeSmtp]) -> None:
    mail.send_mail(MAIL)

    assert smtp.calls == [
        ("connect", "smtp.gmail.com", 587),
        ("starttls",),
        ("login", "servido.gdsi@gmail.com", "app-password"),
    ]
    [message] = smtp.sent
    assert message["From"] == "Servido! <servido.gdsi@gmail.com>"
    assert message["To"] == "martin@example.com"
    assert message["Subject"] == "Asunto"
    assert message.get_body(("plain",)).get_content().strip() == "Texto"
    assert message.get_body(("html",)).get_content().strip() == "<p>Texto</p>"


def test_smtp_backend_failure_raises_mail_error(smtp: type[FakeSmtp]) -> None:
    smtp.fail_login = True

    with pytest.raises(MailError):
        mail.send_mail(MAIL)
    assert smtp.sent == []
