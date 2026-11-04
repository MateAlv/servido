from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://servido:servido@localhost:55432/servido"
    jwt_secret: str = "development-only-change-me-please-use-a-real-secret"
    # Public: it identifies the "Servido! web" OAuth client (infra/README.md). No secret is used.
    google_client_id: str = (
        "65379758997-psqucbqtjg6brottoh9bfctf9gnjag5g.apps.googleusercontent.com"
    )
    # console logs the mail, memory keeps it for tests; ses and smtp send it (production).
    mail_backend: str = "console"
    mail_from: str = "Servido! <no-reply@servido.discordia.fyi>"
    # Where the links inside mails point to: the frontend.
    app_base_url: str = "http://localhost:5173"
    aws_region: str = "us-east-1"
    # The smtp backend sends from the team's Gmail with an app password (infra/README.md).
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = "servido.gdsi@gmail.com"
    smtp_password: str = ""
    # Local mode (`make up-local`): diners who sign up with a password start verified, so the
    # team can try the app on localhost without opening a mail.
    auto_verify_emails: bool = False

    @model_validator(mode="after")
    def local_mode_never_sends_mail(self) -> "Settings":
        # A deploy that sends real mail must never skip the verification (US-51).
        if self.auto_verify_emails and self.mail_backend not in ("console", "memory"):
            raise ValueError("AUTO_VERIFY_EMAILS only works with MAIL_BACKEND=console.")
        return self


settings = Settings()
