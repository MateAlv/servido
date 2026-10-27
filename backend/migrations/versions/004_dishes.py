"""Add restaurant dishes.

Revision ID: 004_dishes
Revises: 003_email_verification
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "004_dishes"
down_revision: str | None = "003_email_verification"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "platos",
        sa.Column("id_plato", sa.UUID(), nullable=False),
        sa.Column("id_restaurante", sa.UUID(), nullable=False),
        sa.Column("nombre", sa.String(length=150), nullable=False),
        sa.Column("descripcion", sa.Text(), nullable=True),
        sa.Column("categoria", sa.String(length=30), nullable=False),
        sa.Column("precio", sa.Numeric(10, 2), nullable=False),
        sa.Column("foto_url", sa.String(length=255), nullable=True),
        sa.Column("restricciones_alimenticias", sa.JSON(), nullable=False),
        sa.Column("tiempo_preparacion_minutos", sa.Integer(), nullable=True),
        sa.Column("creado_en", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("length(trim(nombre)) > 0", name="ck_platos_nombre_not_blank"),
        sa.CheckConstraint("precio > 0", name="ck_platos_precio_positive"),
        sa.CheckConstraint(
            "tiempo_preparacion_minutos IS NULL OR tiempo_preparacion_minutos > 0",
            name="ck_platos_tiempo_preparacion_positive",
        ),
        sa.ForeignKeyConstraint(
            ["id_restaurante"], ["restaurantes.id_restaurante"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id_plato", name="pk_platos"),
        sa.UniqueConstraint("id_restaurante", "nombre", name="uq_platos_restaurante_nombre"),
    )


def downgrade() -> None:
    op.drop_table("platos")
