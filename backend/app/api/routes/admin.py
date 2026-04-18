"""
Admin API Routes — Overview, user management.
All routes require is_admin=True.
Endpoint contract must match frontend/src/lib/api.ts adminAPI.
"""

from __future__ import annotations

import uuid
import logging
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.models.project import Project
from app.models.usage_log import UsageLog
from app.models.subscription import Subscription
from app.api.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])


# ── admin guard ───────────────────────────────────────────────────────────────

def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return current_user


# ── schemas ───────────────────────────────────────────────────────────────────

class AdminOverview(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    paid_plan_users: int


class AdminUserRow(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    full_name: Optional[str] = None
    plan: str
    is_admin: bool
    is_active: bool
    stripe_customer_id: Optional[str] = None
    created_at: datetime
    subscription_active: Optional[bool] = None
    subscription_plan: Optional[str] = None

    class Config:
        from_attributes = True


class AdminUserListResponse(BaseModel):
    items: List[AdminUserRow]
    total: int
    page: int
    per_page: int


class UpdateUserBody(BaseModel):
    plan: Optional[str] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


# ── routes ────────────────────────────────────────────────────────────────────

@router.get("/overview", response_model=AdminOverview)
async def admin_overview(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    """Platform-wide statistics for the admin dashboard."""
    total = (await db.execute(select(func.count(User.id)))).scalar() or 0
    active = (await db.execute(
        select(func.count(User.id)).where(User.is_active == True)
    )).scalar() or 0
    admins = (await db.execute(
        select(func.count(User.id)).where(User.is_admin == True)
    )).scalar() or 0
    paid = (await db.execute(
        select(func.count(User.id)).where(User.plan.notin_(["free"]))
    )).scalar() or 0

    return AdminOverview(
        total_users=total,
        active_users=active,
        admin_users=admins,
        paid_plan_users=paid,
    )


@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(_require_admin),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=200),
    search: Optional[str] = Query(None),
):
    """Paginated user directory with optional search (email / username)."""
    offset = (page - 1) * per_page

    stmt = select(User).order_by(User.created_at.desc())
    count_stmt = select(func.count(User.id))

    if search and search.strip():
        like = f"%{search.strip()}%"
        filt = or_(User.email.ilike(like), User.username.ilike(like))
        stmt = stmt.where(filt)
        count_stmt = count_stmt.where(filt)

    total = (await db.execute(count_stmt)).scalar() or 0
    users = (await db.execute(stmt.offset(offset).limit(per_page))).scalars().all()

    # Enrich with subscription info
    rows: list[AdminUserRow] = []
    for u in users:
        sub_r = await db.execute(select(Subscription).where(Subscription.user_id == u.id))
        sub = sub_r.scalar_one_or_none()
        rows.append(AdminUserRow(
            id=u.id,
            email=u.email,
            username=u.username,
            full_name=u.full_name,
            plan=u.plan,
            is_admin=getattr(u, "is_admin", False),
            is_active=u.is_active,
            stripe_customer_id=getattr(u, "stripe_customer_id", None),
            created_at=u.created_at,
            subscription_active=sub.is_active if sub else None,
            subscription_plan=sub.plan if sub else None,
        ))

    return AdminUserListResponse(items=rows, total=total, page=page, per_page=per_page)


@router.patch("/users/{user_id}", response_model=AdminUserRow)
async def update_user(
    user_id: uuid.UUID,
    body: UpdateUserBody,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    """Update plan, is_active, or is_admin for a user."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Self-demotion guard
    if str(user.id) == str(admin.id) and body.is_admin is False:
        raise HTTPException(status_code=400, detail="You cannot remove your own admin rights.")
    if str(user.id) == str(admin.id) and body.is_active is False:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account.")

    if body.plan is not None:
        user.plan = body.plan
    if body.is_active is not None:
        user.is_active = body.is_active
    if body.is_admin is not None:
        user.is_admin = body.is_admin

    await db.commit()
    await db.refresh(user)

    sub_r = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
    sub = sub_r.scalar_one_or_none()

    return AdminUserRow(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        plan=user.plan,
        is_admin=getattr(user, "is_admin", False),
        is_active=user.is_active,
        stripe_customer_id=getattr(user, "stripe_customer_id", None),
        created_at=user.created_at,
        subscription_active=sub.is_active if sub else None,
        subscription_plan=sub.plan if sub else None,
    )
