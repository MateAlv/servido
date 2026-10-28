from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

SeatingArea = Literal["indoor", "outdoor", "terrace"]


class TableInventoryGroupPayload(BaseModel):
    capacity: int = Field(gt=0)
    quantity: int = Field(gt=0)
    # Groups saved before the seating area existed are indoor (spec 004, edge cases).
    seating_area: SeatingArea = "indoor"
    available: bool = True


class TableInventoryGroupResponse(TableInventoryGroupPayload):
    id: UUID
    free_quantity: int
