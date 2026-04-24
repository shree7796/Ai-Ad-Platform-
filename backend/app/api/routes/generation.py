"""
Generation API Routes- Trigger generation jobs, poll status.
"""

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from starlette.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.api.deps import get_current_user, enforce_plan_access
from app.db.session import get_db
from app.models.project import Project
from app.models.scene import Scene
from app.models.user import User
from app.schemas.generation import GenerationRequest, GenerationStatusResponse
from app.services.billing_quota import (
    check_velocity_limit,
    compute_credit_cost,
    enforce_generation_allowed,
    enforce_plan_image_model,
    get_model_credit_cost,
    is_video_task,
    max_video_duration_for_plan,
    reserve_credits,
)
from app.services.circuit_breaker import assert_not_in_cooldown
from app.services.orchestrator import OrchestrationService
from app.security.limiter import limiter

router = APIRouter(prefix="/generate", tags=["Generation"])

_PROGRESS_MAP = {
    "pending": 0,
    "enhancing": 15,
    "generating": 40,
    "processing": 80,
    "completed": 100,
    "failed": 0,
}


@router.post("", response_model=GenerationStatusResponse)
@router.post("/", response_model=GenerationStatusResponse)
@limiter.limit("45/minute")
async def trigger_generation(
    request: Request,
    payload: GenerationRequest,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Trigger video/image generation for a project."""
    # ── Idempotency: return existing in-flight / completed job immediately ──
    if payload.idempotency_key:
        existing_result = await db.execute(
            select(Scene)
            .join(Project, Scene.project_id == Project.id)
            .where(
                Project.user_id == current_user.id,
                Scene.idempotency_key == payload.idempotency_key,
                Scene.status.in_(
                    ["pending", "enhancing", "generating", "processing", "completed"]
                ),
            )
        )
        existing_scene = existing_result.scalar_one_or_none()
        if existing_scene:
            return GenerationStatusResponse(
                job_id=existing_scene.celery_task_id or "",
                scene_id=existing_scene.id,
                project_id=existing_scene.project_id,
                status=existing_scene.status,
                progress=_PROGRESS_MAP.get(existing_scene.status, 0),
                output_video_url=existing_scene.output_video_url,
                enhanced_prompt=existing_scene.enhanced_prompt,
                model_used=existing_scene.model_used,
            )

    # ── Circuit breaker: block users in generation cooldown ──
    await assert_not_in_cooldown(str(current_user.id))

    # ── Verify project ownership ──
    result = await db.execute(
        select(Project).where(
            Project.id == payload.project_id,
            Project.user_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if payload.task_type in ["image_to_video", "image_to_image", "video_to_video", "image_to_3d"]:
        if not project.input_media_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please upload media to the project first for this task type",
            )

    plan_key = (current_user.plan or "free").lower()
    task_norm_early = (payload.task_type or "").strip().lower()
    if task_norm_early == "image_to_3d" and plan_key == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Image to 3D requires a paid plan. Subscribe in Billing to unlock.",
        )

    if task_norm_early == "text_to_story" and plan_key == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Story Studio requires a paid plan. Subscribe in Billing to unlock.",
        )

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

    # ── Monthly quota enforcement ──
    await enforce_generation_allowed(
        db,
        current_user,
        get_settings(),
        payload.task_type,
        duration_seconds=payload.duration_seconds,
    )

    task_norm = (payload.task_type or "").strip().lower()
    if task_norm in ("text_to_image", "image_to_image"):
        enforce_plan_image_model(plan_key, payload.image_model)

    # ── Plan tier access (model tier: basic / pro / premium) ──
    enforce_plan_access(current_user, payload.tier)

    # ── Credit cost- prefer model-specific lookup, fall back to provider cost ──
    # For text_to_story, image_model carries "text_to_story_3/5/8" for cost lookup
    model_key = payload.video_model if is_video_task(payload.task_type) else payload.image_model
    credit_cost = get_model_credit_cost(model_key, payload.task_type)
    if credit_cost <= 1 and not model_key:
        # Legacy fallback: compute from USD provider cost
        from app.config import get_plans_config
        plans_config = get_plans_config() or {}
        costs_map = plans_config.get("generation_costs", {})
        provider_cost = Decimal(str(costs_map.get(payload.tier, 0.10)))
        credit_cost = compute_credit_cost(provider_cost)

    add_lumina_watermark = plan_key == "free"

    # ── Velocity limit (new accounts only) ──
    if get_settings().enforce_credit_balance:
        await check_velocity_limit(db, current_user, credit_cost)

    # ── Create scene record ──
    scene = Scene(
        project_id=project.id,
        prompt=payload.prompt,
        tier=payload.tier,
        duration_seconds=payload.duration_seconds,
        status="pending",
        task_type=payload.task_type,
        idempotency_key=payload.idempotency_key,
    )
    db.add(scene)
    await db.flush()

    # ── Reserve credits before dispatching- prevents concurrent over-spend ──
    if get_settings().enforce_credit_balance:
        await reserve_credits(db, current_user, credit_cost, str(scene.id), reason="generation_reserve")

    project.status = "processing"
    await db.flush()

    # ── Dispatch to orchestrator (async via Celery) ──
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
        audio_url=payload.audio_url,
        resolution=payload.resolution,
        video_model=payload.video_model,
        generate_audio=payload.generate_audio,
        audio_prompt=payload.audio_prompt,
        audio_type=payload.audio_type,
        image_model=payload.image_model,
        reference_image_url=payload.reference_image_url,
        add_lumina_watermark=add_lumina_watermark,
        aspect_ratio=payload.aspect_ratio,
        story_scene_count=payload.story_scene_count,
        story_narrator_voice=payload.story_narrator_voice,
        story_video_model=payload.story_video_model,
    )

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
@limiter.limit("120/minute")
async def get_generation_status(
    request: Request,
    scene_id: uuid.UUID,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Poll the status of a generation job."""
    result = await db.execute(select(Scene).where(Scene.id == scene_id))
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail="Generation job not found")

    result = await db.execute(
        select(Project).where(
            Project.id == scene.project_id,
            Project.user_id == current_user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Generation job not found")

    return GenerationStatusResponse(
        job_id=scene.celery_task_id or "",
        scene_id=scene.id,
        project_id=scene.project_id,
        status=scene.status,
        progress=_PROGRESS_MAP.get(scene.status, 0),
        output_video_url=scene.output_video_url,
        enhanced_prompt=scene.enhanced_prompt,
        error_message=scene.error_message,
        model_used=scene.model_used,
    )
