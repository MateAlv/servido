from uuid import UUID

from pydantic import BaseModel, Field, ValidationInfo, field_validator

from app.services.auth import normalize_email, validate_email, validate_password
from app.services.restaurant import is_valid_cuit, is_valid_phone, normalize_cuit


class RestaurantRegistrationRequest(BaseModel):
    # Order matters: the password rules compare against the email, validated first.
    nombre: str = Field(min_length=1, max_length=150)
    email: str = Field(min_length=1, max_length=255)
    cuit: str = Field(min_length=1, max_length=20)
    telefono: str = Field(min_length=1, max_length=30)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("nombre")
    @classmethod
    def nombre_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Ingresá el nombre del restaurante.")
        return cleaned

    @field_validator("email")
    @classmethod
    def email_must_be_valid(cls, value: str) -> str:
        normalized = normalize_email(value)
        if not validate_email(normalized):
            raise ValueError("Ingresá un email válido.")
        return normalized

    @field_validator("cuit")
    @classmethod
    def cuit_must_be_valid(cls, value: str) -> str:
        normalized = normalize_cuit(value)
        if not is_valid_cuit(normalized):
            raise ValueError("Ingresá un CUIT válido de 11 dígitos.")
        return normalized

    @field_validator("telefono")
    @classmethod
    def telefono_must_be_valid(cls, value: str) -> str:
        cleaned = value.strip()
        if not is_valid_phone(cleaned):
            raise ValueError("Ingresá un teléfono válido.")
        return cleaned

    @field_validator("password")
    @classmethod
    def password_must_be_valid(cls, value: str, info: ValidationInfo) -> str:
        error = validate_password(value, info.data.get("email", ""))
        if error:
            raise ValueError(error)
        return value


class RestaurantResponse(BaseModel):
    id: UUID = Field(validation_alias="id_restaurante")
    nombre: str
    email: str
    cuit: str
    telefono: str

    model_config = {"from_attributes": True}


class RestaurantLoginResponse(BaseModel):
    restaurante: RestaurantResponse
    access_token: str
    token_type: str = "bearer"