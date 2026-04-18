#!/usr/bin/env python3
"""
Create (or upgrade) a test admin user for local / QA use.

Loads env from the repository root `.env` if present, then uses the same DB URL as the API.

Default login (override with env vars):
  TEST_ADMIN_EMAIL    default: admin@test.klypse.ai
  TEST_ADMIN_PASSWORD default: AdminTest!2026
  TEST_ADMIN_USERNAME default: testadmin

Usage (from repo root or backend):
  cd backend && PYTHONPATH=. python seed_test_admin.py

If POSTGRES_HOST=postgres (Docker-only hostname), run inside the API container:
  docker compose exec api python seed_test_admin.py
"""
from __future__ import annotations

import os
import uuid
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

# Load repo-root .env before importing Settings
_root = Path(__file__).resolve().parent.parent
load_dotenv(_root / ".env", override=False)
load_dotenv(Path(__file__).resolve().parent / ".env", override=False)

from app.api.deps import hash_password  # noqa: E402
from app.config import get_settings  # noqa: E402
from app.models.subscription import Subscription  # noqa: E402
from app.models.user import User  # noqa: E402


def main() -> None:
    email = os.environ.get("TEST_ADMIN_EMAIL", "admin@test.klypse.ai").strip().lower()
    password = os.environ.get("TEST_ADMIN_PASSWORD", "AdminTest!2026")
    username = os.environ.get("TEST_ADMIN_USERNAME", "testadmin").strip()

    settings = get_settings()
    engine = create_engine(settings.database_url_sync)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)

    with SessionLocal() as db:
        user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if user is None:
            user = User(
                id=uuid.uuid4(),
                email=email,
                username=username,
                password_hash=hash_password(password),
                full_name="Test Admin",
                plan="free",
                is_admin=True,
                is_active=True,
            )
            db.add(user)
            db.flush()
            db.add(Subscription(user_id=user.id, plan="free", is_active=True))
            db.commit()
            print(f"Created admin user: {email!r} / username {username!r}")
        else:
            user.is_admin = True
            user.is_active = True
            # Always reset password so re-running this script fixes "invalid password" after env changes.
            user.password_hash = hash_password(password)
            db.commit()
            print(f"Existing user updated (admin + password reset): {email!r}")

    print("Sign in at /login with the email and password above.")


if __name__ == "__main__":
    main()
