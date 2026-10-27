"""Compatibility marker for the configuration migration previously applied locally.

Revision ID: 003_rest_profile_hours
Revises: 002_restaurant_names
"""

from collections.abc import Sequence

revision: str = "003_rest_profile_hours"
down_revision: str | None = "002_restaurant_names"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
