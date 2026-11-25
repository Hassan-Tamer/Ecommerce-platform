"""user profile fields

Revision ID: 20251125_013
Revises: 20251125_012
Create Date: 2025-11-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20251125_013"
down_revision: Union[str, Sequence[str], None] = "20251125_012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("photo", sa.String(length=512), nullable=True))
    op.add_column("users", sa.Column("street", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("city", sa.String(length=128), nullable=True))
    op.add_column("users", sa.Column("apartment_number", sa.String(length=32), nullable=True))
    op.add_column("users", sa.Column("floor", sa.String(length=16), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "floor")
    op.drop_column("users", "apartment_number")
    op.drop_column("users", "city")
    op.drop_column("users", "street")
    op.drop_column("users", "photo")
    op.drop_column("users", "phone")
