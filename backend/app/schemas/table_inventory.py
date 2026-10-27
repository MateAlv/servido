from uuid import UUID

from pydantic import BaseModel, Field


class TableInventoryGroupPayload(BaseModel):
    capacity: int = Field(gt=0)
    quantity: int = Field(gt=0)
    available: bool = True


class TableInventoryGroupResponse(TableInventoryGroupPayload):
    id: UUID
    free_quantity: int
