"""merge dish management with reviews and terms

Revision ID: eda05205244b
Revises: b5093dac541b, merge_reviews_terms_20261107
Create Date: 2026-11-08 01:41:23.428416

"""

from collections.abc import Sequence

# revision identifiers, used by Alembic.
revision: str = "eda05205244b"
down_revision: str | Sequence[str] | None = ("b5093dac541b", "merge_reviews_terms_20261107")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
