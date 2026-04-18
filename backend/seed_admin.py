"""
Create or update a bootstrap admin user (idempotent).

Usage (from repo root, with DATABASE_URL / .env loaded as for the API):
  cd backend && python seed_admin.py

Defaults match the project test admin; override with env:
  ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_USERNAME, ADMIN_FULL_NAME
"""

from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from passlib.context import CryptContext
from sqlalchemy import func, select

from app.db.session import get_async_session_factory
from app.models.subscription import Subscription
from app.models.user import User

DEFAULT_EMAIL = "admin@test.klypse.ai"
DEFAULT_PASSWORD = "AdminTest!2026"
DEFAULT_USERNAME = "klypse_admin"
DEFAULT_FULL_NAME = "Klypse Admin"

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _hash_password(password: str) -> str:
    return _pwd.hash(password)


async def seed_admin() -> None:
    email = os.environ.get("ADMIN_EMAIL", DEFAULT_EMAIL).strip().lower()
    password = os.environ.get("ADMIN_PASSWORD", DEFAULT_PASSWORD)
    username = os.environ.get("ADMIN_USERNAME", DEFAULT_USERNAME).strip()
    full_name = os.environ.get("ADMIN_FULL_NAME", DEFAULT_FULL_NAME).strip() or None

    factory = get_async_session_factory()
    async with factory() as db:
        result = await db.execute(select(User).where(func.lower(User.email) == email))
        user = result.scalar_one_or_none()

        if user:
            user.password_hash = _hash_password(password)
            user.is_admin = True
            user.is_active = True
            if full_name:
                user.full_name = full_name
            print(f"Updated existing user {email!r}: password reset, is_admin=True.")
        else:
            # Username clash with a different email
            clash = await db.execute(select(User).where(User.username == username))
            if clash.scalar_one_or_none():
                raise SystemExit(
                    f"Username {username!r} is already taken by another account. "
                    "Set ADMIN_USERNAME to a unique value."
                )
            user = User(
                email=email,
                username=username,
                password_hash=_hash_password(password),
                full_name=full_name,
                plan="free",
                is_admin=True,
                is_active=True,
            )
            db.add(user)
            await db.flush()
            db.add(Subscription(user_id=user.id, plan="free"))
            print(f"Created admin user {email!r} (username={username!r}).")

        await db.commit()

    print("Done. Log in at the app login page, then open /admin.")


if __name__ == "__main__":
    asyncio.run(seed_admin())
