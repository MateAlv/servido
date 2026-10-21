"""Add diner and restaurant account tables.

Revision ID: 001_add_account_tables
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001_add_account_tables"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "comensales",
        sa.Column("id_comensal", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column(
            "fecha_registro",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'",
            name="ck_comensales_email_format",
        ),
        sa.PrimaryKeyConstraint("id_comensal", name="pk_comensales"),
        sa.UniqueConstraint("email", name="uq_comensales_email"),
    )
    op.create_table(
        "restaurantes",
        sa.Column("id_restaurante", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nombre", sa.String(length=150), nullable=False),
        sa.Column("cuit", sa.CHAR(length=11), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("direccion", sa.String(length=200), nullable=False),
        sa.Column("barrio", sa.String(length=60), nullable=False),
        sa.Column("tipo_comida", sa.String(length=60), nullable=False),
        sa.CheckConstraint("length(trim(nombre)) > 0", name="ck_restaurantes_nombre_not_blank"),
        sa.CheckConstraint("cuit ~ '^[0-9]{11}$'", name="ck_restaurantes_cuit_format"),
        sa.CheckConstraint(
            "email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'",
            name="ck_restaurantes_email_format",
        ),
        sa.CheckConstraint(
            "length(trim(direccion)) > 0",
            name="ck_restaurantes_direccion_not_blank",
        ),
        sa.CheckConstraint("length(trim(barrio)) > 0", name="ck_restaurantes_barrio_not_blank"),
        sa.CheckConstraint(
            "length(trim(tipo_comida)) > 0",
            name="ck_restaurantes_tipo_comida_not_blank",
        ),
        sa.PrimaryKeyConstraint("id_restaurante", name="pk_restaurantes"),
        sa.UniqueConstraint("cuit", name="uq_restaurantes_cuit"),
        sa.UniqueConstraint("email", name="uq_restaurantes_email"),
    )


def downgrade() -> None:
    op.drop_table("restaurantes")
    op.drop_table("comensales")
