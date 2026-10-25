from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import ARRAY, CHAR, CheckConstraint, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Restaurant(Base):
    __tablename__ = "restaurantes"
    __table_args__ = (
        CheckConstraint("length(trim(nombre)) > 0", name="nombre_not_blank"),
        CheckConstraint("cuit ~ '^[0-9]{11}$'", name="cuit_format"),
        CheckConstraint("email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'", name="email_format"),
        CheckConstraint("length(trim(telefono)) > 0", name="telefono_not_blank"),
        # direccion, barrio and tipo_comida are filled in later (US-6, US-8), so they can be empty.
        CheckConstraint(
            "direccion IS NULL OR length(trim(direccion)) > 0", name="direccion_not_blank"
        ),
        CheckConstraint("barrio IS NULL OR length(trim(barrio)) > 0", name="barrio_not_blank"),
        CheckConstraint(
            "tipo_comida IS NULL OR length(trim(tipo_comida)) > 0", name="tipo_comida_not_blank"
        ),
        CheckConstraint("latitud IS NULL OR latitud BETWEEN -90 AND 90", name="latitud_range"),
        CheckConstraint("longitud IS NULL OR longitud BETWEEN -180 AND 180", name="longitud_range"),
        CheckConstraint(
            "(latitud IS NULL AND longitud IS NULL) OR "
            "(latitud IS NOT NULL AND longitud IS NOT NULL)",
            name="coordinates_together",
        ),
    )

    id_restaurante: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    cuit: Mapped[str] = mapped_column(CHAR(11), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    telefono: Mapped[str] = mapped_column(String(30), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    direccion: Mapped[str | None] = mapped_column(String(200), nullable=True)
    barrio: Mapped[str | None] = mapped_column(String(60), nullable=True)
    tipo_comida: Mapped[str | None] = mapped_column(String(60), nullable=True)
    descripcion: Mapped[str | None] = mapped_column(Text, nullable=True)
    rango_precio: Mapped[str | None] = mapped_column(String(10), nullable=True)
    foto_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    restricciones_tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    latitud: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)
    longitud: Mapped[Decimal | None] = mapped_column(Numeric(9, 6), nullable=True)

    @property
    def tipo_cocina(self) -> str | None:
        return self.tipo_comida

    @tipo_cocina.setter
    def tipo_cocina(self, value: str | None) -> None:
        self.tipo_comida = value
