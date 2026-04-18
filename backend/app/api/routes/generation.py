"""
Generation API Routes — Trigger video generation, poll status.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User
from app.models.project import Project
from app.models.scene import Scene
from app.schemas.generation import GenerationRequest, GenerationStatusResponse
from app.schemas.common import APIResponse
from app.api.deps import get_current_user, enforce_plan_access
from app.config import get_settings
from app.services.billing_quota import (
    enforce_generation_allowed,
    is_video_task,
    max_video_duration_for_plan,
)
from app.services.orchestrator import OrchestrationService

router = APIRouter(prefix="/generate", tags=["Generation"])


@router.post("", response_model=GenerationStatusResponse)
@router.post("/", response_model=GenerationStatusResponse)
async def trigger_generation(
    payload: GenerationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger video generation for a project."""
    # Verify project ownership
    result = await db.execute(
        select(Project).where(
            Project.id == payload.project_id,
            Project.user_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.task_type in ["image_to_video", "image_to_image", "video_to_video"]:
        if not project.input_media_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please upload media to the project first for this task type",
            )

    plan_key = (current_user.plan or "free").lower()
    if is_video_task(payload.task_type):
        max_vid_len = max_video_duration_for_plan(plan_key)
        if payload.duration_seconds > max_vid_len:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Your plan allows videos up to {max_vid_len}s. "
                    "Shorten the duration or upgrade for longer outputs."
                ),
            )

    # Paid plan (optional) + monthly image / video unit quota
    await enforce_generation_allowed(
        db,
        current_user,
        get_settings(),
        payload.task_type,
        duration_seconds=payload.duration_seconds,
    )

    # Enforce plan-based tier access (model tier: basic / pro / premium)
    enforce_plan_access(current_user, payload.tier)

    # Create scene record
    scene = Scene(
        project_id=project.id,
        prompt=payload.prompt,
        tier=payload.tier,
        duration_seconds=payload.duration_seconds,
        status="pending",
        task_type=payload.task_type,
    )
    db.add(scene)
    await db.flush()

    # Update project status
    project.status = "processing"
    await db.flush()

    # Dispatch to orchestrator (async via Celery)
    orchestrator = OrchestrationService()
    job_id = orchestrator.dispatch_generation(
        scene_id=str(scene.id),
        project_id=str(project.id),
        user_id=str(current_user.id),
        prompt=payload.prompt,
        input_media_url=project.input_media_url or "",
        tier=payload.tier,
        duration_seconds=payload.duration_seconds,
        enhance_prompt=payload.enhance_prompt,
        task_type=payload.task_type,
        requested_provider=payload.requested_provider,
        preserve_subject=payload.preserve_subject,
        cinematic_redraw=payload.cinematic_redraw,
        hero_cinematic_reframe=payload.hero_cinematic_reframe,
    )

    # Store celery task ID
    scene.celery_task_id = job_id
    await db.flush()

    return GenerationStatusResponse(
        job_id=job_id,
        scene_id=scene.id,
        project_id=project.id,
        status="pending",
        progress=0,
        estimated_seconds_remaining=60,
    )


@router.get("/{scene_id}/status", response_model=GenerationStatusResponse)
async def get_generation_status(
    scene_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Poll the status of a video generation job."""
    result = await db.execute(
        select(Scene).where(Scene.id == scene_id)
    )
    scene = result.scalar_one_or_none()

    if not scene:
        raise HTTPException(status_code=404, detail="Generation job not found")

    # Verify ownership via project
    result = await db.execute(
        select(Project).where(
            Project.id == scene.project_id,
            Project.user_id == current_user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Generation job not found")

    # Calculate progress based on status
    progress_map = {
        "pending": 0,
        "enhancing": 15,
        "generating": 40,
        "processing": 80,
        "completed": 100,
        "failed": 0,
    }

    return GenerationStatusResponse(
        job_id=scene.celery_task_id or "",
        scene_id=scene.id,
        project_id=scene.project_id,
        status=scene.status,
        progress=progress_map.get(scene.status, 0),
        output_video_url=scene.output_video_url,
        enhanced_prompt=scene.enhanced_prompt,
        error_message=scene.error_message,
        model_used=scene.model_used,
    )
