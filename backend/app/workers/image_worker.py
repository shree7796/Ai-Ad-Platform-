"""
Image Generation Worker.
视觉生成工作流：提示词增强 → 图像生成 → 存储。
"""

import asyncio
import uuid
import logging
import traceback
from datetime import datetime
from decimal import Decimal

from celery import shared_task
from sqlalchemy import create_engine, select
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


@shared_task(name="app.workers.image_worker.generate_image", bind=True, max_retries=3)
def generate_image(
    self,
    scene_id: str,
    project_id: str,
    user_id: str,
    prompt: str,
    input_media_url: str,
    tier: str = "basic",
    duration_seconds: int = 5,
    enhance_prompt: bool = True,
    task_type: str = "text_to_image",
    requested_provider: str = None,
    preserve_subject: bool = True,
    cinematic_redraw: bool = False,
    hero_cinematic_reframe: bool = False,
    **kwargs
):
    """
    Image generation pipeline (Robust Async Wrapper):
    1. Enhance prompt (LLM)
    2. Generate image (AI model via Router)
    3. Upload to storage
    4. Update database
    """
    from app.models.scene import Scene
    from app.models.project import Project
    from app.models.usage_log import UsageLog
    from app.models.draft import Draft

    logger.info(f"[Worker] Starting image generation for Scene: {scene_id}, Project: {project_id}")
    db = SyncSessionLocal()

    async def async_pipeline():
        try:
            # Step 1: Enhance prompt
            raw_user_prompt = prompt
            enhanced_prompt = prompt
            if enhance_prompt:
                logger.info(f"[Worker] Enhancing prompt: {prompt[:50]}...")
                from app.services.prompt_engine import PromptEngine
                engine = PromptEngine()
                enhanced_prompt = await engine.enhance(prompt)
                logger.debug(f"[Worker] Enhanced prompt: {enhanced_prompt}")

            # Fal img2img: enhanced text often says "preserve exactly" which fights edits.
            kwargs["user_prompt"] = raw_user_prompt

            # Map image_model → model so fal_adapter.image_to_image() can read it
            if kwargs.get("image_model"):
                kwargs["model"] = kwargs.pop("image_model")
            else:
                kwargs.pop("image_model", None)

            if task_type == "image_to_image":
                kwargs["cinematic_redraw"] = cinematic_redraw
                kwargs["preserve_subject"] = False if cinematic_redraw else preserve_subject
                kwargs["hero_cinematic_reframe"] = bool(
                    hero_cinematic_reframe and not cinematic_redraw
                )
                logger.info(
                    f"[Worker] image_to_image routing flags: preserve_subject={kwargs['preserve_subject']} "
                    f"cinematic_redraw={cinematic_redraw} hero_cinematic_reframe={kwargs['hero_cinematic_reframe']}"
                )

            # Step 2: Route and Generate Media
            from app.services.router import ModelRouter
            from app.db.session import get_async_session_factory
            
            async_session_factory = get_async_session_factory()
            async with async_session_factory() as async_db:
                adapter = await ModelRouter.get_best_provider(
                    async_db, task_type, tier, requested_provider
                )
                
                logger.info(f"[Worker] Using adapter: {adapter.name} for task: {task_type}")
                
                # Marketplace hint: use RAW prompt so LLM prose like "white background"
                # describing the photo does not trigger this.
                if not kwargs.get("remove_background"):
                    low_raw = raw_user_prompt.lower()
                    if any(x in low_raw for x in ["flipkart", "amazon", "white background"]):
                        logger.info("[Worker] Auto-enabling background removal for marketplace style")
                        kwargs["remove_background"] = True

                # Image specific dispatch
                if task_type == "text_to_image":
                    result = await adapter.text_to_image(enhanced_prompt, **kwargs)
                elif task_type == "image_to_image":
                    result = await adapter.image_to_image(input_media_url, enhanced_prompt, **kwargs)
                else:
                    raise Exception(f"Task type {task_type} is not supported by Image Worker")

            if not result.success:
                logger.error(f"[Worker] Adapter failed: {result.error_message}")
                raise Exception(f"Image generation failed: {result.error_message}")

            # Step 3: Upload to Storage
            logger.info(f"[Worker] Uploading generated image to storage...")
            from app.services.storage import StorageService
            storage = StorageService()
            
            image_bytes = result.media_data
            if not image_bytes and result.media_url and result.media_url.startswith("http"):
                logger.info(f"[Worker] Downloading image from external URL: {result.media_url}")
                import httpx
                async with httpx.AsyncClient(timeout=60.0) as client:
                    resp = await client.get(result.media_url)
                    resp.raise_for_status()
                    image_bytes = resp.content
            
            if not image_bytes:
                raise Exception("No image data available for upload")

            media_url = await storage.upload_image(
                image_data=image_bytes,
                project_id=project_id,
                content_type="image/png"
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
        
        plans_config = get_plans_config()
        costs = plans_config.get("generation_costs", {}) if plans_config else {}
        cost = Decimal(str(costs.get(tier, 0.10)))
        
        scene.cost = cost
        scene.status = "completed"
        scene.completed_at = datetime.utcnow()

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

        usage_log = UsageLog(
            user_id=uuid.UUID(user_id),
            action="generation",
            model_used=result.model_name,
            provider_used=result.model_name,
            task_type=task_type,
            tier=tier,
            cost=cost,
        )
        db.add(usage_log)
        db.commit()

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

        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 10)

    finally:
        db.close()
