"""
Admin API Routes — User management, system stats (admin-only).
"""

import uuid
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.db.session import get_db
from app.models.user import User
from app.models.project import Project
from app.models.usage_log import UsageLog
from app.api.deps import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Raise 403 if the calling user is not an admin."""
    if getattr(current_user, "plan", None) != "admin" and not getattr(current_user, "is_admin", False):
        # Fallback: only the first user (superuser) or plan=="admin" can access
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


class AdminUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    username: str
    full_name: Optional[str]
    plan: str
    is_active: bool

    class Config:
        from_attributes = True


class AdminStatsResponse(BaseModel):
    total_users: int
    total_projects: int
    total_generations: int


@router.get("/stats", response_model=AdminStatsResponse)
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    """Platform-wide statistics."""
    users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    projects = (await db.execute(select(func.count(Project.id)))).scalar() or 0
    gens = (
        await db.execute(
            select(func.count(UsageLog.id)).where(UsageLog.action == "generation")
        )
    ).scalar() or 0
    return AdminStatsResponse(
        total_users=users,
        total_projects=projects,
        total_generations=gens,
    )


@router.get("/users", response_model=List[AdminUserResponse])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(_require_admin),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
):
    """List all users (paginated)."""
    offset = (page - 1) * page_size
    result = await db.execute(
        select(User).order_by(User.created_at.desc()).offset(offset).limit(page_size)
    )
    return result.scalars().all()


@router.patch("/users/{user_id}/plan")
async def update_user_plan(
    user_id: uuid.UUID,
    plan: str = Query(..., description="New plan key: free | basic | pro | premium"),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    """Override a user's subscription plan."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.plan = plan
    await db.commit()
    return {"user_id": str(user_id), "plan": plan}


@router.patch("/users/{user_id}/deactivate")
async def deactivate_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(_require_admin),
):
    """Deactivate a user account."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = False
    await db.commit()
    return {"user_id": str(user_id), "is_active": False}
