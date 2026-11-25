"""coupon_redemptions table

Revision ID: 20251125_016
Revises: 20251125_015
Create Date: 2025-11-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20251125_016"
down_revision: Union[str, Sequence[str], None] = "20251125_015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "coupon_redemptions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("coupon_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("order_id", sa.Integer(), nullable=False),
        sa.Column("discount_amount", sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("discount_amount >= 0", name="ck_coupon_redemption_discount_nonneg"),
        sa.ForeignKeyConstraint(["coupon_id"], ["coupons.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("order_id"),
    )
    op.create_index("ix_coupon_redemptions_coupon", "coupon_redemptions", ["coupon_id"], unique=False)
    op.create_index(
        "ix_coupon_redemptions_user_coupon",
        "coupon_redemptions",
        ["user_id", "coupon_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_coupon_redemptions_user_coupon", table_name="coupon_redemptions")
    op.drop_index("ix_coupon_redemptions_coupon", table_name="coupon_redemptions")
    op.drop_table("coupon_redemptions")