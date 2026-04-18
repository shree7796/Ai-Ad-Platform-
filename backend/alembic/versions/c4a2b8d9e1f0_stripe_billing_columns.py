"""Stripe billing columns on users and subscriptions

Revision ID: c4a2b8d9e1f0
Revises: 8d0f8eeb7f1b
Create Date: 2026-04-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c4a2b8d9e1f0"
down_revision: Union[str, None] = "8d0f8eeb7f1b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(length=255), nullable=True))
    op.add_column(
        "subscriptions",
        sa.Column("stripe_subscription_id", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "subscriptions",
        sa.Column("stripe_price_id", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("subscriptions", "stripe_price_id")
    op.drop_column("subscriptions", "stripe_subscription_id")
    op.drop_column("users", "stripe_customer_id")
