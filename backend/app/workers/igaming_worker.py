"""
iGaming Asset Generator Worker.

Pipeline (all views run in parallel):
  1. PRIMARY   - img2img with template + style prompt
  2. ANGLE_L   - img2img with left-angle prompt
  3. ANGLE_R   - img2img with right-angle prompt
  4. PROMO     - img2img with promotional scene prompt

All 4 results are stored as JSON in output_video_url so the frontend can
render an asset grid without any schema changes.
"""

import asyncio
import json
import logging
import traceback
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from celery import shared_task
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings, get_plans_config

logger = logging.getLogger(__name__)
settings = get_settings()

sync_engine = create_engine(settings.database_url_sync)
SyncSessionLocal = sessionmaker(bind=sync_engine)


def _run_async(coro):
    try:
        return asyncio.run(coro)
    except RuntimeError:
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(coro)


# ── Templates & styles ────────────────────────────────────────────────────────

TEMPLATES: dict[str, str] = {
    "slot_icon":    "slot game icon, golden shiny, high contrast, centered object, isolated, game asset",
    "bonus_item":   "game bonus item, glowing magical aura, dark background, treasure, game UI asset",
    "promo_banner": "promotional casino asset, dramatic lighting, neon highlights, premium cinematic",
    "card":         "playing card asset, elegant border, casino quality, crisp clean design",
    "symbol":       "game symbol, bold graphic, vibrant colors, high contrast, centered",
    "custom":       "",
}

STYLES: dict[str, str] = {
    "gold":    "golden metallic finish, warm light, shiny reflections",
    "silver":  "silver chrome, cool light, metallic sheen",
    "gem":     "gemstone sparkle, crystal, vibrant prismatic colors",
    "neon":    "neon glow, electric colors, dark background",
    "classic": "classic casino style, rich colors, elegant",
}

ANGLE_PROMPTS: dict[str, str] = {
    "angle_left":  "slight left rotation 30 degrees, same object, consistent style",
    "angle_right": "slight right rotation 30 degrees, same object, consistent style",
    "promo":       "promotional game scene, casino spotlight, dynamic background, asset hero shot",
}


def _build_prompt(base: str, template: str, style: str, angle: str) -> str:
    parts = []
    if template and template != "custom" and TEMPLATES.get(template):
        parts.append(TEMPLATES[template])
    if base:
        parts.append(base)
    if style and STYLES.get(style):
        parts.append(STYLES[style])
    if angle:
        parts.append(ANGLE_PROMPTS.get(angle, ""))
    return ", ".join(p for p in parts if p).strip(", ")


# ── Single asset generator ────────────────────────────────────────────────────

async def _generate_asset(
    adapter,
    image_url: str,
    prompt: str,
    use_dev: bool,
    model_override: str = "flux-dev",
) -> Optional[str]:
    """Run one img2img call; return the output URL or None on failure."""
    try:
        model = model_override if use_dev else "flux-schnell"
        result = await adapter.image_to_image(image_url, prompt, image_model=model)
        if result.success and result.media_url:
            return result.media_url
    except Exception as e:
        logger.warning(f"[IgamingWorker] asset gen failed: {e}")
    return None


# ── Main Celery task ──────────────────────────────────────────────────────────

@shared_task(
    name="app.workers.igaming_worker.generate_igaming_assets",
    bind=True,
    max_retries=1,
    soft_time_limit=300,
    time_limit=360,
)
def generate_igaming_assets(
    self,
    scene_id: str,
    project_id: str,
    user_id: str,
    prompt: str,
    input_media_url: str = "",
    tier: str = "basic",
    duration_seconds: int = 0,
    enhance_prompt: bool = False,
    task_type: str = "igaming_assets",
    requested_provider: Optional[str] = None,
    generate_audio: bool = False,
    audio_prompt: Optional[str] = None,
    audio_type: str = "sfx",
    video_model: Optional[str] = None,
    add_lumina_watermark: bool = False,
    **kwargs,
):
    """
    iGaming Asset Pipeline (Celery task):
    Generates 4 assets in parallel: primary, angle_left, angle_right, promo.
    Stores JSON of all URLs in output_video_url for frontend grid rendering.
    """
    from app.models.draft import Draft
    from app.models.project import Project
    from app.models.scene import Scene
    from app.models.usage_log import UsageLog

    template    = str(kwargs.get("igaming_template", "slot_icon"))
    style       = str(kwargs.get("igaming_style", "gold"))
    quality     = str(kwargs.get("igaming_quality", "standard"))  # standard | premium
    # image_model holds the actual model id (flux-schnell, flux-dev, flux-pro, flux-2-pro)
    img_model   = str(kwargs.get("image_model", "flux-dev") or "flux-dev")
    # strip igaming_ cost-key prefix if frontend sends costKey instead of model value
    img_model   = img_model.replace("igaming_flux_", "flux-").replace("igaming_", "flux-")
    use_dev     = img_model != "flux-schnell"

    logger.info(
        f"[IgamingWorker] scene={scene_id} template={template} "
        f"style={style} quality={quality}"
    )

    db = SyncSessionLocal()

    async def async_pipeline():
        cfg = get_settings()

        # ── Adapter ───────────────────────────────────────────────────────────
        from app.db.session import get_async_session_factory
        from app.services.router import ModelRouter

        async_sf = get_async_session_factory()
        async with async_sf() as async_db:
            adapter = await ModelRouter.get_best_provider(
                async_db, "image_to_image", tier, requested_provider
            )
        logger.info(f"[IgamingWorker] Adapter: {adapter.name}")

        if not input_media_url:
            raise RuntimeError("iGaming Asset Generator requires an input image")

        # ── Build prompts ─────────────────────────────────────────────────────
        base          = prompt or ""
        p_primary     = _build_prompt(base, template, style, "")
        p_angle_l     = _build_prompt(base, template, style, "angle_left")
        p_angle_r     = _build_prompt(base, template, style, "angle_right")
        p_promo       = _build_prompt(base, template, style, "promo")

        logger.info(f"[IgamingWorker] Primary prompt: {p_primary[:80]}")

        # ── Generate 4 views in parallel ──────────────────────────────────────
        # angle views always use schnell (cheap); primary and promo use selected model
        results = await asyncio.gather(
            _generate_asset(adapter, input_media_url, p_primary,  img_model != "flux-schnell", img_model),
            _generate_asset(adapter, input_media_url, p_angle_l,  False),
            _generate_asset(adapter, input_media_url, p_angle_r,  False),
            _generate_asset(adapter, input_media_url, p_promo,    img_model != "flux-schnell", img_model),
            return_exceptions=True,
        )

        primary, angle_l, angle_r, promo = [
            r if isinstance(r, str) else None for r in results
        ]

        if not primary:
            raise RuntimeError("Primary asset generation failed")

        success_count = sum(1 for r in [primary, angle_l, angle_r, promo] if r)
        logger.info(f"[IgamingWorker] {success_count}/4 assets generated")

        # ── Upload fallbacks: reuse primary for any failed views ───────────────
        output_pkg = {
            "primary":     primary,
            "angle_left":  angle_l  or primary,
            "angle_right": angle_r  or primary,
            "promo":       promo    or primary,
            "template":    template,
            "style":       style,
            "views_generated": success_count,
        }

        # Store JSON as the media URL so OutputPanel can parse it
        output_json = json.dumps(output_pkg)
        logger.info(f"[IgamingWorker] Package ready: {success_count} views")

        return {
            "output_json": output_json,
            "primary_url": primary,
            "model_name":  f"{adapter.name}/igaming-{quality}",
        }

    try:
        scene = db.query(Scene).filter(Scene.id == uuid.UUID(scene_id)).first()
        if not scene:
            raise RuntimeError(f"Scene {scene_id} not found")
        scene.status = "generating"
        db.commit()

        res = _run_async(async_pipeline())

        plans_config = get_plans_config()
        costs = plans_config.get("generation_costs", {}) if plans_config else {}
        cost = Decimal(str(costs.get(tier, 0.08)))

        scene.output_video_url = res["output_json"]   # JSON stored here
        scene.enhanced_prompt  = res["primary_url"]   # primary URL for quick access
        scene.model_used       = res["model_name"]
        scene.provider_used    = res["model_name"]
        scene.task_type        = task_type
        scene.cost             = cost
        scene.status           = "completed"
        scene.completed_at     = datetime.utcnow()

        if settings.enforce_credit_balance:
            async def _fin():
                from app.db.session import get_async_session_factory
                from app.services.billing_quota import compute_credit_cost, finalize_deduction
                async_sf = get_async_session_factory()
                async with async_sf() as adb:
                    async with adb.begin():
                        await finalize_deduction(adb, user_id, compute_credit_cost(cost), scene_id, reason="igaming_generation")
            try:
                _run_async(_fin())
            except Exception as e:
                logger.warning(f"[IgamingWorker] Credit finalize (non-fatal): {e}")

        db.add(Draft(scene_id=uuid.UUID(scene_id), version=1, video_url=res["primary_url"], is_final=True))

        proj = db.query(Project).filter(Project.id == uuid.UUID(project_id)).first()
        if proj:
            proj.output_video_url = res["primary_url"]
            proj.status = "completed"

        db.add(UsageLog(
            user_id=uuid.UUID(user_id), action="generation",
            model_used=res["model_name"], provider_used=res["model_name"],
            task_type=task_type, tier=tier, cost=cost,
        ))
        db.commit()
        logger.info(f"[IgamingWorker] ✅ completed: {scene_id}")
        return {"success": True, "scene_id": scene_id, "output_json": res["output_json"]}

    except Exception as exc:
        logger.error(f"[IgamingWorker] ❌ failed: {exc}\n{traceback.format_exc()[:600]}")
        try:
            s = db.query(Scene).filter(Scene.id == uuid.UUID(scene_id)).first()
            if s:
                s.status = "failed"
                s.error_message = str(exc)[:500]
                db.commit()
            p = db.query(Project).filter(Project.id == uuid.UUID(project_id)).first()
            if p:
                p.status = "failed"
                db.commit()
        except Exception:
            pass

        if settings.enforce_credit_balance:
            async def _rel():
                from app.db.session import get_async_session_factory
                from app.services.billing_quota import compute_credit_cost, release_reservation
                from app.services.circuit_breaker import record_failure
                plans_cfg = get_plans_config() or {}
                cv = Decimal(str((plans_cfg.get("generation_costs") or {}).get(tier, 0.08)))
                async_sf = get_async_session_factory()
                async with async_sf() as adb:
                    async with adb.begin():
                        await release_reservation(adb, user_id, compute_credit_cost(cv), scene_id)
                await record_failure(user_id)
            try:
                _run_async(_rel())
            except Exception as e:
                logger.warning(f"[IgamingWorker] Credit release (non-fatal): {e}")

        raise self.retry(exc=exc, countdown=15)
    finally:
        db.close()
