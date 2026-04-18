#!/usr/bin/env python3
"""Grant admin access to a user by email (run from repo with backend on PYTHONPATH).

Usage (from repository root):
  cd backend && PYTHONPATH=. python promote_admin.py you@company.com
"""
import sys

from sqlalchemy import create_engine, text

from app.config import get_settings


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: promote_admin.py EMAIL")
        sys.exit(1)
    email = sys.argv[1].strip().lower()
    settings = get_settings()
    engine = create_engine(settings.database_url_sync)
    with engine.connect() as conn:
        result = conn.execute(
            text("UPDATE users SET is_admin = true WHERE lower(email) = :email"),
            {"email": email},
        )
        conn.commit()
        print(f"Promoted {result.rowcount} user(s) matching {email!r}")


if __name__ == "__main__":
    main()
