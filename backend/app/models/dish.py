from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    JSON,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Dish(Base):
    __tablename__ = "platos"
    __table_args__ = (
        UniqueConstraint("id_restaurante", "nombre", name="uq_platos_restaurante_nombre"),
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
    tiempo_preparacion_minutos: Mapped[int | None] = mapped_column(nullable=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
