from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

CATEGORIES = {"entrada", "plato_principal", "postre", "bebida"}
DIETARY_RESTRICTIONS = {"sin_tacc", "vegetariano", "vegano"}


class DishCreateRequest(BaseModel):
    nombre: str = Field(min_length=1, max_length=150)
    descripcion: str | None = Field(default=None, max_length=2000)
    categoria: str
    precio: Decimal = Field(max_digits=10, decimal_places=2, allow_inf_nan=False)
    restricciones_alimenticias: list[str] = Field(default_factory=list)
    tiempo_preparacion_minutos: int | None = Field(default=None, le=2_147_483_647)

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
    disponible: bool

    model_config = {"from_attributes": True}


class DishEditRequest(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    category: str
    price: Decimal = Field(max_digits=10, decimal_places=2, allow_inf_nan=False)
    dietary_restrictions: list[str] = Field(default_factory=list)
    prep_time_minutes: int | None = Field(default=None, le=2_147_483_647)
    photo_action: Literal["keep", "replace", "remove"]
    expected_revision: int = Field(gt=0)

    normalize_name = field_validator("name")(DishCreateRequest.normalize_name.__func__)
    normalize_description = field_validator("description")(
        DishCreateRequest.normalize_description.__func__
    )
    validate_category = field_validator("category")(DishCreateRequest.validate_category.__func__)
    validate_price = field_validator("price")(DishCreateRequest.validate_price.__func__)
    validate_restrictions = field_validator("dietary_restrictions")(
        DishCreateRequest.validate_restrictions.__func__
    )
    validate_prep_time = field_validator("prep_time_minutes")(
        DishCreateRequest.validate_prep_time.__func__
    )

    def stored_values(self) -> dict:
        return dict(
            nombre=self.name,
            descripcion=self.description,
            categoria=self.category,
            precio=self.price,
            restricciones_alimenticias=self.dietary_restrictions,
            tiempo_preparacion_minutos=self.prep_time_minutes,
        )


class DishAvailabilityRequest(BaseModel):
    available: bool
    expected_revision: int = Field(gt=0)


class DishManagementResponse(BaseModel):
    id: UUID = Field(validation_alias="id_plato")
    name: str = Field(validation_alias="nombre")
    description: str | None = Field(validation_alias="descripcion")
    category: str = Field(validation_alias="categoria")
    price: Decimal = Field(validation_alias="precio")
    photo_url: str | None = Field(validation_alias="foto_url")
    dietary_restrictions: list[str] = Field(validation_alias="restricciones_alimenticias")
    prep_time_minutes: int | None = Field(validation_alias="tiempo_preparacion_minutos")
    available: bool = Field(validation_alias="disponible")
    revision: int
    model_config = {"from_attributes": True}


class DishWriteResponse(BaseModel):
    dish: DishManagementResponse
    changed_since_open: bool
