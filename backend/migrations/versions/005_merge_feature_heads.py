"""Merge restaurant configuration and dishes migration branches.

Revision ID: 005_merge_feature_heads
Revises: 004_restaurant_configuration, 004_dishes
"""

from collections.abc import Sequence

revision: str = "005_merge_feature_heads"
down_revision: tuple[str, str] = ("004_restaurant_configuration", "004_dishes")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
