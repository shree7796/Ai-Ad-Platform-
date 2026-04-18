"""
Billing & Quota Enforcement.

Checks monthly/daily generation limits from plans.yaml against the user's
actual UsageLog rows before allowing a generation to proceed.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_plans_config

if TYPE_CHECKING:
    from app.config import Settings
    from app.models.user import User

logger = logging.getLogger(__name__)

_VIDEO_TASK_TYPES = {"image_to_video", "text_to_video", "video_to_video"}
_IMAGE_TASK_TYPES = {"text_to_image", "image_to_image"}


# ── Helpers ──────────────────────────────────────────────────────────────────

def is_video_task(task_type: str) -> bool:
    return task_type in _VIDEO_TASK_TYPES


def _plan_features(plan_key: str) -> dict:
    plans_config = get_plans_config()
    if not plans_config:
        return {}
    return plans_config.get("plans", {}).get(plan_key, {}).get("features", {})


def max_video_duration_for_plan(plan_key: str) -> int:
    """Return the maximum allowed video duration (seconds) for a plan."""
    features = _plan_features(plan_key)
    return int(features.get("max_video_duration", 10))


# ── Main enforcement ─────────────────────────────────────────────────────────

async def enforce_generation_allowed(
    db: AsyncSession,
    user: "User",
    settings: "Settings",
    task_type: str,
    duration_seconds: int = 5,
) -> None:
    """
    Raise HTTP 429 if the user has exceeded their plan's monthly or daily
    generation quota.  Passes silently when no plans config is present.
    """
    from app.models.usage_log import UsageLog

    plan_key = (user.plan or "free").lower()
    features = _plan_features(plan_key)

    if not features:
        # No config available → open access (dev / test mode)
        return

    max_per_month: int | None = features.get("max_generations_per_month")
    max_per_day: int | None = features.get("max_generations_per_day")

    now = datetime.now(timezone.utc)

    # Monthly count
    if max_per_month is not None:
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_count_result = await db.execute(
            select(func.count(UsageLog.id)).where(
                UsageLog.user_id == user.id,
                UsageLog.action == "generation",
                UsageLog.created_at >= month_start.replace(tzinfo=None),
            )
        )
        monthly_count = monthly_count_result.scalar() or 0
        if monthly_count >= max_per_month:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Monthly generation limit reached ({max_per_month} on the '{plan_key}' plan). "
                    "Upgrade your plan or wait until next month."
                ),
            )

    # Daily count
    if max_per_day is not None:
        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        daily_count_result = await db.execute(
            select(func.count(UsageLog.id)).where(
                UsageLog.user_id == user.id,
                UsageLog.action == "generation",
                UsageLog.created_at >= day_start.replace(tzinfo=None),
            )
        )
        daily_count = daily_count_result.scalar() or 0
        if daily_count >= max_per_day:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Daily generation limit reached ({max_per_day} on the '{plan_key}' plan). "
                    "Try again tomorrow or upgrade your plan."
                ),
            )

    logger.debug(
        f"[billing_quota] User {user.id} ({plan_key}) passed quota check "
        f"for {task_type} ({duration_seconds}s)."
    )
