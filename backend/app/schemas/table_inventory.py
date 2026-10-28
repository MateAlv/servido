from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

SeatingArea = Literal["indoor", "outdoor", "terrace"]


# Generous bounds for a real dining room; larger numbers are typing mistakes or abuse.
MAX_TABLE_CAPACITY = 100
MAX_TABLES_PER_GROUP = 200
MAX_GROUPS = 50


class TableInventoryGroupPayload(BaseModel):
    capacity: int = Field(gt=0, le=MAX_TABLE_CAPACITY)
    quantity: int = Field(gt=0, le=MAX_TABLES_PER_GROUP)
    # Groups saved before the seating area existed are indoor (spec 004, edge cases).
    seating_area: SeatingArea = "indoor"
    available: bool = True


class TableInventoryGroupResponse(TableInventoryGroupPayload):
    id: UUID
    free_quantity: int
