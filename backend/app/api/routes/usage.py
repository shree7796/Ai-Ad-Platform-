"""
Usage API — quota summary and activity (matches frontend usageAPI).
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.subscription import Subscription
from app.models.usage_log import UsageLog
from app.models.user import User
from app.services.billing_quota import (
    count_monthly_generations,
    count_monthly_image_generations,
    count_monthly_video_generations,
    get_model_credit_cost,
    month_window_utc,
    monthly_image_quota_for_plan,
    monthly_quota_for_plan,
    monthly_video_quota_for_plan,
    plan_display_name,
    sum_monthly_video_billing_units,
    video_billing_unit_seconds,
)

router = APIRouter(prefix="/usage", tags=["Usage"])


class UsageSummary(BaseModel):
    plan: str
    generations_this_month: int
    generations_today: int
    max_per_month: Optional[int] = None
    max_per_day: Optional[int] = None
    total_cost_this_month: float
    plan_key: str
    plan_display_name: str
    monthly_quota: int
    monthly_image_quota: int
    monthly_video_quota: int
    video_billing_unit_seconds: int
    used_this_month: int
    period_start: str
    period_end: str
    image_generations_this_month: int
    video_generations_this_month: int
    video_units_used_this_month: int
    subscription_active: bool


class UsageActivityItem(BaseModel):
    id: uuid.UUID
    created_at: datetime
    task_type: Optional[str] = None
    tier: Optional[str] = None
    cost: str
    credits: int = 0
    model_used: Optional[str] = None

    class Config:
        from_attributes = True


class UsageActivityPage(BaseModel):
    items: List[UsageActivityItem]
    total: int
    page: int
    per_page: int


@router.get("/summary", response_model=UsageSummary)
async def usage_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    plan_key = (current_user.plan or "free").lower()
    period_start, period_end = month_window_utc()

    sub_r = await db.execute(select(Subscription).where(Subscription.user_id == current_user.id))
    sub = sub_r.scalar_one_or_none()
    subscription_active = bool(sub.is_active) if sub else True

    used_this_month = await count_monthly_generations(db, current_user.id)
    image_generations_this_month = await count_monthly_image_generations(db, current_user.id)
    video_generations_this_month = await count_monthly_video_generations(db, current_user.id)
    video_units_used = await sum_monthly_video_billing_units(db, current_user.id)

    img_cap = monthly_image_quota_for_plan(plan_key)
    vid_cap = monthly_video_quota_for_plan(plan_key)
    unit_s = video_billing_unit_seconds()

    # Cost this month (same window)
    monthly_cost = (
        await db.execute(
            select(func.coalesce(func.sum(UsageLog.cost), 0)).where(
                UsageLog.user_id == current_user.id,
                UsageLog.action == "generation",
                UsageLog.created_at >= period_start,
                UsageLog.created_at < period_end,
            )
        )
    ).scalar() or 0

    # "Today" count (UTC calendar day)
    now = datetime.utcnow()
    day_start = datetime(now.year, now.month, now.day)
    day_end = day_start + timedelta(days=1)
    daily_count = int(
        (
            await db.execute(
                select(func.count()).select_from(UsageLog).where(
                    UsageLog.user_id == current_user.id,
                    UsageLog.action == "generation",
                    UsageLog.created_at >= day_start,
                    UsageLog.created_at < day_end,
                )
            )
        ).scalar_one()
        or 0
    )

    return UsageSummary(
        plan=plan_key,
        generations_this_month=used_this_month,
        generations_today=daily_count,
        max_per_month=monthly_quota_for_plan(plan_key),
        max_per_day=None,
        total_cost_this_month=float(monthly_cost),
        plan_key=plan_key,
        plan_display_name=plan_display_name(plan_key),
        monthly_quota=monthly_quota_for_plan(plan_key),
        monthly_image_quota=img_cap,
        monthly_video_quota=vid_cap,
        video_billing_unit_seconds=unit_s,
        used_this_month=used_this_month,
        period_start=period_start.isoformat(),
        period_end=period_end.isoformat(),
        image_generations_this_month=image_generations_this_month,
        video_generations_this_month=video_generations_this_month,
        video_units_used_this_month=video_units_used,
        subscription_active=subscription_active,
    )


@router.get("/activity", response_model=UsageActivityPage)
async def usage_activity(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
    q: Optional[str] = Query(None, description="Filter by task_type or model_used"),
):
    offset = (page - 1) * per_page

    base = select(UsageLog).where(
        UsageLog.user_id == current_user.id,
        UsageLog.action == "generation",
    )
    count_base = select(func.count(UsageLog.id)).where(
        UsageLog.user_id == current_user.id,
        UsageLog.action == "generation",
    )

    if q and q.strip():
        like = f"%{q.strip()}%"
        filt = or_(
            UsageLog.task_type.ilike(like),
            UsageLog.model_used.ilike(like),
        )
        base = base.where(filt)
        count_base = count_base.where(filt)

    total = int((await db.execute(count_base)).scalar_one() or 0)
    rows = (
        await db.execute(
            base.order_by(UsageLog.created_at.desc()).offset(offset).limit(per_page)
        )
    ).scalars().all()

    items = [
        UsageActivityItem(
            id=r.id,
            created_at=r.created_at,
            task_type=r.task_type,
            tier=r.tier,
            cost=f"{Decimal(r.cost):.4f}" if r.cost is not None else "0.0000",
            credits=get_model_credit_cost(r.model_used, r.task_type),
            model_used=r.model_used,
        )
        for r in rows
    ]
    return UsageActivityPage(items=items, total=total, page=page, per_page=per_page)


@router.get("/history", response_model=UsageActivityPage)
async def usage_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    return await usage_activity(current_user=current_user, db=db, page=page, per_page=per_page)
