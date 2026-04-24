"""Add Token Ledger & Reserved Balance

Revision ID: a1b2c3d4e5f6
Revises: e7f8a9b0c1d2
Create Date: 2026-04-21

Adds:
  - users.credit_balance  (INTEGER NOT NULL DEFAULT 0)
  - users.reserved_balance (INTEGER NOT NULL DEFAULT 0)
  - CHECK constraints preventing negative balances
  - credit_transactions ledger table
All statements are idempotent (IF NOT EXISTS / DO...EXCEPTION) so this
migration is safe to re-run against a DB that was already partially seeded
by SQLAlchemy's create_all() in development mode.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "e7f8a9b0c1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Enum type (idempotent) ────────────────────────────────────────────
    op.execute(sa.text(
        "DO $$ BEGIN "
        "  CREATE TYPE transactionstatus AS ENUM "
        "    ('pending','completed','failed','cancelled'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; "
        "END $$;"
    ))

    # ── 2. credit_transactions table (idempotent) ────────────────────────────
    op.execute(sa.text(
        """
        CREATE TABLE IF NOT EXISTS credit_transactions (
            id              UUID          PRIMARY KEY,
            user_id         UUID          NOT NULL
                                REFERENCES users(id) ON DELETE CASCADE,
            delta           INTEGER       NOT NULL,
            reason          VARCHAR(255)  NOT NULL,
            status          transactionstatus NOT NULL DEFAULT 'pending',
            job_id          VARCHAR(255),
            notes           TEXT,
            created_at      TIMESTAMP     NOT NULL DEFAULT NOW(),
            updated_at      TIMESTAMP     NOT NULL DEFAULT NOW()
        )
        """
    ))
    op.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_credit_transactions_user_id "
        "ON credit_transactions(user_id)"
    ))
    op.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_credit_transactions_job_id "
        "ON credit_transactions(job_id)"
    ))

    # ── 3. users- credit ledger columns (idempotent) ───────────────────────
    op.execute(sa.text(
        "ALTER TABLE users "
        "ADD COLUMN IF NOT EXISTS credit_balance  INTEGER NOT NULL DEFAULT 0"
    ))
    op.execute(sa.text(
        "ALTER TABLE users "
        "ADD COLUMN IF NOT EXISTS reserved_balance INTEGER NOT NULL DEFAULT 0"
    ))

    # ── 4. CHECK constraints (idempotent) ────────────────────────────────────
    op.execute(sa.text(
        "DO $$ BEGIN "
        "  ALTER TABLE users ADD CONSTRAINT ck_users_credit_balance_non_negative "
        "    CHECK (credit_balance >= 0); "
        "EXCEPTION WHEN duplicate_object THEN NULL; "
        "END $$;"
    ))
    op.execute(sa.text(
        "DO $$ BEGIN "
        "  ALTER TABLE users ADD CONSTRAINT ck_users_reserved_balance_non_negative "
        "    CHECK (reserved_balance >= 0); "
        "EXCEPTION WHEN duplicate_object THEN NULL; "
        "END $$;"
    ))


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS ix_credit_transactions_job_id"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_credit_transactions_user_id"))
    op.execute(sa.text("DROP TABLE IF EXISTS credit_transactions"))
    op.execute(sa.text(
        "ALTER TABLE users DROP COLUMN IF EXISTS reserved_balance"
    ))
    op.execute(sa.text(
        "ALTER TABLE users DROP COLUMN IF EXISTS credit_balance"
    ))
    op.execute(sa.text("DROP TYPE IF EXISTS transactionstatus"))
