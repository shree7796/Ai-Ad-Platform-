"""Add ai_models and multi_modal fields

Revision ID: 8d0f8eeb7f1b
Revises: f8114a0e35bd
Create Date: 2026-04-06 13:44:54.282722

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d0f8eeb7f1b'
down_revision: Union[str, None] = 'f8114a0e35bd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use IF NOT EXISTS so this migration is safe to run against a DB that
    # already has these columns (e.g. was seeded outside of Alembic tracking).
    op.execute("ALTER TABLE scenes    ADD COLUMN IF NOT EXISTS task_type     VARCHAR(50)")
    op.execute("ALTER TABLE scenes    ADD COLUMN IF NOT EXISTS provider_used VARCHAR(50)")
    op.execute("ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS task_type     VARCHAR(50)")
    op.execute("ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS provider_used VARCHAR(50)")


def downgrade() -> None:
    op.drop_column('usage_logs', 'provider_used')
    op.drop_column('usage_logs', 'task_type')
    op.drop_column('scenes', 'provider_used')
    op.drop_column('scenes', 'task_type')
