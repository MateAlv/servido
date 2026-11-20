from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class OrderItemResponse(BaseModel):
    dish_name: str
    quantity: int
    prep_time_minutes: int
    unit_price: Decimal
    subtotal: Decimal


class OrderPaymentResponse(BaseModel):
    status: Literal["pending", "paid"]
    method: Literal["cash", "online", "No seleccionado"]
    total: Decimal


class OrderDiscountResponse(BaseModel):
    """A promotion applied to the order, frozen at confirmation (spec 028, P4)."""

    name: str
    amount: Decimal


class RestaurantOrderResponse(BaseModel):
    id: UUID
    reservation_id: UUID
    arrival_time: str
    prep_start_time: str
    prep_time_warning: bool
    items: list[OrderItemResponse]
    subtotal: Decimal
    discounts: list[OrderDiscountResponse]
    payment: OrderPaymentResponse


class OpeningShiftResponse(BaseModel):
    start_time: str
    end_time: str


class RestaurantOrdersResponse(BaseModel):
    shift: OpeningShiftResponse | None
    orders: list[RestaurantOrderResponse]


class RestaurantReservationOrderResponse(BaseModel):
    reservation_status: str
    order: RestaurantOrderResponse | None
