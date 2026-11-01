from uuid import UUID

from pydantic import BaseModel


class OrderItemResponse(BaseModel):
    dish_name: str
    quantity: int
    prep_time_minutes: int


class RestaurantOrderResponse(BaseModel):
    id: UUID
    reservation_id: UUID
    arrival_time: str
    prep_start_time: str
    prep_time_warning: bool
    items: list[OrderItemResponse]


class OpeningShiftResponse(BaseModel):
    start_time: str
    end_time: str


class RestaurantOrdersResponse(BaseModel):
    shift: OpeningShiftResponse | None
    orders: list[RestaurantOrderResponse]
