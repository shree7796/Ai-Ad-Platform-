"""Project schemas for request/response validation."""

import uuid
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


# ── Request Schemas ──

class ProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    task_type: Optional[str] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    task_type: Optional[str] = None


# ── Response Schemas ──

class SceneResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: uuid.UUID
    prompt: Optional[str] = None
    enhanced_prompt: Optional[str] = None
    model_used: Optional[str] = None
    tier: str
    output_video_url: Optional[str] = None
    cost: float = 0.0
    status: str
    error_message: Optional[str] = None
    duration_seconds: int = 12
    created_at: datetime
    completed_at: Optional[datetime] = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    description: Optional[str] = None
    input_media_url: Optional[str] = None
    input_media_type: Optional[str] = None
    task_type: Optional[str] = None
    status: str
    output_video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    scenes: List[SceneResponse] = []
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    status: str
    task_type: Optional[str] = None
    input_media_type: Optional[str] = None
    output_video_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    created_at: datetime
