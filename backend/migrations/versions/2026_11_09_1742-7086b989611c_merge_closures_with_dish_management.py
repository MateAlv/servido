"""merge closures with dish management

Revision ID: 7086b989611c
Revises: eda05205244b, closures_20261108
Create Date: 2026-11-09 17:42:10.899243

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "7086b989611c"
down_revision: str | Sequence[str] | None = ("eda05205244b", "closures_20261108")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
