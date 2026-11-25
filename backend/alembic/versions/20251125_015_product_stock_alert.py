"""product stock_alert_at

Revision ID: 20251125_015
Revises: 20251125_014
Create Date: 2025-11-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20251125_015"
down_revision: Union[str, Sequence[str], None] = "20251125_014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "products",
        sa.Column("stock_alert_at", sa.Integer(), server_default=sa.text("5"), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("products", "stock_alert_at")