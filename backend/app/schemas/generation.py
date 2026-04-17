"""Generation schemas for request/response validation."""

import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class GenerationRequest(BaseModel):
    """Request to generate a video from an uploaded project."""
    project_id: uuid.UUID
    prompt: str = Field(..., min_length=1, max_length=2000)
    tier: str = Field(default="basic")  # basic, pro, premium
    duration_seconds: int = Field(default=12, ge=5, le=15)
    enhance_prompt: bool = True
    task_type: str = Field(default="image_to_video")
    requested_provider: Optional[str] = None


class GenerationStatusResponse(BaseModel):
    """Response for generation job status polling."""
    model_config = ConfigDict(protected_namespaces=())

    job_id: str
    scene_id: uuid.UUID
    project_id: uuid.UUID
    status: str  # pending, enhancing, generating, processing, completed, failed
    progress: int = 0  # 0-100
    output_video_url: Optional[str] = None
    enhanced_prompt: Optional[str] = None
    error_message: Optional[str] = None
    model_used: Optional[str] = None
    estimated_seconds_remaining: Optional[int] = None
