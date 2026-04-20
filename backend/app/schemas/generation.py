"""Generation schemas for request/response validation."""

import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class GenerationRequest(BaseModel):
    """Request to generate a video from an uploaded project."""
    project_id: uuid.UUID
    prompt: str = Field(..., min_length=1, max_length=2000)
    tier: str = Field(default="basic")  # basic, pro, premium
    duration_seconds: int = Field(
        default=12,
        ge=1,
        le=120,
        description="Output length in seconds; plan may cap below 120 (see max_video_duration). UI allows 3s+.",
    )
    enhance_prompt: bool = True
    task_type: str = Field(default="image_to_video")
    requested_provider: Optional[str] = None
    # image_to_image: keep subject pixels (composite) vs full flux redraw (may change vehicle)
    preserve_subject: bool = True
    cinematic_redraw: bool = False
    # image_to_image: flux-dev direct path; may reframe camera like a fire/poster hero shot while locking identity
    hero_cinematic_reframe: bool = False
    # wan only: public URL to a WAV/MP3 file (3–30s, ≤15 MB) to use as background audio
    audio_url: Optional[str] = None
    # wan only: "720p" | "1080p" (default 1080p)
    resolution: Optional[str] = None
    # video model override: "kling_standard"|"kling_pro"|"kling_master"|"wan"|"minimax"|"luma"
    video_model: Optional[str] = None
    # image model override: "flux-dev" (default) | "nano-banana" | "nano-banana-2"
    image_model: Optional[str] = None
    # auto-generate audio via Beatoven AI and attach to video (wan only, $0.10 extra)
    # set generate_audio=True and describe the sound — e.g. "engine roar with dramatic music"
    generate_audio: bool = False
    audio_prompt: Optional[str] = None   # e.g. "epic cinematic music with deep bass and engine revving"
    audio_type: str = "sfx"              # "sfx" (sound effects) | "music" (background music)


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
