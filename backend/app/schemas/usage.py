"""Usage and quota API schemas."""

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class UsageSummaryResponse(BaseModel):
    plan_key: str
    plan_display_name: str
    monthly_image_quota: int = Field(description="Max completed image generations this UTC month")
    monthly_video_quota: int = Field(
        description="Max video billing units this UTC month (longer videos use more units)"
    )
    video_billing_unit_seconds: int = Field(
        description="Seconds per billing unit for quota math (ceil(duration/unit))"
    )
    monthly_quota: int = Field(
        description="Image cap + video unit cap (informational; enforcement is per bucket)"
    )
    used_this_month: int = Field(description="Completed generations (images + videos) this period")
    period_start: datetime
    period_end: datetime
    image_generations_this_month: int
    video_generations_this_month: int
    video_units_used_this_month: int = Field(
        description="Sum of video_billing_units for the current month"
    )
    subscription_active: bool


class UsageActivityItem(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    id: uuid.UUID
    created_at: datetime
    task_type: Optional[str] = None
    tier: Optional[str] = None
    cost: str
    model_used: Optional[str] = None


class UsageActivityResponse(BaseModel):
    items: List[UsageActivityItem]
    total: int = Field(description="Total rows matching filters (all pages)")
    page: int = Field(ge=1)
    per_page: int = Field(ge=1)
