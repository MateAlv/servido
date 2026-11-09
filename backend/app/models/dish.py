from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    text,
    true,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Dish(Base):
    __tablename__ = "platos"
    __table_args__ = (
        Index(
            "uq_platos_live_restaurante_nombre",
            "id_restaurante",
            "nombre",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        CheckConstraint("revision > 0", name="revision_positive"),
        CheckConstraint("deleted_at IS NULL OR disponible = false", name="deleted_unavailable"),
        CheckConstraint("length(trim(nombre)) > 0", name="nombre_not_blank"),
        CheckConstraint("precio > 0", name="precio_positive"),
        CheckConstraint(
            "tiempo_preparacion_minutos IS NULL OR tiempo_preparacion_minutos > 0",
            name="tiempo_preparacion_positive",
        ),
    )

    id_plato: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    id_restaurante: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("restaurantes.id_restaurante", ondelete="CASCADE"),
        nullable=False,
    )
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    categoria: Mapped[str] = mapped_column(String(30), nullable=False)
    precio: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    foto_url: Mapped[str | None] = mapped_column(String(255), nullable=True)
    restricciones_alimenticias: Mapped[list[str]] = mapped_column(
        JSON, nullable=False, default=list
    )
    disponible: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=true()
    )
    tiempo_preparacion_minutos: Mapped[int | None] = mapped_column(nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revision: Mapped[int] = mapped_column(nullable=False, default=1, server_default="1")
