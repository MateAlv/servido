from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, String, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Diner(Base):
    __tablename__ = "comensales"
    __table_args__ = (
        CheckConstraint("email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'", name="email_format"),
    )

    id_comensal: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    fecha_registro: Mapped[datetime] = mapped_column(
        server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
