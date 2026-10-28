"""Seating area of table groups and reservations (spec 005, US-13; decisions of 28/10).

Revision ID: 006_reservations
Revises: 005_merge_feature_heads
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "006_reservations"
down_revision: str | None = "005_merge_feature_heads"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SEATING_AREA_KNOWN = "seating_area IN ('indoor', 'outdoor', 'terrace')"


def upgrade() -> None:
    # The exclusion constraint compares uuid, integer and varchar columns with = in a GiST index.
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")

    # Groups loaded before the seating area existed become indoor (spec 004, edge cases).
    op.add_column(
        "table_inventory",
        sa.Column("seating_area", sa.String(length=20), server_default="indoor", nullable=False),
    )
    op.create_check_constraint(
        op.f("ck_table_inventory_seating_area_known"), "table_inventory", SEATING_AREA_KNOWN
    )
    # The API accepts at most 100 seats and 200 tables per group: a bigger group could exhaust the
    # server's memory when a reservation looks for a free table.
    op.create_check_constraint(
        op.f("ck_table_inventory_within_bounds"),
        "table_inventory",
        "capacity <= 100 AND quantity <= 200",
    )
    op.drop_constraint("uq_table_inventory_restaurant_capacity", "table_inventory", type_="unique")
    op.create_unique_constraint(
        "uq_table_inventory_restaurant_capacity_area",
        "table_inventory",
        ["restaurant_id", "capacity", "seating_area"],
    )

    op.create_table(
        "reservations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("diner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("restaurant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("table_capacity", sa.Integer(), nullable=False),
        sa.Column("seating_area", sa.String(length=20), nullable=False),
        sa.Column("table_number", sa.Integer(), nullable=False),
        sa.Column("party_size", sa.Integer(), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="confirmed", nullable=False),
        sa.Column("request_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "table_capacity > 0", name=op.f("ck_reservations_table_capacity_positive")
        ),
        sa.CheckConstraint("table_number > 0", name=op.f("ck_reservations_table_number_positive")),
        sa.CheckConstraint(
            "party_size > 0 AND party_size <= table_capacity",
            name=op.f("ck_reservations_party_size_fits_table"),
        ),
        sa.CheckConstraint(SEATING_AREA_KNOWN, name=op.f("ck_reservations_seating_area_known")),
        sa.CheckConstraint(
            "ends_at - starts_at = INTERVAL '90 minutes'",
            name=op.f("ck_reservations_lasts_90_minutes"),
        ),
        sa.CheckConstraint(
            "status IN ('confirmed', 'cancelled')", name=op.f("ck_reservations_status_known")
        ),
        postgresql.ExcludeConstraint(
            (sa.column("restaurant_id"), "="),
            (sa.column("table_capacity"), "="),
            (sa.column("seating_area"), "="),
            (sa.column("table_number"), "="),
            (sa.text("tstzrange(starts_at, ends_at)"), "&&"),
            where=sa.text("status = 'confirmed'"),
            using="gist",
            name="ex_reservations_table_no_overlap",
        ),
        sa.ForeignKeyConstraint(
            ["diner_id"],
            ["comensales.id_comensal"],
            name="fk_reservations_diner_id_comensales",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["restaurant_id"],
            ["restaurantes.id_restaurante"],
            name="fk_reservations_restaurant_id_restaurantes",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id", name="pk_reservations"),
        sa.UniqueConstraint("request_id", name="uq_reservations_request_id"),
    )
    op.create_index(
        "ix_reservations_restaurant_id_starts_at", "reservations", ["restaurant_id", "starts_at"]
    )
    op.create_index("ix_reservations_diner_id_starts_at", "reservations", ["diner_id", "starts_at"])


def downgrade() -> None:
    op.drop_table("reservations")
    op.drop_constraint(
        "uq_table_inventory_restaurant_capacity_area", "table_inventory", type_="unique"
    )
    op.drop_constraint(
        op.f("ck_table_inventory_seating_area_known"), "table_inventory", type_="check"
    )
    op.drop_constraint(op.f("ck_table_inventory_within_bounds"), "table_inventory", type_="check")
    op.drop_column("table_inventory", "seating_area")
    # Fails if a restaurant has two groups of one capacity in different seating areas: merge them
    # by hand first, since the old key can't hold both.
    op.create_unique_constraint(
        "uq_table_inventory_restaurant_capacity", "table_inventory", ["restaurant_id", "capacity"]
    )
    # btree_gist stays: removing an extension other objects may use is not this migration's job.
