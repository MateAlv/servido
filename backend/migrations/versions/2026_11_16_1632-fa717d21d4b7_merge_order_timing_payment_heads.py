"""merge order timing payment heads

Revision ID: fa717d21d4b7
Revises: 459c8cb1f9cf, aaf078a8d618
Create Date: 2026-11-16 16:32:14.622714

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "fa717d21d4b7"
down_revision: str | Sequence[str] | None = ("459c8cb1f9cf", "aaf078a8d618")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
