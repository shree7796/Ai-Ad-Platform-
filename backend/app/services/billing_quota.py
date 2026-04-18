"""
Monthly generation quota from plans config + usage_logs.

Two buckets: image (text_to_image, image_to_image, …) vs video (text_to_video, image_to_video, video_to_video).

Video allowance is in **billing units** (see plans.yaml `video_billing_unit_seconds`): longer outputs consume
more units so 30–60s clips cannot bypass COGS vs flat per-job caps.
"""

import math
from datetime import datetime
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_plans_config
from app.models.usage_log import UsageLog
from app.models.user import User

# All task types that count against the video monthly cap.
VIDEO_TASK_TYPES = frozenset({"text_to_video", "image_to_video", "video_to_video"})

_DEFAULT_IMAGE_VIDEO: dict[str, Tuple[int, int]] = {
    "free": (8, 2),
    "basic": (90, 12),
    "pro": (240, 32),
    "premium": (520, 72),
}


def month_window_utc(reference: Optional[datetime] = None) -> Tuple[datetime, datetime]:
    now = reference or datetime.utcnow()
    start = datetime(now.year, now.month, 1)
    if now.month == 12:
        end = datetime(now.year + 1, 1, 1)
    else:
        end = datetime(now.year, now.month + 1, 1)
    return start, end


def _features_for_plan(plan_key: str) -> dict:
    plans = get_plans_config() or {}
    block = (plans.get("plans") or {}).get(plan_key) or (plans.get("plans") or {}).get("free")
    if block and isinstance(block, dict):
        feat = block.get("features") or {}
        if isinstance(feat, dict):
            return feat
    return {}


def monthly_image_video_quotas_for_plan(plan_key: str) -> Tuple[int, int]:
    """Return (image_cap, video_cap) for the plan."""
    plan_key = (plan_key or "free").lower()
    features = _features_for_plan(plan_key)

    img = features.get("max_image_generations_per_month")
    vid = features.get("max_video_generations_per_month")
    if img is not None and vid is not None:
        return max(0, int(img)), max(0, int(vid))

    # Legacy single cap: ~20% of slots to video (min 1 when total >= 5), rest to image.
    legacy = features.get("max_generations_per_month")
    if legacy is not None:
        total = max(0, int(legacy))
        video = total // 5
        if total >= 5 and video < 1:
            video = 1
        image = max(0, total - video)
        return image, video

    return _DEFAULT_IMAGE_VIDEO.get(plan_key, _DEFAULT_IMAGE_VIDEO["free"])


def monthly_image_quota_for_plan(plan_key: str) -> int:
    return monthly_image_video_quotas_for_plan(plan_key)[0]


def monthly_video_quota_for_plan(plan_key: str) -> int:
    return monthly_image_video_quotas_for_plan(plan_key)[1]


def monthly_quota_for_plan(plan_key: str) -> int:
    """Sum of image + video caps (informational only; enforcement is per bucket)."""
    i, v = monthly_image_video_quotas_for_plan(plan_key)
    return i + v


def video_billing_unit_seconds() -> int:
    """Seconds covered by one video billing unit (ceil duration / this)."""
    plans = get_plans_config() or {}
    raw = plans.get("video_billing_unit_seconds")
    if raw is not None:
        return max(1, int(raw))
    return 15


def video_units_for_duration(duration_seconds: int) -> int:
    """Billable units for one video job (minimum 1)."""
    unit = video_billing_unit_seconds()
    d = max(1, int(duration_seconds))
    return max(1, math.ceil(d / unit))


def max_video_duration_for_plan(plan_key: str) -> int:
    """Max output duration (seconds) for video tasks on this plan."""
    plan_key = (plan_key or "free").lower()
    features = _features_for_plan(plan_key)
    raw = features.get("max_video_duration")
    if raw is not None:
        return max(1, int(raw))
    return 15


def plan_display_name(plan_key: str) -> str:
    plans = get_plans_config() or {}
    block = (plans.get("plans") or {}).get(plan_key)
    if block and isinstance(block, dict):
        name = block.get("display_name")
        if name:
            return str(name)
    return plan_key.replace("_", " ").title()


def is_video_task(task_type: Optional[str]) -> bool:
    if not task_type or not str(task_type).strip():
        return False
    return str(task_type).strip().lower() in VIDEO_TASK_TYPES


async def count_monthly_generations(db: AsyncSession, user_id) -> int:
    """All completed generations this month (image + video)."""
    period_start, period_end = month_window_utc()
    stmt = select(func.count()).select_from(UsageLog).where(
        and_(
            UsageLog.user_id == user_id,
            UsageLog.action == "generation",
            UsageLog.created_at >= period_start,
            UsageLog.created_at < period_end,
        )
    )
    result = await db.execute(stmt)
    return int(result.scalar_one() or 0)


async def count_monthly_video_generations(db: AsyncSession, user_id) -> int:
    period_start, period_end = month_window_utc()
    tt = tuple(VIDEO_TASK_TYPES)
    stmt = select(func.count()).select_from(UsageLog).where(
        and_(
            UsageLog.user_id == user_id,
            UsageLog.action == "generation",
            UsageLog.created_at >= period_start,
            UsageLog.created_at < period_end,
            UsageLog.task_type.isnot(None),
            UsageLog.task_type.in_(tt),
        )
    )
    result = await db.execute(stmt)
    return int(result.scalar_one() or 0)


async def sum_monthly_video_billing_units(db: AsyncSession, user_id) -> int:
    """Sum of video billing units in the current UTC month (images contribute 0)."""
    period_start, period_end = month_window_utc()
    stmt = select(func.coalesce(func.sum(UsageLog.video_billing_units), 0)).where(
        and_(
            UsageLog.user_id == user_id,
            UsageLog.action == "generation",
            UsageLog.created_at >= period_start,
            UsageLog.created_at < period_end,
        )
    )
    result = await db.execute(stmt)
    return int(result.scalar_one() or 0)


async def count_monthly_image_generations(db: AsyncSession, user_id) -> int:
    period_start, period_end = month_window_utc()
    tt = tuple(VIDEO_TASK_TYPES)
    stmt = select(func.count()).select_from(UsageLog).where(
        and_(
            UsageLog.user_id == user_id,
            UsageLog.action == "generation",
            UsageLog.created_at >= period_start,
            UsageLog.created_at < period_end,
            or_(
                UsageLog.task_type.is_(None),
                and_(UsageLog.task_type.isnot(None), ~UsageLog.task_type.in_(tt)),
            ),
        )
    )
    result = await db.execute(stmt)
    return int(result.scalar_one() or 0)


async def enforce_generation_allowed(
    db: AsyncSession,
    user: User,
    settings: Settings,
    task_type: str,
    duration_seconds: int = 12,
) -> None:
    """Block generation when plan disallows or the relevant monthly bucket is exhausted."""
    plan_key = (user.plan or "free").lower()
    tt = (task_type or "text_to_image").strip().lower()

    if settings.require_paid_plan and plan_key == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscribe to a plan to generate. Visit Billing to choose a subscription.",
        )

    img_quota, vid_quota = monthly_image_video_quotas_for_plan(plan_key)
    if is_video_task(tt):
        if vid_quota <= 0:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Your current plan does not include video generations. Upgrade in Billing.",
            )
        need_units = video_units_for_duration(duration_seconds)
        used_units = await sum_monthly_video_billing_units(db, user.id)
        if used_units + need_units > vid_quota:
            unit = video_billing_unit_seconds()
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    f"Monthly video allowance exceeded: this {duration_seconds}s clip needs {need_units} unit(s) "
                    f"({unit}s each), and only {max(0, vid_quota - used_units)} unit(s) remain. "
                    "Shorten the duration, upgrade your plan, or wait until your quota resets (UTC)."
                ),
            )
    else:
        if img_quota <= 0:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Your current plan has no image generation quota. Upgrade in Billing to continue.",
            )
        used_i = await count_monthly_image_generations(db, user.id)
        if used_i >= img_quota:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    "Monthly image generation limit reached. Upgrade your plan or wait until your quota resets (UTC)."
                ),
            )
