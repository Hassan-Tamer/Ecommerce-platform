"""argon2: drop salt, widen password

Revision ID: 20251118_002
Revises: 20251118_001
Create Date: 2025-11-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20251118_002"
down_revision: Union[str, Sequence[str], None] = "20251118_001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("users", "salt")
    op.alter_column(
        "users",
        "password",
        existing_type=sa.String(length=255),
        type_=sa.String(length=512),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "users",
        "password",
        existing_type=sa.String(length=512),
        type_=sa.String(length=255),
        existing_nullable=False,
    )
    op.add_column("users", sa.Column("salt", sa.String(length=64), nullable=False, server_default=""))

    op.alter_column("users", "salt", server_default=None)