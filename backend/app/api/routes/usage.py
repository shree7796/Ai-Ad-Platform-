"""
Usage API Routes — Generation history and quota summary for the current user.
"""

import uuid
import logging
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from decimal import Decimal

from app.db.session import get_db
from app.models.user import User
from app.models.usage_log import UsageLog
from app.api.deps import get_current_user
from app.config import get_plans_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/usage", tags=["Usage"])


class UsageLogResponse(BaseModel):
    id: uuid.UUID
    action: str
    task_type: Optional[str]
    model_used: Optional[str]
    tier: Optional[str]
    cost: Decimal
    created_at: datetime

    class Config:
        from_attributes = True


class UsageSummaryResponse(BaseModel):
    plan: str
    generations_this_month: int
    generations_today: int
    max_per_month: Optional[int]
    max_per_day: Optional[int]
    total_cost_this_month: float


@router.get("/history", response_model=List[UsageLogResponse])
async def usage_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Return the calling user's generation history (most recent first)."""
    offset = (page - 1) * page_size
    result = await db.execute(
        select(UsageLog)
        .where(UsageLog.user_id == current_user.id)
        .order_by(UsageLog.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return result.scalars().all()


@router.get("/summary", response_model=UsageSummaryResponse)
async def usage_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return quota usage for the current billing period."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    monthly_count = (
        await db.execute(
            select(func.count(UsageLog.id)).where(
                UsageLog.user_id == current_user.id,
                UsageLog.action == "generation",
                UsageLog.created_at >= month_start,
            )
        )
    ).scalar() or 0

    daily_count = (
        await db.execute(
            select(func.count(UsageLog.id)).where(
                UsageLog.user_id == current_user.id,
                UsageLog.action == "generation",
                UsageLog.created_at >= day_start,
            )
        )
    ).scalar() or 0

    monthly_cost = (
        await db.execute(
            select(func.coalesce(func.sum(UsageLog.cost), 0)).where(
                UsageLog.user_id == current_user.id,
                UsageLog.action == "generation",
                UsageLog.created_at >= month_start,
            )
        )
    ).scalar() or 0

    plan_key = (current_user.plan or "free").lower()
    plans_config = get_plans_config() or {}
    features = plans_config.get("plans", {}).get(plan_key, {}).get("features", {})

    return UsageSummaryResponse(
        plan=plan_key,
        generations_this_month=monthly_count,
        generations_today=daily_count,
        max_per_month=features.get("max_generations_per_month"),
        max_per_day=features.get("max_generations_per_day"),
        total_cost_this_month=float(monthly_cost),
    )
