from fastapi import APIRouter

from app.api.deps import TokenClaimsDep, require_diner
from app.db import SessionDep
from app.schemas.notification import NotificationResponse, NotificationsResponse
from app.services.notifications import diner_notifications

router = APIRouter(tags=["notification"])


@router.get("/notificaciones", response_model=NotificationsResponse)
def list_notifications(claims: TokenClaimsDep, session: SessionDep) -> NotificationsResponse:
    diner_id = require_diner(claims, session)
    return NotificationsResponse(
        notifications=[
            NotificationResponse(
                id=item.id,
                kind=item.kind,
                message=item.message,
                created_at=item.created_at,
                read_at=item.read_at,
            )
            for item in diner_notifications(session, diner_id)
        ]
    )
