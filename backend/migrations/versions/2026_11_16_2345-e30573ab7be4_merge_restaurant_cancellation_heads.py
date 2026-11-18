"""merge restaurant cancellation heads

Revision ID: e30573ab7be4
Revises: 425ba981ed88, fa717d21d4b7
Create Date: 2026-11-16 23:45:59.480266

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "e30573ab7be4"
down_revision: str | Sequence[str] | None = ("425ba981ed88", "fa717d21d4b7")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
