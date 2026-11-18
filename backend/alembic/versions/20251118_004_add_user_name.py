"""add user name

Revision ID: 20251118_004
Revises: 20251118_003
Create Date: 2025-11-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20251118_004"
down_revision: Union[str, Sequence[str], None] = "20251118_003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("name", sa.String(length=255), nullable=False, server_default=""))
    op.alter_column("users", "name", server_default=None)


def downgrade() -> None:
    op.drop_column("users", "name")