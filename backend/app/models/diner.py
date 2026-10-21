from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, DateTime, String, text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Diner(Base):
    __tablename__ = "comensales"
    __table_args__ = (
        CheckConstraint("email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'", name="email_format"),
        # Nullable only for accounts created before the name was asked at registration.
        CheckConstraint("nombre IS NULL OR length(trim(nombre)) > 0", name="nombre_not_blank"),
    )

    id_comensal: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    nombre: Mapped[str | None] = mapped_column(String(60), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    fecha_registro: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("CURRENT_TIMESTAMP"), nullable=False
    )
