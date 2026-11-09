from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, Field


class ClosureRequest(BaseModel):
    date: date
    start_time: time | None = None
    end_time: time | None = None
    request_id: UUID
    confirmed: bool = False
    acknowledged_reservation_ids: list[UUID] = Field(default_factory=list)


class ClosureResponse(BaseModel):
    id: UUID
    date: date
    start_time: time | None
    end_time: time | None
    all_day: bool
    created_at: datetime


class ClosureListResponse(BaseModel):
    closures: list[ClosureResponse]


class AffectedReservation(BaseModel):
    reservation_id: UUID
    date: date
    start_time: str
    end_time: str
    party_size: int


class ClosureWarningDetail(BaseModel):
    message: str
    reservations: list[AffectedReservation]


class ClosureWarningResponse(BaseModel):
    detail: ClosureWarningDetail
