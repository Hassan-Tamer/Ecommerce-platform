"""wishlist_items composite (user_id, product_id)

Revision ID: 20251124_009
Revises: 20251124_008
Create Date: 2025-11-24

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20251124_009"
down_revision: Union[str, Sequence[str], None] = "20251124_008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "wishlist_items",
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "product_id"),
    )
    op.create_index("ix_wishlist_items_product_id", "wishlist_items", ["product_id"])


def downgrade() -> None:
    op.drop_index("ix_wishlist_items_product_id", table_name="wishlist_items")
    op.drop_table("wishlist_items")