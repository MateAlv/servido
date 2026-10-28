from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.table_inventory import SeatingArea


class SlotResponse(BaseModel):
    # "HH:MM", local to Buenos Aires.
    start_time: str
    # False when no table that seats the party is free for the whole block (US-11 S4).
    available: bool


class AvailabilityResponse(BaseModel):
    restaurant_id: UUID
    date: date
    open: bool
    duration_minutes: int
    max_party_size: int
    slots: list[SlotResponse]


class FreeGroupResponse(BaseModel):
    capacity: int
    seating_area: SeatingArea
    free: int


class TablesAvailabilityResponse(BaseModel):
    restaurant_id: UUID
    date: date
    start_time: str
    ends_at: datetime
    tables: list[FreeGroupResponse]
