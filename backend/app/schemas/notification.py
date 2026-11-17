from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: UUID
    kind: str
    message: str
    created_at: datetime
    read_at: datetime | None


class NotificationsResponse(BaseModel):
    notifications: list[NotificationResponse]
