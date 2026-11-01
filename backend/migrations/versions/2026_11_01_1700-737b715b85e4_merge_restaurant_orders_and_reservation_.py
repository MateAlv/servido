"""merge restaurant orders and reservation cancellation

Revision ID: 737b715b85e4
Revises: 007_reservation_cancellation, d43ba10815e7
Create Date: 2026-11-01 17:00:06.644317

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '737b715b85e4'
down_revision: Union[str, Sequence[str], None] = ('007_reservation_cancellation', 'd43ba10815e7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
