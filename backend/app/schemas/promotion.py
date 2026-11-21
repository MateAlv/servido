"""What the Responsable sends and reads for its promotions (spec 028, US-48)."""

from datetime import date, time
from decimal import Decimal
from typing import Literal, Self
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.services.promotions import FIXED, PERCENTAGE

MAX_NAME = 120


class PromotionPayload(BaseModel):
    """The full data of a promotion, for create and edit (FR-001, FR-002, FR-003)."""

    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=MAX_NAME)
    description: str | None = Field(default=None, max_length=1000)
    discount_type: Literal[PERCENTAGE, FIXED]
    discount_value: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    minimum_amount: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    starts_on: date | None = None
    ends_on: date | None = None
    weekdays: list[int] | None = Field(default=None, min_length=1, max_length=7)
    start_time: time | None = None
    end_time: time | None = None
    active: bool = True
    stackable: bool = True

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Ingresá el nombre de la promoción.")
        if "\x00" in value:
            raise ValueError("El nombre de la promoción no es válido.")
        return value.strip()

    @field_validator("description")
    @classmethod
    def description_within_bounds(cls, value: str | None) -> str | None:
        if value is not None and "\x00" in value:
            raise ValueError("La descripción no es válida.")
        return value

    @field_validator("weekdays")
    @classmethod
    def weekdays_are_iso(cls, value: list[int] | None) -> list[int] | None:
        if value is None:
            return None
        if any(day < 1 or day > 7 for day in value):
            raise ValueError("Los días de la semana no son válidos.")
        if len(set(value)) != len(value):
            raise ValueError("Cada día de la semana puede aparecer una sola vez.")
        return sorted(value)

    @field_validator("discount_value", "minimum_amount")
    @classmethod
    def two_decimals(cls, value: Decimal | None) -> Decimal | None:
        if value is None:
            return None
        return value.quantize(Decimal("0.01"))

    @model_validator(mode="after")
    def discount_is_consistent(self) -> Self:
        if self.discount_type == PERCENTAGE:
            if self.discount_value > 100:
                raise ValueError("El porcentaje no puede superar el 100%.")
            if self.minimum_amount is not None:
                raise ValueError("El monto mínimo solo aplica a los descuentos de monto fijo.")
            return self
        if self.minimum_amount is None:
            raise ValueError("Indicá el monto mínimo del pedido para un descuento de monto fijo.")
        if self.minimum_amount < self.discount_value:
            raise ValueError("El monto mínimo no puede ser menor que el descuento.")
        return self

    @model_validator(mode="after")
    def validity_is_consistent(self) -> Self:
        if (self.starts_on is None) != (self.ends_on is None):
            raise ValueError("Completá las dos fechas o dejálas vacías.")
        if (
            self.starts_on is not None
            and self.ends_on is not None
            and self.ends_on < self.starts_on
        ):
            raise ValueError("La fecha de fin no puede ser anterior a la de inicio.")
        if (self.start_time is None) != (self.end_time is None):
            raise ValueError("Completá el horario completo o dejalo vacío.")
        if (
            self.start_time is not None
            and self.end_time is not None
            and self.end_time <= self.start_time
        ):
            raise ValueError("La hora de fin tiene que ser posterior a la de inicio.")
        if self.starts_on is None and self.weekdays is None and self.start_time is None:
            raise ValueError("Elegí al menos una fecha, un día o un horario para la vigencia.")
        return self


class PromotionCreateRequest(PromotionPayload):
    # A repeated request is answered with the stored promotion (double-submit edge case).
    request_id: UUID


class PromotionStateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    active: bool


class PromotionPolicyRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    stack_promotions: bool


class PromotionResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    discount_type: Literal["percentage", "fixed"]
    discount_value: Decimal
    minimum_amount: Decimal | None
    starts_on: date | None
    ends_on: date | None
    weekdays: list[int] | None
    start_time: time | None
    end_time: time | None
    active: bool
    stackable: bool
    state: Literal["active", "programmed", "expired", "paused"]


class PromotionListResponse(BaseModel):
    stack_promotions: bool
    promotions: list[PromotionResponse]


class PromotionPolicyResponse(BaseModel):
    stack_promotions: bool
