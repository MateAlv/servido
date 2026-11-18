"""merge restaurant reservation orders heads

Revision ID: 1ed1414db772
Revises: 39c7c8c67f54
Create Date: 2026-11-18 02:37:01.080081

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "1ed1414db772"
down_revision: str | Sequence[str] | None = "39c7c8c67f54"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
