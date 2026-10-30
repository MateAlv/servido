from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.order import MAX_UNITS_PER_DISH
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


class OrderRequest(BaseModel):
    """The whole order (or cart): it replaces the previous one."""

    items: list[OrderItemRequest] = Field(max_length=MAX_DISHES)

    @field_validator("items")
    @classmethod
    def one_row_per_dish(cls, items: list[OrderItemRequest]) -> list[OrderItemRequest]:
        if len({item.dish_id for item in items}) != len(items):
            raise ValueError("Cada plato puede aparecer una sola vez en el pedido.")
        return items


class OrderItemResponse(BaseModel):
    # None when the dish was deleted after the confirmation.
    dish_id: UUID | None
    name: str
    unit_price: Decimal
    prep_time_minutes: int | None
    quantity: int
    subtotal: Decimal


class OrderResponse(BaseModel):
    confirmed_at: datetime
    items: list[OrderItemResponse]
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
    updated_at: datetime
    items: list[CartItemResponse]


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
    reservation: ReservationResponse
    order: OrderResponse | None
    cart: CartResponse | None
    menu: list[OrderMenuDish]
