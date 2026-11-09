"""Merge dish management and closures migration heads.

Revision ID: merge_dish_closures_20261109
Revises: eda05205244b, closures_20261108
"""

from collections.abc import Sequence

revision: str = "merge_dish_closures_20261109"
down_revision: str | Sequence[str] | None = ("eda05205244b", "closures_20261108")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
