"""
Video Generation Worker.
Handles the full pipeline: prompt enhancement → video generation → post-processing → storage.
"""

import asyncio
import uuid
import logging
import math
import traceback
from datetime import datetime
from decimal import Decimal

from celery import shared_task
from sqlalchemy import create_engine
from sqlalchemy.orm import Session as SyncSession, sessionmaker

from app.config import get_settings, get_plans_config

logger = logging.getLogger(__name__)
settings = get_settings()

# Sync engine for Celery workers (Celery doesn't support async natively)
sync_engine = create_engine(settings.database_url_sync)
SyncSessionLocal = sessionmaker(bind=sync_engine)


def _run_async(coro):
    """Run an async function in a sync context (for Celery). Ensures a fresh loop per task."""
    try:
        return asyncio.run(coro)
    except RuntimeError:
        # Fallback if a loop is already running in this thread (rare in Celery)
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(coro)


@shared_task(name="app.workers.video_worker.generate_video", bind=True, max_retries=3)
def generate_video(
    self,
    scene_id: str,
    project_id: str,
    user_id: str,
    prompt: str,
    input_media_url: str,
    tier: str = "basic",
    duration_seconds: int = 12,
    enhance_prompt: bool = True,
    task_type: str = "image_to_video",
    requested_provider: str = None,
    preserve_subject: bool = True,
    cinematic_redraw: bool = False,
    add_lumina_watermark: bool = False,
    **kwargs
):
    """
    Full multimodal generation pipeline (Robust Async Wrapper):
    1. Enhance prompt (LLM)
    2. Generate media (AI model via Router)
    3. Post-process (FFmpeg)
    4. Upload to storage
    5. Update database
    """
    from app.models.scene import Scene
    from app.models.project import Project
    from app.models.usage_log import UsageLog
    from app.models.draft import Draft

    logger.info(f"[Worker] Starting video generation for Scene: {scene_id}, Project: {project_id}")
    db = SyncSessionLocal()

    async def async_pipeline():
        try:
            # Step 1: Enhance prompt
            enhanced_prompt = prompt
            if enhance_prompt:
                logger.info(f"[Worker] Enhancing prompt: {prompt[:50]}...")
                from app.services.prompt_engine import PromptEngine
                engine = PromptEngine()
                enhanced_prompt = await engine.enhance(prompt)
                logger.debug(f"[Worker] Enhanced prompt: {enhanced_prompt}")

            # Step 2: Route and Generate Media
            from app.services.router import ModelRouter
            from app.db.session import get_async_session_factory
            
            async_session_factory = get_async_session_factory()
            async with async_session_factory() as async_db:
                adapter = await ModelRouter.get_best_provider(
                    async_db, task_type, tier, requested_provider
                )
                
                logger.info(f"[Worker] Using adapter: {adapter.name} for task: {task_type}")

                # Auto-generate audio via Beatoven if requested (wan model only, $0.10 extra)
                resolved_audio_url = kwargs.get("audio_url")
                generate_audio = kwargs.get("generate_audio", False)
                audio_prompt = kwargs.get("audio_prompt") or enhanced_prompt
                audio_type = kwargs.get("audio_type", "sfx")
                video_model = kwargs.get("video_model")

                if generate_audio and not resolved_audio_url:
                    # Auto-switch to wan when audio is requested (only wan supports audio_url)
                    if not video_model:
                        video_model = "wan"
                    logger.info(f"[Worker] Auto-generating audio: type={audio_type}  prompt={audio_prompt[:60]}…")
                    audio_result = await adapter.text_to_audio(
                        prompt=audio_prompt,
                        duration_seconds=min(duration_seconds, 30),
                        audio_type=audio_type,
                    )
                    if audio_result.success:
                        resolved_audio_url = audio_result.media_url
                        logger.info(f"[Worker] Audio generated → {resolved_audio_url[:80]}…")
                    else:
                        logger.warning(f"[Worker] Audio generation failed ({audio_result.error_message}), proceeding without audio")

                # Free-tier: overlay the "Lumina" brand watermark on the output
                lumina_wm = "Lumina" if add_lumina_watermark else None

                # Dispatch dynamically based on task_type (Video-only)
                if task_type == "image_to_video":
                    result = await adapter.image_to_video(
                        input_media_url, enhanced_prompt, duration_seconds,
                        tier=tier,
                        audio_url=resolved_audio_url,
                        resolution=kwargs.get("resolution"),
                        model=video_model,
                        watermark_text=lumina_wm,
                        reference_image_url=kwargs.get("reference_image_url"),
                    )
                elif task_type == "text_to_video":
                    result = await adapter.text_to_video(
                        enhanced_prompt, duration_seconds,
                        tier=tier,
                        audio_url=resolved_audio_url,
                        resolution=kwargs.get("resolution"),
                        model=kwargs.get("video_model"),
                        watermark_text=lumina_wm,
                    )
                elif task_type == "video_to_video":
                    result = await adapter.video_to_video(input_media_url, enhanced_prompt, duration_seconds)
                else:
                    raise Exception(f"Task type {task_type} is not supported by Video Worker")

            if not result.success:
                logger.error(f"[Worker] Adapter failed: {result.error_message}")
                raise Exception(f"Video generation failed: {result.error_message}")

            # Step 3: Upload to Storage
            logger.info(f"[Worker] Uploading generated video to storage...")
            from app.services.storage import StorageService
            storage = StorageService()
            
            video_bytes = result.media_data
            if not video_bytes and result.media_url and result.media_url.startswith("http"):
                logger.info(f"[Worker] Downloading video from external URL: {result.media_url}")
                import httpx
                async with httpx.AsyncClient(timeout=120.0) as client:
                    resp = await client.get(result.media_url)
                    resp.raise_for_status()
                    video_bytes = resp.content

            if not video_bytes:
                raise Exception("No video data available for upload")

            media_url = await storage.upload_video(
                video_data=video_bytes,
                project_id=project_id,
            )
            logger.info(f"[Worker] Upload successful: {media_url}")

            return {
                "enhanced_prompt": enhanced_prompt,
                "result": result,
                "media_url": media_url
            }
        except Exception as e:
            logger.error(f"[Worker] Pipeline error: {str(e)}")
            logger.error(traceback.format_exc())
            raise e

    try:
        # Initial Database Update
        scene = db.query(Scene).filter(Scene.id == uuid.UUID(scene_id)).first()
        if not scene:
            raise Exception(f"Scene {scene_id} not found")

        scene.status = "enhancing"
        db.commit()

        # EXECUTE UNIFIED PIPELINE (One loop for everything)
        pipeline_result = _run_async(async_pipeline())
        
        enhanced_prompt = pipeline_result["enhanced_prompt"]
        result = pipeline_result["result"]
        media_url = pipeline_result["media_url"]

        # Final Database Updates (Sync)
        scene.enhanced_prompt = enhanced_prompt
        scene.model_used = result.model_name
        scene.provider_used = result.model_name
        scene.task_type = task_type
        scene.output_video_url = media_url
        
        plans_config = get_plans_config() or {}
        costs = plans_config.get("generation_costs", {}) if plans_config else {}
        cost = Decimal(str(costs.get(tier, 0.10)))
        
        scene.cost = cost
        scene.status = "completed"
        scene.completed_at = datetime.utcnow()

        # Finalize credit deduction- only active when the credit gate is enabled
        if settings.enforce_credit_balance:
            async def _finalize():
                from app.services.billing_quota import finalize_deduction, compute_credit_cost
                from app.db.session import get_async_session_factory
                credit_amount = compute_credit_cost(cost)
                async_sf = get_async_session_factory()
                async with async_sf() as async_db:
                    async with async_db.begin():
                        await finalize_deduction(
                            async_db, user_id, credit_amount, scene_id, reason="generation_cost"
                        )
            try:
                _run_async(_finalize())
            except Exception as ledger_err:
                logger.warning("[Worker] Credit finalization failed (non-fatal): %s", ledger_err)

        draft = Draft(
            scene_id=uuid.UUID(scene_id),
            version=1,
            video_url=media_url,
            is_final=True,
        )
        db.add(draft)

        project = db.query(Project).filter(Project.id == uuid.UUID(project_id)).first()
        if project:
            project.output_video_url = media_url
            project.status = "completed"

        unit_s = plans_config.get("video_billing_unit_seconds")
        unit_s = max(1, int(unit_s)) if unit_s is not None else 15
        dur = int(scene.duration_seconds) if scene and scene.duration_seconds else int(duration_seconds)
        dur = max(1, dur)
        v_units = max(1, math.ceil(dur / unit_s))

        usage_log = UsageLog(
            user_id=uuid.UUID(user_id),
            action="generation",
            model_used=result.model_name,
            provider_used=result.model_name,
            task_type=task_type,
            tier=tier,
            cost=cost,
            video_billing_units=v_units,
        )
        db.add(usage_log)
        db.commit()

        # Circuit breaker: reset failure counter on success
        if settings.enforce_credit_balance:
            async def _cb_success():
                from app.services.circuit_breaker import record_success
                await record_success(user_id)
            try:
                _run_async(_cb_success())
            except Exception:
                pass

        logger.info(f"[Worker] Task completed successfully for Scene: {scene_id}")

        return {
            "success": True,
            "scene_id": scene_id,
            "media_url": media_url,
            "model_used": result.model_name,
            "cost": str(cost),
        }

    except Exception as exc:
        logger.error(f"[Worker] Task failed for Scene: {scene_id}. Error: {str(exc)}")
        # Mark as failed
        try:
            scene = db.query(Scene).filter(Scene.id == uuid.UUID(scene_id)).first()
            if scene:
                scene.status = "failed"
                scene.error_message = str(exc)[:500]
                db.commit()

            project = db.query(Project).filter(Project.id == uuid.UUID(project_id)).first()
            if project:
                project.status = "failed"
                db.commit()
        except Exception as e:
            logger.error(f"[Worker] Failed to update error status in DB: {str(e)}")

        # Release the credit reservation and record circuit-breaker failure
        if settings.enforce_credit_balance:
            async def _release():
                from app.services.billing_quota import release_reservation, compute_credit_cost
                from app.services.circuit_breaker import record_failure
                from app.db.session import get_async_session_factory
                plans_cfg = get_plans_config() or {}
                costs_map = plans_cfg.get("generation_costs", {}) if plans_cfg else {}
                cost_val = Decimal(str(costs_map.get(tier, 0.10)))
                credit_amount = compute_credit_cost(cost_val)
                async_sf = get_async_session_factory()
                async with async_sf() as async_db:
                    async with async_db.begin():
                        await release_reservation(async_db, user_id, credit_amount, scene_id)
                await record_failure(user_id)
            try:
                _run_async(_release())
            except Exception as ledger_err:
                logger.warning("[Worker] Credit release/circuit-breaker failed (non-fatal): %s", ledger_err)

        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 10)

    finally:
        db.close()
