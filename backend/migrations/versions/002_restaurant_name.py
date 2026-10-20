"""Restaurant registration fields and diner names.

Revision ID: 002_restaurant_names
Revises: 001_add_account_tables
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "002_restaurant_names"
down_revision: str | None = "001_add_account_tables"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("comensales", sa.Column("nombre", sa.String(length=60), nullable=True))
    op.create_check_constraint(
        "ck_comensales_nombre_not_blank",
        "comensales",
        "nombre IS NULL OR length(trim(nombre)) > 0",
    )

    # Registration (US-2) asks for the phone, so the column is required. The table has no rows
    # yet because no restaurant could register before this migration.
    op.add_column("restaurantes", sa.Column("telefono", sa.String(length=30), nullable=False))
    op.create_check_constraint(
        "ck_restaurantes_telefono_not_blank",
        "restaurantes",
        "length(trim(telefono)) > 0",
    )
    # Registration does not ask for these yet; they are completed in US-6 and US-8.
    op.alter_column("restaurantes", "direccion", existing_type=sa.String(200), nullable=True)
    op.alter_column("restaurantes", "barrio", existing_type=sa.String(60), nullable=True)
    op.alter_column("restaurantes", "tipo_comida", existing_type=sa.String(60), nullable=True)
    op.drop_constraint("ck_restaurantes_direccion_not_blank", "restaurantes", type_="check")
    op.create_check_constraint(
        "ck_restaurantes_direccion_not_blank",
        "restaurantes",
        "direccion IS NULL OR length(trim(direccion)) > 0",
    )
    op.drop_constraint("ck_restaurantes_barrio_not_blank", "restaurantes", type_="check")
    op.create_check_constraint(
        "ck_restaurantes_barrio_not_blank",
        "restaurantes",
        "barrio IS NULL OR length(trim(barrio)) > 0",
    )
    op.drop_constraint("ck_restaurantes_tipo_comida_not_blank", "restaurantes", type_="check")
    op.create_check_constraint(
        "ck_restaurantes_tipo_comida_not_blank",
        "restaurantes",
        "tipo_comida IS NULL OR length(trim(tipo_comida)) > 0",
    )


def downgrade() -> None:
    op.drop_constraint("ck_restaurantes_tipo_comida_not_blank", "restaurantes", type_="check")
    op.create_check_constraint(
        "ck_restaurantes_tipo_comida_not_blank",
        "restaurantes",
        "length(trim(tipo_comida)) > 0",
    )
    op.drop_constraint("ck_restaurantes_barrio_not_blank", "restaurantes", type_="check")
    op.create_check_constraint(
        "ck_restaurantes_barrio_not_blank", "restaurantes", "length(trim(barrio)) > 0"
    )
    op.drop_constraint("ck_restaurantes_direccion_not_blank", "restaurantes", type_="check")
    op.create_check_constraint(
        "ck_restaurantes_direccion_not_blank", "restaurantes", "length(trim(direccion)) > 0"
    )
    op.alter_column("restaurantes", "tipo_comida", existing_type=sa.String(60), nullable=False)
    op.alter_column("restaurantes", "barrio", existing_type=sa.String(60), nullable=False)
    op.alter_column("restaurantes", "direccion", existing_type=sa.String(200), nullable=False)
    op.drop_constraint("ck_restaurantes_telefono_not_blank", "restaurantes", type_="check")
    op.drop_column("restaurantes", "telefono")
    op.drop_constraint("ck_comensales_nombre_not_blank", "comensales", type_="check")
    op.drop_column("comensales", "nombre")