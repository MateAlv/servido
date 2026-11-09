"""Add dish removal and revision (US-34).

Revision ID: b5093dac541b
Revises: e0e674653e2f
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "b5093dac541b"
down_revision: str | Sequence[str] | None = "e0e674653e2f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("platos", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("platos", sa.Column("revision", sa.Integer(), server_default="1", nullable=False))
    op.drop_constraint("uq_platos_restaurante_nombre", "platos", type_="unique")
    op.create_index(
        "uq_platos_live_restaurante_nombre",
        "platos",
        ["id_restaurante", "nombre"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_check_constraint("revision_positive", "platos", "revision > 0")
    op.create_check_constraint(
        "deleted_unavailable", "platos", "deleted_at IS NULL OR disponible = false"
    )


def downgrade() -> None:
    # Reused names cannot satisfy the old constraint. Never erase historical rows to fit it.
    duplicate = (
        op.get_bind()
        .execute(
            sa.text(
                "SELECT 1 FROM platos GROUP BY id_restaurante, nombre HAVING count(*) > 1 LIMIT 1"
            )
        )
        .first()
    )
    if duplicate:
        raise RuntimeError(
            "Cannot downgrade: removed dish names were reused. "
            "Resolve duplicate names explicitly while preserving historical rows before retrying."
        )
    op.drop_constraint(op.f("ck_platos_deleted_unavailable"), "platos", type_="check")
    op.drop_constraint(op.f("ck_platos_revision_positive"), "platos", type_="check")
    op.drop_index("uq_platos_live_restaurante_nombre", table_name="platos")
    op.create_unique_constraint(
        "uq_platos_restaurante_nombre", "platos", ["id_restaurante", "nombre"]
    )
    op.drop_column("platos", "revision")
    op.drop_column("platos", "deleted_at")
