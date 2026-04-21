"""usage_logs.video_billing_units for duration-weighted video quota

Revision ID: e7f8a9b0c1d2
Revises: 8d0f8eeb7f1b
Create Date: 2026-04-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e7f8a9b0c1d2"
down_revision: Union[str, None] = "8d0f8eeb7f1b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS video_billing_units INTEGER NOT NULL DEFAULT 0"
    )
    op.execute(
        """
        UPDATE usage_logs
        SET video_billing_units = 1
        WHERE action = 'generation'
          AND task_type IN ('text_to_video', 'image_to_video', 'video_to_video')
          AND video_billing_units = 0
        """
    )


def downgrade() -> None:
    op.drop_column("usage_logs", "video_billing_units")
