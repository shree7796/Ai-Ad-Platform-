"""Admin API schemas."""

import uuid
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel

PlanKey = Literal["free", "basic", "pro", "premium"]


class AdminUserListItem(BaseModel):
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
        from_attributes = False


class AdminUserListResponse(BaseModel):
    items: List[AdminUserListItem]
    total: int
    page: int
    per_page: int


class AdminUserUpdate(BaseModel):
    plan: Optional[PlanKey] = None
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class AdminOverviewResponse(BaseModel):
    total_users: int
    active_users: int
    admin_users: int
    paid_plan_users: int
