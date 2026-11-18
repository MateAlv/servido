"""merge restaurant reservation orders with main

Revision ID: 05189283b55a
Revises: f308f442dab2, 1ed1414db772
Create Date: 2026-11-18 02:50:03.267745

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "05189283b55a"
down_revision: str | Sequence[str] | None = ("f308f442dab2", "1ed1414db772")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
