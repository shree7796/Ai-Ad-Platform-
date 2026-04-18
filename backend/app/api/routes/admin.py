"""
Admin routes — user and subscription oversight (requires `users.is_admin`).
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_admin, get_current_user
from app.db.session import get_db
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.admin import (
    AdminOverviewResponse,
    AdminUserListItem,
    AdminUserListResponse,
    AdminUserUpdate,
)
from app.schemas.user import UserResponse

router = APIRouter(prefix="/admin", tags=["Admin"])

PAID_PLANS = frozenset({"basic", "pro", "premium"})


@router.get("/overview", response_model=AdminOverviewResponse)
async def admin_overview(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    total = int(
        (await db.execute(select(func.count()).select_from(User))).scalar_one() or 0
    )
    active = int(
        (
            await db.execute(
                select(func.count()).select_from(User).where(User.is_active.is_(True))
            )
        ).scalar_one()
        or 0
    )
    admins = int(
        (
            await db.execute(
                select(func.count()).select_from(User).where(User.is_admin.is_(True))
            )
        ).scalar_one()
        or 0
    )
    paid = int(
        (
            await db.execute(
                select(func.count()).select_from(User).where(User.plan.in_(PAID_PLANS))
            )
        ).scalar_one()
        or 0
    )
    return AdminOverviewResponse(
        total_users=total,
        active_users=active,
        admin_users=admins,
        paid_plan_users=paid,
    )


@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    _: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, min_length=1, max_length=100),
):
    stmt_count = select(func.count()).select_from(User)
    stmt_data = select(User).options(selectinload(User.subscription))
    if search:
        term = f"%{search.strip()}%"
        cond = or_(User.email.ilike(term), User.username.ilike(term))
        stmt_count = stmt_count.where(cond)
        stmt_data = stmt_data.where(cond)
    total = int((await db.execute(stmt_count)).scalar_one() or 0)

    stmt = (
        stmt_data.order_by(User.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    result = await db.execute(stmt)
    rows = result.scalars().unique().all()

    items = []
    for u in rows:
        sub = u.subscription
        items.append(
            AdminUserListItem(
                id=u.id,
                email=u.email,
                username=u.username,
                full_name=u.full_name,
                plan=u.plan,
                is_admin=u.is_admin,
                is_active=u.is_active,
                stripe_customer_id=u.stripe_customer_id,
                created_at=u.created_at,
                subscription_active=sub.is_active if sub else None,
                subscription_plan=sub.plan if sub else None,
            )
        )
    return AdminUserListResponse(
        items=items, total=total, page=page, per_page=per_page
    )


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user_admin(
    user_id: uuid.UUID,
    body: AdminUserUpdate,
    admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    if not any(
        v is not None for v in (body.plan, body.is_active, body.is_admin)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    result = await db.execute(
        select(User).where(User.id == user_id).options(selectinload(User.subscription))
    )
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if user_id == admin.id:
        if body.is_active is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot deactivate your own account",
            )
        if body.is_admin is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot remove your own admin role",
            )

    if body.plan is not None:
        target.plan = body.plan[:20]
        sub_result = await db.execute(
            select(Subscription).where(Subscription.user_id == target.id)
        )
        sub = sub_result.scalar_one_or_none()
        if sub:
            sub.plan = body.plan[:20]

    if body.is_active is not None:
        target.is_active = body.is_active

    if body.is_admin is not None:
        target.is_admin = body.is_admin

    await db.flush()
    return UserResponse.model_validate(target)


@router.get("/me/is-admin")
async def check_admin(current_user: User = Depends(get_current_user)):
    """Lightweight flag for the frontend shell (any authenticated user)."""
    return {"is_admin": bool(current_user.is_admin)}
