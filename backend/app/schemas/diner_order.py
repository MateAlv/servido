"""What the diner reads and sends for the order of a reservation (spec 009-pedido-anticipado)."""

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal, Self
from uuid import UUID

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    ValidatorFunctionWrapHandler,
    field_validator,
    model_validator,
)

from app.models.cart import MAX_UNITS_PER_DISH
from app.schemas.reservation import ReservationResponse
from app.services.orders import MAX_DISHES

# Postgres `integer`: a bigger time would fail in the database instead of answering 400.
MAX_PREP_TIME_MINUTES = 2_147_483_647


class OrderItemRequest(BaseModel):
    """A dish of the order with the name, price and time the page showed (P9)."""

    dish_id: UUID
    quantity: int = Field(ge=1, le=MAX_UNITS_PER_DISH)
    name: str = Field(min_length=1, max_length=150)
    unit_price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    prep_time_minutes: int | None = Field(default=None, gt=0, le=MAX_PREP_TIME_MINUTES)

    @field_validator("name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Falta el nombre del plato.")
        # Postgres text can't hold NUL: the cart would fail with a 500 instead of a 400.
        if "\x00" in value:
            raise ValueError("El nombre del plato no es válido.")
        return value

    @field_validator("unit_price")
    @classmethod
    def two_decimals(cls, value: Decimal) -> Decimal:
        return value.quantize(Decimal("0.01"))


class DraftRequest(BaseModel):
    """The whole order (or cart): it replaces the previous one."""

    model_config = ConfigDict(extra="forbid")
    arrival_at: AwareDatetime
    payment_method: Literal["cash", "online"] | None
    items: list[OrderItemRequest] = Field(max_length=MAX_DISHES)

    @field_validator("arrival_at", mode="wrap")
    @classmethod
    def arrival_has_timezone(cls, value: Any, handler: ValidatorFunctionWrapHandler) -> datetime:
        try:
            return handler(value)
        except ValidationError as error:
            if any(detail["type"] == "timezone_aware" for detail in error.errors()):
                raise ValueError("La hora de llegada debe incluir una zona horaria.") from error
            raise

    @field_validator("items")
    @classmethod
    def one_row_per_dish(cls, items: list[OrderItemRequest]) -> list[OrderItemRequest]:
        if len({item.dish_id for item in items}) != len(items):
            raise ValueError("Cada plato puede aparecer una sola vez en el pedido.")
        return items


class ConfirmationRequest(DraftRequest):
    operation_id: UUID

    @model_validator(mode="after")
    def method_selected(self) -> Self:
        if self.items and self.payment_method is None:
            raise ValueError("Seleccioná un medio de pago para confirmar tu pedido.")
        return self


class PaymentMethodRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    payment_method: Literal["cash", "online"]


class PayerIdentification(BaseModel):
    type: str = Field(min_length=1, max_length=20)
    number: str = Field(min_length=1, max_length=30)


class Payer(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    identification: PayerIdentification | None = None


class PaymentRequest(BaseModel):
    """What Mercado Pago's card form gives after tokenizing the card (spec 032, US-56): never the
    card number or its security code (FR-014)."""

    model_config = ConfigDict(extra="forbid")
    request_id: UUID
    token: str = Field(min_length=1, max_length=200)
    payment_method_id: str = Field(min_length=1, max_length=40)
    issuer_id: str | None = Field(default=None, max_length=40)
    payer: Payer


class PaymentReceiptResponse(BaseModel):
    """The latest electronic payment of the order: the receipt once approved (E3)."""

    status: Literal["approved", "rejected", "in_process"]
    message: str
    operation_number: str
    amount: Decimal
    card_brand: str | None
    card_last_four: str | None
    created_at: datetime
    approved_at: datetime | None


class ConfirmationResult(BaseModel):
    operation_id: UUID
    replayed: bool


class ArrivalWindow(BaseModel):
    starts_at: datetime
    latest_at: datetime


class ConfirmedOrderItemResponse(BaseModel):
    # None when the dish was deleted after the confirmation.
    dish_id: UUID | None
    name: str
    unit_price: Decimal
    prep_time_minutes: int | None
    quantity: int
    subtotal: Decimal


class OrderDiscountResponse(BaseModel):
    name: str
    amount: Decimal


class OrderResponse(BaseModel):
    arrival_at: datetime
    prep_start_time: datetime
    payment_method: Literal["cash", "online"] | None
    payment_status: Literal["pending", "paid"]
    payment_method_editable: bool
    payment: PaymentReceiptResponse | None = None

    confirmed_at: datetime
    items: list[ConfirmedOrderItemResponse]
    subtotal: Decimal
    promotions: list[OrderDiscountResponse] | None = None
    discount: Decimal | None = None
    total: Decimal
    # The slowest dish with a time; None when no dish has one (P2).
    prep_time_minutes: int | None


class CartItemResponse(BaseModel):
    # None when the dish was deleted after it was saved: the page drops it.
    dish_id: UUID | None
    quantity: int
    name: str
    unit_price: Decimal
    prep_time_minutes: int | None


class CartResponse(BaseModel):
    arrival_at: datetime
    payment_method: Literal["cash", "online"] | None

    updated_at: datetime
    items: list[CartItemResponse]
    subtotal: Decimal
    promotions: list[OrderDiscountResponse] | None = None
    discount: Decimal | None = None
    total: Decimal


class CartSaveResponse(BaseModel):
    # None when an empty cart was saved for a reservation without an order.
    cart: CartResponse | None


class OrderMenuDish(BaseModel):
    id: UUID
    name: str
    description: str | None
    category: str
    price: Decimal
    photo_url: str | None
    dietary_restrictions: list[str]
    prep_time_minutes: int | None


class OrderPageResponse(BaseModel):
    arrival_window: ArrivalWindow
    confirmation: ConfirmationResult | None = None

    reservation: ReservationResponse
    order: OrderResponse | None
    cart: CartResponse | None
    menu: list[OrderMenuDish]


class PaymentResult(BaseModel):
    payment: PaymentReceiptResponse
    page: OrderPageResponse


class PaymentConfigResponse(BaseModel):
    # Public by design: Mercado Pago's card form needs it in the browser. None turns payment off.
    public_key: str | None
