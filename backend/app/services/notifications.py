from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.notification import Notification


def diner_notifications(session: Session, diner_id: UUID) -> list[Notification]:
    return list(
        session.scalars(
            select(Notification)
            .where(Notification.diner_id == diner_id)
            .order_by(Notification.created_at.desc(), Notification.id.desc())
        )
    )
