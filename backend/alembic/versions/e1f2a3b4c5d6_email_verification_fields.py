"""Add email verification fields to users table.

Revision ID: e1f2a3b4c5d6
Revises: d4e5f6a7b8c9
Create Date: 2026-04-24

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "users",
        sa.Column("email_verify_token", sa.String(128), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("email_verify_expires_at", sa.DateTime(), nullable=True),
    )
    op.create_index(
        "ix_users_email_verify_token",
        "users",
        ["email_verify_token"],
        unique=False,
    )

    # Mark all existing users as verified so they are not locked out
    op.execute("UPDATE users SET email_verified = true")


def downgrade() -> None:
    op.drop_index("ix_users_email_verify_token", table_name="users")
    op.drop_column("users", "email_verify_expires_at")
    op.drop_column("users", "email_verify_token")
    op.drop_column("users", "email_verified")
