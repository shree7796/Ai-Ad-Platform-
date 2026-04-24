"""Register image_to_3d on Fal AI model row for router.

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-24

"""
from typing import Sequence, Union

from alembic import op

revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, None] = "c3d4e5f6a7b8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE ai_models
        SET supported_tasks = supported_tasks || '["image_to_3d"]'::jsonb
        WHERE provider = 'fal'
          AND NOT (supported_tasks @> '["image_to_3d"]'::jsonb)
        """
    )


def downgrade() -> None:
    op.execute(
        """
        UPDATE ai_models
        SET supported_tasks = COALESCE(
            (
                SELECT jsonb_agg(to_jsonb(elem))
                FROM jsonb_array_elements_text(supported_tasks) AS t(elem)
                WHERE elem IS DISTINCT FROM 'image_to_3d'
            ),
            '[]'::jsonb
        )
        WHERE provider = 'fal'
          AND (supported_tasks @> '["image_to_3d"]'::jsonb)
        """
    )
