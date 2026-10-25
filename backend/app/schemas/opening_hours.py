from datetime import time
from uuid import UUID

from pydantic import BaseModel, Field


class OpeningShiftPayload(BaseModel):
    day_of_week: int = Field(ge=1, le=7)
    start_time: time
    end_time: time
    active: bool = True


class OpeningHoursResponse(OpeningShiftPayload):
    id: UUID
