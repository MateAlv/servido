from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

CATEGORIES = {"entrada", "plato_principal", "postre", "bebida"}
DIETARY_RESTRICTIONS = {"sin_tacc", "vegetariano", "vegano"}


class DishCreateRequest(BaseModel):
    nombre: str = Field(min_length=1, max_length=150)
    descripcion: str | None = Field(default=None, max_length=2000)
    categoria: str
    precio: Decimal
    restricciones_alimenticias: list[str] = Field(default_factory=list)
    tiempo_preparacion_minutos: int | None = Field(default=None)

    @field_validator("nombre")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Ingresá el nombre del plato.")
        return value

    @field_validator("descripcion")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        return value.strip() if value and value.strip() else None

    @field_validator("categoria")
    @classmethod
    def validate_category(cls, value: str) -> str:
        value = value.strip()
        if value not in CATEGORIES:
            raise ValueError("Elegí una categoría válida.")
        return value

    @field_validator("precio")
    @classmethod
    def validate_price(cls, value: Decimal) -> Decimal:
        if value <= 0:
            raise ValueError("El precio debe ser mayor a cero.")
        if value.as_tuple().exponent < -2:
            raise ValueError("El precio puede tener hasta dos decimales.")
        return value

    @field_validator("restricciones_alimenticias")
    @classmethod
    def validate_restrictions(cls, values: list[str]) -> list[str]:
        if any(value not in DIETARY_RESTRICTIONS for value in values):
            raise ValueError("Elegí restricciones alimenticias válidas.")
        return list(dict.fromkeys(values))

    @field_validator("tiempo_preparacion_minutos")
    @classmethod
    def validate_prep_time(cls, value: int | None) -> int | None:
        if value is not None and value <= 0:
            raise ValueError("El tiempo de preparación debe ser mayor a cero.")
        return value


class DishResponse(BaseModel):
    id: UUID = Field(validation_alias="id_plato")
    nombre: str
    descripcion: str | None
    categoria: str
    precio: Decimal
    restricciones_alimenticias: list[str]
    tiempo_preparacion_minutos: int | None
    foto_url: str | None

    model_config = {"from_attributes": True}
