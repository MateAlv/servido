from uuid import UUID

from pydantic import BaseModel, Field, ValidationInfo, field_validator

from app.services.auth import normalize_email, validate_email, validate_password
from app.services.restaurant import has_cuit_length, is_valid_cuit, is_valid_phone, normalize_cuit


class RestaurantDetails(BaseModel):
    """The restaurant's own data, asked for whether it signs up with a password or with Google."""

    nombre: str = Field(min_length=1, max_length=150)
    cuit: str = Field(min_length=1, max_length=20)
    telefono: str = Field(min_length=1, max_length=30)

    @field_validator("nombre")
    @classmethod
    def nombre_must_not_be_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Ingresá el nombre del restaurante.")
        return cleaned

    @field_validator("cuit")
    @classmethod
    def cuit_must_be_valid(cls, value: str) -> str:
        normalized = normalize_cuit(value)
        if not has_cuit_length(normalized):
            raise ValueError("El CUIT tiene que tener 11 dígitos.")
        if not is_valid_cuit(normalized):
            raise ValueError("El CUIT no es válido: revisá los números.")
        return normalized

    @field_validator("telefono")
    @classmethod
    def telefono_must_be_valid(cls, value: str) -> str:
        cleaned = value.strip()
        if not is_valid_phone(cleaned):
            raise ValueError("Ingresá un teléfono válido.")
        return cleaned


class RestaurantRegistrationRequest(RestaurantDetails):
    # Order matters: the password rules compare against the email, validated first.
    email: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def email_must_be_valid(cls, value: str) -> str:
        normalized = normalize_email(value)
        if not validate_email(normalized):
            raise ValueError("Ingresá un email válido.")
        return normalized

    @field_validator("password")
    @classmethod
    def password_must_be_valid(cls, value: str, info: ValidationInfo) -> str:
        error = validate_password(value, info.data.get("email", ""))
        if error:
            raise ValueError(error)
        return value


class RestaurantGoogleRegistration(RestaurantDetails):
    """US-2 S5: the email comes from the Google ID token, and there is no password."""

    credential: str = Field(min_length=1)


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
