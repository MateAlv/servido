from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, ValidationInfo, field_validator

from app.services.auth import normalize_email, validate_email, validate_password


class Credentials(BaseModel):
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def email_must_be_valid(cls, value: str) -> str:
        normalized = normalize_email(value)
        if not validate_email(normalized):
            raise ValueError("Ingresá un email válido.")
        return normalized


class RegistrationRequest(Credentials):
    nombre: str = Field(min_length=1, max_length=60)

    @field_validator("nombre")
    @classmethod
    def nombre_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Ingresá tu nombre.")
        return cleaned

    @field_validator("password")
    @classmethod
    def password_must_be_valid(cls, value: str, info: ValidationInfo) -> str:
        email = info.data.get("email", "")
        error = validate_password(value, email)
        if error:
            raise ValueError(error)
        return value


class DinerResponse(BaseModel):
    id: UUID = Field(validation_alias="id_comensal")
    nombre: str | None = None
    email: str
    fecha_registro: datetime | None = None

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    comensal: DinerResponse
    access_token: str
    token_type: str = "bearer"


class AccountResponse(BaseModel):
    """The account behind the token, whatever its role. Used to show who is signed in."""

    rol: Literal["diner", "restaurant"]
    id: UUID
    nombre: str | None
    email: str