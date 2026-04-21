"""
Delete generation usage_logs for a user for the current UTC month (same window as billing).
Usage: python scripts/reset_user_monthly_usage.py user@email.com
"""
from __future__ import annotations

import asyncio
import sys

from sqlalchemy import delete, func, select

# Run from backend/: PYTHONPATH=.
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import get_async_session_factory
from app.models.usage_log import UsageLog
from app.models.user import User
from app.services.billing_quota import month_window_utc


async def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python scripts/reset_user_monthly_usage.py <email>")
        sys.exit(1)
    email = sys.argv[1].strip().lower()

    factory = get_async_session_factory()
    async with factory() as session:
        r = await session.execute(
            select(User).where(func.lower(User.email) == email)
        )
        user = r.scalar_one_or_none()
        if not user:
            print(f"No user found with email: {email}")
            sys.exit(1)

        period_start, period_end = month_window_utc()
        stmt = (
            delete(UsageLog)
            .where(
                UsageLog.user_id == user.id,
                UsageLog.action == "generation",
                UsageLog.created_at >= period_start,
                UsageLog.created_at < period_end,
            )
        )
        result = await session.execute(stmt)
        await session.commit()
        n = result.rowcount or 0
        print(
            f"Removed {n} generation log(s) for {email} "
            f"(UTC month {period_start.date()} .. {period_end.date()})."
        )


if __name__ == "__main__":
    asyncio.run(main())
