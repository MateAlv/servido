from uuid import UUID, uuid4

from sqlalchemy import CHAR, CheckConstraint, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Restaurant(Base):
    __tablename__ = "restaurantes"
    __table_args__ = (
        CheckConstraint("length(trim(nombre)) > 0", name="nombre_not_blank"),
        CheckConstraint("cuit ~ '^[0-9]{11}$'", name="cuit_format"),
        CheckConstraint("email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'", name="email_format"),
        CheckConstraint("length(trim(direccion)) > 0", name="direccion_not_blank"),
        CheckConstraint("length(trim(barrio)) > 0", name="barrio_not_blank"),
        CheckConstraint("length(trim(tipo_comida)) > 0", name="tipo_comida_not_blank"),
    )

    id_restaurante: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True), primary_key=True, default=uuid4
    )
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    cuit: Mapped[str] = mapped_column(CHAR(11), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    direccion: Mapped[str] = mapped_column(String(200), nullable=False)
    barrio: Mapped[str] = mapped_column(String(60), nullable=False)
    tipo_comida: Mapped[str] = mapped_column(String(60), nullable=False)
