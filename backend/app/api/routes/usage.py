"""
Usage and quota routes — monthly generation counts from usage_logs.
"""

from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.subscription import Subscription
from app.models.usage_log import UsageLog
from app.models.user import User
from app.schemas.usage import UsageActivityItem, UsageActivityResponse, UsageSummaryResponse
from app.services.billing_quota import (
    count_monthly_generations,
    count_monthly_image_generations,
    count_monthly_video_generations,
    month_window_utc,
    monthly_image_quota_for_plan,
    monthly_quota_for_plan,
    monthly_video_quota_for_plan,
    plan_display_name,
    sum_monthly_video_billing_units,
    video_billing_unit_seconds,
)

router = APIRouter(prefix="/usage", tags=["Usage"])


@router.get("/summary", response_model=UsageSummaryResponse)
async def usage_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    period_start, period_end = month_window_utc()
    plan_key = (current_user.plan or "free").lower()

    sub_row = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = sub_row.scalar_one_or_none()
    subscription_active = bool(subscription.is_active) if subscription else True

    used_this_month = await count_monthly_generations(db, current_user.id)
    image_generations_this_month = await count_monthly_image_generations(
        db, current_user.id
    )
    video_generations_this_month = await count_monthly_video_generations(
        db, current_user.id
    )
    video_units_used = await sum_monthly_video_billing_units(db, current_user.id)
    img_cap = monthly_image_quota_for_plan(plan_key)
    vid_cap = monthly_video_quota_for_plan(plan_key)

    return UsageSummaryResponse(
        plan_key=plan_key,
        plan_display_name=plan_display_name(plan_key),
        monthly_image_quota=img_cap,
        monthly_video_quota=vid_cap,
        video_billing_unit_seconds=video_billing_unit_seconds(),
        monthly_quota=monthly_quota_for_plan(plan_key),
        used_this_month=used_this_month,
        period_start=period_start,
        period_end=period_end,
        image_generations_this_month=image_generations_this_month,
        video_generations_this_month=video_generations_this_month,
        video_units_used_this_month=video_units_used,
        subscription_active=subscription_active,
    )


@router.get("/activity", response_model=UsageActivityResponse)
async def usage_activity(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=50),
    q: Optional[str] = Query(None, max_length=120),
):
    filters = and_(
        UsageLog.user_id == current_user.id,
        UsageLog.action == "generation",
    )
    if q and q.strip():
        term = f"%{q.strip()}%"
        filters = and_(
            filters,
            or_(
                UsageLog.task_type.ilike(term),
                UsageLog.model_used.ilike(term),
                UsageLog.tier.ilike(term),
            ),
        )

    count_stmt = select(func.count()).select_from(UsageLog).where(filters)
    total = int((await db.execute(count_stmt)).scalar_one() or 0)

    offset = (page - 1) * per_page
    stmt = (
        select(UsageLog)
        .where(filters)
        .order_by(UsageLog.created_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()
    items = [
        UsageActivityItem(
            id=r.id,
            created_at=r.created_at,
            task_type=r.task_type,
            tier=r.tier,
            cost=f"{Decimal(r.cost):.4f}" if r.cost is not None else "0.0000",
            model_used=r.model_used,
        )
        for r in rows
    ]
    return UsageActivityResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
    )
