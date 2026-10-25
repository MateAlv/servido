from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://servido:servido@localhost:55432/servido"
    jwt_secret: str = "development-only-change-me-please-use-a-real-secret"
    # Public: it identifies the "Servido! web" OAuth client (infra/README.md). No secret is used.
    google_client_id: str = "65379758997-psqucbqtjg6brottoh9bfctf9gnjag5g.apps.googleusercontent.com"
    # console logs the mail, memory keeps it for tests, ses sends it (production).
    mail_backend: str = "console"
    mail_from: str = "Servido! <no-reply@servido.discordia.fyi>"
    # Where the links inside mails point to: the frontend.
    app_base_url: str = "http://localhost:5173"


settings = Settings()
