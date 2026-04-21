"""Add idempotency_key to scenes and bonus credit columns to users.

Revision ID: c3d4e5f6a7b8
Revises: a1b2c3d4e5f6
Create Date: 2026-04-21

Changes:
  - scenes.idempotency_key  VARCHAR(100) UNIQUE NULLABLE
  - users.bonus_credit_balance  INTEGER NOT NULL DEFAULT 0
  - users.bonus_credits_expire_at  TIMESTAMP NULLABLE
  - CHECK CONSTRAINT: bonus_credit_balance >= 0
"""

from alembic import op
import sqlalchemy as sa

revision = "c3d4e5f6a7b8"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── scenes.idempotency_key ────────────────────────────────────────────────
    op.execute(sa.text("""
        ALTER TABLE scenes
        ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
    """))

    # Unique index (idempotent — skip if exists)
    op.execute(sa.text("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_indexes
                WHERE tablename = 'scenes'
                  AND indexname = 'uq_scenes_idempotency_key'
            ) THEN
                CREATE UNIQUE INDEX uq_scenes_idempotency_key
                ON scenes (idempotency_key)
                WHERE idempotency_key IS NOT NULL;
            END IF;
        END $$;
    """))

    # ── users.bonus_credit_balance ────────────────────────────────────────────
    op.execute(sa.text("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS bonus_credit_balance INTEGER NOT NULL DEFAULT 0;
    """))

    # ── users.bonus_credits_expire_at ─────────────────────────────────────────
    op.execute(sa.text("""
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS bonus_credits_expire_at TIMESTAMP;
    """))

    # ── CHECK CONSTRAINT on bonus_credit_balance ──────────────────────────────
    op.execute(sa.text("""
        DO $$ BEGIN
            ALTER TABLE users
            ADD CONSTRAINT ck_users_bonus_credit_balance_non_negative
            CHECK (bonus_credit_balance >= 0);
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
    """))


def downgrade() -> None:
    op.execute(sa.text("""
        DO $$ BEGIN
            ALTER TABLE users
            DROP CONSTRAINT IF EXISTS ck_users_bonus_credit_balance_non_negative;
        EXCEPTION WHEN OTHERS THEN NULL;
        END $$;
    """))
    op.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS bonus_credits_expire_at;"))
    op.execute(sa.text("ALTER TABLE users DROP COLUMN IF EXISTS bonus_credit_balance;"))
    op.execute(sa.text("DROP INDEX IF EXISTS uq_scenes_idempotency_key;"))
    op.execute(sa.text("ALTER TABLE scenes DROP COLUMN IF EXISTS idempotency_key;"))
