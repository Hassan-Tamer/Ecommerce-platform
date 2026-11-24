"""announcements: fractional sort_key replaces integer sort_order

Revision ID: 20251124_008
Revises: 20251124_007
Create Date: 2025-11-24

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from fractional_indexing import generate_n_keys_between

revision: str = "20251124_008"
down_revision: Union[str, Sequence[str], None] = "20251124_007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "announcements",
        sa.Column("sort_key", sa.String(length=255), nullable=True),
    )

    bind = op.get_bind()
    rows = bind.execute(
        sa.text("SELECT id FROM announcements ORDER BY sort_order ASC, id ASC")
    ).fetchall()
    if rows:
        keys = generate_n_keys_between(None, None, len(rows))
        for (row_id,), key in zip(rows, keys):
            bind.execute(
                sa.text("UPDATE announcements SET sort_key = :key WHERE id = :id"),
                {"key": key, "id": row_id},
            )

    op.alter_column("announcements", "sort_key", nullable=False)
    op.create_index(op.f("ix_announcements_sort_key"), "announcements", ["sort_key"], unique=False)
    op.drop_column("announcements", "sort_order")


def downgrade() -> None:
    op.add_column(
        "announcements",
        sa.Column("sort_order", sa.Integer(), server_default="0", nullable=False),
    )

    bind = op.get_bind()
    rows = bind.execute(
        sa.text("SELECT id FROM announcements ORDER BY sort_key ASC, id ASC")
    ).fetchall()
    for index, (row_id,) in enumerate(rows):
        bind.execute(
            sa.text("UPDATE announcements SET sort_order = :order WHERE id = :id"),
            {"order": index, "id": row_id},
        )

    op.alter_column("announcements", "sort_order", server_default=None)
    op.drop_index(op.f("ix_announcements_sort_key"), table_name="announcements")
    op.drop_column("announcements", "sort_key")