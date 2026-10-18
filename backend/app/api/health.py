from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app.db import SessionDep

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    status: str
    database: str


@router.get("/health")
def health(session: SessionDep) -> HealthResponse:
    session.execute(text("SELECT 1"))
    return HealthResponse(status="ok", database="ok")
