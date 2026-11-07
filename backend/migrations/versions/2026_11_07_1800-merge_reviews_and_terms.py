"""Merge the reviews and terms acceptance migration heads."""

from collections.abc import Sequence


revision: str = "merge_reviews_terms_20261107"
down_revision: tuple[str, str] = ("22117b0a75c1", "terms_acceptance_20261105")
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
