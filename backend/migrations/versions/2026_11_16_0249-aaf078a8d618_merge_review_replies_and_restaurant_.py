"""merge review replies and restaurant verification heads

Revision ID: aaf078a8d618
Revises: 7e2b5f74c131, adcf6e505647
Create Date: 2026-11-16 02:49:14.534405

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "aaf078a8d618"
down_revision: str | Sequence[str] | None = ("7e2b5f74c131", "adcf6e505647")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
