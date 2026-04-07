"""
Video Generation Worker.
Handles the full pipeline: prompt enhancement → video generation → post-processing → storage.
"""

import asyncio
import uuid
from datetime import datetime
from decimal import Decimal

from celery import shared_task
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session as SyncSession, sessionmaker

from app.config import get_settings, get_plans_config

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

    db = SyncSessionLocal()

    async def async_pipeline():
        try:
            # Step 1: Enhance prompt
            enhanced_prompt = prompt
            if enhance_prompt:
                from app.services.prompt_engine import PromptEngine
                engine = PromptEngine()
                enhanced_prompt = await engine.enhance(prompt)

            # Step 2: Route and Generate Media
            from app.services.router import ModelRouter
            from app.db.session import get_async_session_factory
            
            async_session_factory = get_async_session_factory()
            async with async_session_factory() as async_db:
                adapter = await ModelRouter.get_best_provider(
                    async_db, task_type, tier, requested_provider
                )
                
                # Dispatch dynamically based on task_type (Video-only)
                if task_type == "image_to_video":
                    result = await adapter.image_to_video(input_media_url, enhanced_prompt, duration_seconds)
                elif task_type == "text_to_video":
                    result = await adapter.text_to_video(enhanced_prompt, duration_seconds)
                elif task_type == "video_to_video":
                    result = await adapter.video_to_video(input_media_url, enhanced_prompt, duration_seconds)
                else:
                    raise Exception(f"Task type {task_type} is not supported by Video Worker")

            if not result.success:
                raise Exception(f"Video generation failed: {result.error_message}")

            # Step 3: Upload to Storage
            from app.services.storage import StorageService
            storage = StorageService()
            
            media_url = await storage.upload_video(
                video_data=result.media_data,
                project_id=project_id,
            )

            return {
                "enhanced_prompt": enhanced_prompt,
                "result": result,
                "media_url": media_url
            }
        except Exception as e:
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

        return {
            "success": True,
            "scene_id": scene_id,
            "media_url": media_url,
            "model_used": result.model_name,
            "cost": str(cost),
        }

    except Exception as exc:
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
        except Exception:
            pass

        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=2 ** self.request.retries * 10)

    finally:
        db.close()
