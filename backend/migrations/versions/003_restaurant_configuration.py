"""Add restaurant profile, opening shifts and grouped table inventory.

Revision ID: 004_restaurant_configuration
Revises: 003_rest_profile_hours
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "004_restaurant_configuration"
down_revision: str | None = "003_rest_profile_hours"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    restaurant_columns = {column["name"] for column in inspector.get_columns("restaurantes")}
    if "foto_url" not in restaurant_columns:
        op.add_column("restaurantes", sa.Column("foto_url", sa.Text(), nullable=True))
    if "restricciones_tags" not in restaurant_columns:
        op.add_column(
            "restaurantes",
            sa.Column("restricciones_tags", postgresql.ARRAY(sa.String()), nullable=True),
        )
    restaurant_columns = {column["name"] for column in inspector.get_columns("restaurantes")}
    if "descripcion" not in restaurant_columns:
        op.add_column("restaurantes", sa.Column("descripcion", sa.Text(), nullable=True))
    if "rango_precio" not in restaurant_columns:
        op.add_column(
            "restaurantes", sa.Column("rango_precio", sa.String(length=10), nullable=True)
        )
    if "latitud" not in restaurant_columns:
        op.add_column("restaurantes", sa.Column("latitud", sa.Numeric(9, 6), nullable=True))
    if "longitud" not in restaurant_columns:
        op.add_column("restaurantes", sa.Column("longitud", sa.Numeric(9, 6), nullable=True))
    check_names = {check["name"] for check in inspector.get_check_constraints("restaurantes")}
    if not any(name and "latitud_range" in name for name in check_names):
        op.create_check_constraint(
            "ck_restaurantes_latitud_range",
            "restaurantes",
            "latitud IS NULL OR latitud BETWEEN -90 AND 90",
        )
    if not any(name and "longitud_range" in name for name in check_names):
        op.create_check_constraint(
            "ck_restaurantes_longitud_range",
            "restaurantes",
            "longitud IS NULL OR longitud BETWEEN -180 AND 180",
        )
    if not any(name and "coordinates_together" in name for name in check_names):
        op.create_check_constraint(
            "ck_restaurantes_coordinates_together",
            "restaurantes",
            "(latitud IS NULL AND longitud IS NULL) OR "
            "(latitud IS NOT NULL AND longitud IS NOT NULL)",
        )

    tables = set(inspector.get_table_names())
    if "turnos" not in tables:
        op.create_table(
            "turnos",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("day_of_week", sa.SmallInteger(), nullable=False),
            sa.Column("start_time", sa.Time(), nullable=False),
            sa.Column("end_time", sa.Time(), nullable=False),
            sa.Column("active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
            sa.CheckConstraint("day_of_week BETWEEN 1 AND 7", name="ck_turnos_day_of_week_range"),
            sa.CheckConstraint("end_time > start_time", name="ck_turnos_end_after_start"),
            sa.ForeignKeyConstraint(["restaurant_id"], ["restaurantes.id_restaurante"]),
            sa.PrimaryKeyConstraint("id", name="pk_turnos"),
            sa.UniqueConstraint(
                "restaurant_id",
                "day_of_week",
                "start_time",
                "end_time",
                name="uq_turnos_shift_identity",
            ),
        )
    else:
        columns = {column["name"] for column in inspector.get_columns("turnos")}
        for old, new in (
            ("id_turno", "id"),
            ("restaurante_id", "restaurant_id"),
            ("dia_semana", "day_of_week"),
            ("hora_inicio", "start_time"),
            ("hora_fin", "end_time"),
            ("activo", "active"),
        ):
            if old in columns and new not in columns:
                op.alter_column("turnos", old, new_column_name=new)

    if "table_inventory" not in tables:
        if "mesas" in tables:
            op.rename_table("mesas", "table_inventory")
            table_columns = {column["name"] for column in inspector.get_columns("table_inventory")}
            for old, new in (
                ("id_mesa", "id"),
                ("restaurante_id", "restaurant_id"),
                ("capacidad_comensales", "capacity"),
                ("cantidad_mesas", "quantity"),
                ("disponible", "available"),
            ):
                if old in table_columns and new not in table_columns:
                    op.alter_column("table_inventory", old, new_column_name=new)
        else:
            op.create_table(
                "table_inventory",
                sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
                sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
                sa.Column("capacity", sa.Integer(), nullable=False),
                sa.Column("quantity", sa.Integer(), nullable=False),
                sa.Column(
                    "available", sa.Boolean(), server_default=sa.text("true"), nullable=False
                ),
                sa.CheckConstraint("capacity > 0", name="ck_table_inventory_capacity_positive"),
                sa.CheckConstraint("quantity > 0", name="ck_table_inventory_quantity_positive"),
                sa.ForeignKeyConstraint(["restaurant_id"], ["restaurantes.id_restaurante"]),
                sa.PrimaryKeyConstraint("id", name="pk_table_inventory"),
                sa.UniqueConstraint(
                    "restaurant_id",
                    "capacity",
                    name="uq_table_inventory_restaurant_capacity",
                ),
            )


def downgrade() -> None:
    op.drop_table("table_inventory")
    op.drop_table("turnos")
    op.drop_constraint("ck_restaurantes_coordinates_together", "restaurantes", type_="check")
    op.drop_constraint("ck_restaurantes_longitud_range", "restaurantes", type_="check")
    op.drop_constraint("ck_restaurantes_latitud_range", "restaurantes", type_="check")
    for column in (
        "longitud",
        "latitud",
        "restricciones_tags",
        "foto_url",
        "rango_precio",
        "descripcion",
    ):
        if column in {
            item["name"] for item in sa.inspect(op.get_bind()).get_columns("restaurantes")
        }:
            op.drop_column("restaurantes", column)
