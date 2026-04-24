"""
Story Studio Worker.

Pipeline:
  1. GPT splits story → N scenes (title + video_prompt + narration text)
  2. Per-scene: text-to-video clip (Kling / Wan / Seedance via adapter)
  3. Per-scene: TTS narration (OpenAI TTS → Fal Chatterbox fallback)
  4. Background music (Beatoven via adapter)
  5. FFmpeg: overlay narration + stitch clips + mix music → single MP4
  6. Upload to MinIO storage
"""

import asyncio
import json
import logging
import os
import shutil
import tempfile
import traceback
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Dict, List, Optional

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


# ─────────────────────────────────────────────────────────────────────────────
# Step 1: GPT scene breakdown
# ─────────────────────────────────────────────────────────────────────────────

_SCENE_SYSTEM = """\
You are a creative video story director. Split the user's story/script into exactly {count} short scenes.

Return ONLY a valid JSON array (no markdown fences, no prose). Each item:
  "title"        : short scene title (≤6 words)
  "video_prompt" : cinematic visual description for AI video (20-40 words, no dialogue)
  "narration"    : narrator voiceover text (15-40 words, engaging YouTube storytelling tone)

Rules:
- Scenes must be sequential and story-coherent.
- video_prompt = vivid visuals only, no spoken words.
- narration = warm, engaging narrator prose."""


async def _parse_story_to_scenes(
    prompt: str,
    scene_count: int,
    cfg,
) -> List[Dict]:
    """Call GPT to break story into scenes. Falls back to simple splits."""
    try:
        import httpx

        if not cfg.openai_api_key or cfg.llm_provider in ("mock", "mock_llm"):
            raise ValueError("OpenAI not configured")

        # More scenes → more tokens needed (each scene needs ~100 tokens)
        max_tokens = min(4000, max(900, scene_count * 180))
        body = {
            "model": getattr(cfg, "llm_model", "gpt-4o-mini"),
            "messages": [
                {"role": "system", "content": _SCENE_SYSTEM.format(count=scene_count)},
                {"role": "user", "content": prompt[:4000]},
            ],
            "max_tokens": max_tokens,
            "temperature": 0.75,
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                json=body,
                headers={"Authorization": f"Bearer {cfg.openai_api_key}"},
            )
            r.raise_for_status()
            raw = r.json()["choices"][0]["message"]["content"].strip()

        # Strip optional markdown fences
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]

        scenes = json.loads(raw)
        if isinstance(scenes, list) and scenes:
            return scenes[:scene_count]
    except Exception as e:
        logger.warning(f"[StoryWorker] GPT scene parse failed ({e})- using word-split fallback")

    # Fallback: naive word-split
    words = prompt.split()
    chunk = max(1, len(words) // scene_count)
    return [
        {
            "title": f"Scene {i + 1}",
            "video_prompt": " ".join(words[i * chunk : (i + 1) * chunk])[:200] or prompt[:200],
            "narration": " ".join(words[i * chunk : (i + 1) * chunk])[:150] or prompt[:150],
        }
        for i in range(scene_count)
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Step 3: TTS narration
# ─────────────────────────────────────────────────────────────────────────────

_VALID_VOICES = {"alloy", "echo", "fable", "onyx", "nova", "shimmer"}


async def _tts_openai(text: str, voice: str, api_key: str) -> Optional[bytes]:
    try:
        import httpx

        voice = voice if voice in _VALID_VOICES else "alloy"
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(
                "https://api.openai.com/v1/audio/speech",
                json={"model": "tts-1", "input": text[:4096], "voice": voice},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            r.raise_for_status()
            return r.content
    except Exception as e:
        logger.warning(f"[StoryWorker] OpenAI TTS failed: {e}")
        return None


async def _tts_chatterbox(text: str) -> Optional[bytes]:
    try:
        import fal_client, httpx

        handler = await asyncio.to_thread(
            fal_client.submit,
            "fal-ai/chatterbox-tts",
            arguments={"text": text[:800], "exaggeration": 0.45},
        )
        result = await asyncio.to_thread(handler.get)
        audio_url = (
            (result or {}).get("audio", {}).get("url")
            or (result or {}).get("audio_url")
        )
        if audio_url:
            async with httpx.AsyncClient(timeout=120.0) as client:
                r = await client.get(audio_url)
                r.raise_for_status()
                return r.content
    except Exception as e:
        logger.warning(f"[StoryWorker] Chatterbox TTS failed: {e}")
    return None


async def _generate_narration(text: str, voice: str, cfg) -> Optional[bytes]:
    """OpenAI TTS → Chatterbox fallback → None."""
    if not text.strip():
        return None
    if cfg.openai_api_key and cfg.llm_provider not in ("mock", "mock_llm"):
        result = await _tts_openai(text, voice, cfg.openai_api_key)
        if result:
            return result
    return await _tts_chatterbox(text)


# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Per-scene video clip
# ─────────────────────────────────────────────────────────────────────────────


async def _download(url: str) -> bytes:
    import httpx

    async with httpx.AsyncClient(timeout=300.0) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.content


async def _generate_clip(adapter, video_prompt: str, video_model: str, duration: int) -> Optional[bytes]:
    try:
        result = await adapter.text_to_video(
            video_prompt,
            duration_seconds=duration,
            video_model=video_model,
        )
        if not result.success:
            logger.error(f"[StoryWorker] Clip failed: {result.error_message}")
            return None
        if result.media_data:
            return result.media_data
        if result.media_url and result.media_url.startswith("http"):
            return await _download(result.media_url)
    except Exception as e:
        logger.error(f"[StoryWorker] Clip exception: {e}")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Step 5: FFmpeg stitch
# ─────────────────────────────────────────────────────────────────────────────


def _guess_ext(data: bytes, default: str = "wav") -> str:
    if data[:3] == b"ID3" or data[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return "mp3"
    return default


async def _run_ffmpeg(*args: str) -> bool:
    proc = await asyncio.create_subprocess_exec(
        *args,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    _, stderr = await proc.communicate()
    if proc.returncode != 0:
        logger.warning(f"[StoryWorker] FFmpeg: {' '.join(args[:4])} … exit {proc.returncode}: {stderr.decode()[:200]}")
    return proc.returncode == 0


async def _stitch_story(
    clips: List[bytes],
    narrations: List[Optional[bytes]],
    music: Optional[bytes],
    clip_duration: int = 5,
) -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        # ── Write clip files ────────────────────────────────────────────────
        clip_paths = []
        for i, clip in enumerate(clips):
            p = os.path.join(tmp, f"clip_{i}.mp4")
            with open(p, "wb") as f:
                f.write(clip)
            clip_paths.append(p)

        # ── Write narration files ──────────────────────────────────────────
        narr_paths: List[Optional[str]] = []
        for i, narr in enumerate(narrations):
            if narr:
                ext = _guess_ext(narr)
                p = os.path.join(tmp, f"narr_{i}.{ext}")
                with open(p, "wb") as f:
                    f.write(narr)
                narr_paths.append(p)
            else:
                narr_paths.append(None)

        # ── Write music file ───────────────────────────────────────────────
        music_path: Optional[str] = None
        if music:
            ext = _guess_ext(music)
            music_path = os.path.join(tmp, f"music.{ext}")
            with open(music_path, "wb") as f:
                f.write(music)

        # ── Step A: Re-encode each clip + overlay narration ────────────────
        narrated: List[str] = []
        for i, (cp, np) in enumerate(zip(clip_paths, narr_paths)):
            out = os.path.join(tmp, f"narrated_{i}.mp4")
            if np and os.path.exists(np):
                ok = await _run_ffmpeg(
                    "ffmpeg", "-y",
                    "-i", cp,
                    "-i", np,
                    "-filter_complex", f"[1:a]apad[padded];[padded]atrim=duration={clip_duration}[ta]",
                    "-map", "0:v:0", "-map", "[ta]",
                    "-c:v", "libx264", "-crf", "22", "-preset", "fast",
                    "-c:a", "aac", "-b:a", "128k", "-shortest", out,
                )
                if not ok or not os.path.exists(out):
                    # Fallback: silent audio
                    await _run_ffmpeg(
                        "ffmpeg", "-y", "-i", cp,
                        "-f", "lavfi", "-i", "anullsrc=cl=stereo:r=44100",
                        "-c:v", "libx264", "-crf", "22", "-preset", "fast",
                        "-c:a", "aac", "-b:a", "128k", "-shortest", out,
                    )
            else:
                await _run_ffmpeg(
                    "ffmpeg", "-y", "-i", cp,
                    "-f", "lavfi", "-i", "anullsrc=cl=stereo:r=44100",
                    "-c:v", "libx264", "-crf", "22", "-preset", "fast",
                    "-c:a", "aac", "-b:a", "128k", "-shortest", out,
                )
            if os.path.exists(out):
                narrated.append(out)
            else:
                logger.warning(f"[StoryWorker] narrated_{i}.mp4 missing- skipping")

        if not narrated:
            raise RuntimeError("No clips survived the narration step")

        # ── Step B: Concatenate ────────────────────────────────────────────
        concat_txt = os.path.join(tmp, "concat.txt")
        with open(concat_txt, "w") as f:
            for p in narrated:
                f.write(f"file '{p}'\n")

        concat_out = os.path.join(tmp, "concat.mp4")
        ok = await _run_ffmpeg(
            "ffmpeg", "-y",
            "-f", "concat", "-safe", "0",
            "-i", concat_txt,
            "-c", "copy", concat_out,
        )
        if not ok or not os.path.exists(concat_out):
            raise RuntimeError("FFmpeg concat step failed")

        # ── Step C: Mix background music ───────────────────────────────────
        final = os.path.join(tmp, "final_story.mp4")
        if music_path and os.path.exists(music_path):
            ok = await _run_ffmpeg(
                "ffmpeg", "-y",
                "-i", concat_out,
                "-i", music_path,
                "-filter_complex",
                "[0:a]volume=1.3[narr];[1:a]volume=0.22,apad[mus];"
                "[narr][mus]amix=inputs=2:duration=first:dropout_transition=3[aout]",
                "-map", "0:v", "-map", "[aout]",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", final,
            )
            if not ok or not os.path.exists(final):
                shutil.copy(concat_out, final)
        else:
            shutil.copy(concat_out, final)

        if not os.path.exists(final):
            raise RuntimeError("Final story MP4 not produced")

        with open(final, "rb") as f:
            return f.read()


# ─────────────────────────────────────────────────────────────────────────────
# Main Celery task
# ─────────────────────────────────────────────────────────────────────────────


@shared_task(
    name="app.workers.story_worker.generate_story",
    bind=True,
    max_retries=1,
    soft_time_limit=3600,   # 1 h - long stories (20 scenes × 10s) may take 45–55 min
    time_limit=4200,        # 70 min hard limit
)
def generate_story(
    self,
    scene_id: str,
    project_id: str,
    user_id: str,
    prompt: str,
    input_media_url: str = "",
    tier: str = "basic",
    duration_seconds: int = 5,
    enhance_prompt: bool = False,
    task_type: str = "text_to_story",
    requested_provider: Optional[str] = None,
    generate_audio: bool = True,
    audio_prompt: Optional[str] = None,
    audio_type: str = "music",
    video_model: Optional[str] = None,
    add_lumina_watermark: bool = False,
    **kwargs,
):
    """
    Story Studio pipeline (Celery task):
    GPT → clips → TTS narration → music → FFmpeg stitch → upload
    """
    from app.models.draft import Draft
    from app.models.project import Project
    from app.models.scene import Scene
    from app.models.usage_log import UsageLog

    story_scene_count = max(3, min(20, int(kwargs.get("story_scene_count", 5))))
    story_voice = str(kwargs.get("story_narrator_voice", "alloy"))
    story_video_model = str(kwargs.get("story_video_model") or video_model or "kling_21_pro")

    logger.info(
        f"[StoryWorker] scene={scene_id} scenes={story_scene_count} "
        f"voice={story_voice} model={story_video_model}"
    )

    db = SyncSessionLocal()

    async def async_pipeline():
        cfg = get_settings()

        # ── 1. GPT scene breakdown ─────────────────────────────────────────
        logger.info(f"[StoryWorker] Parsing story into {story_scene_count} scenes…")
        scenes = await _parse_story_to_scenes(prompt, story_scene_count, cfg)
        logger.info(f"[StoryWorker] Got {len(scenes)} scenes")

        # ── 2. Adapter ─────────────────────────────────────────────────────
        from app.db.session import get_async_session_factory
        from app.services.router import ModelRouter

        async_sf = get_async_session_factory()
        async with async_sf() as async_db:
            adapter = await ModelRouter.get_best_provider(
                async_db, "text_to_video", tier, requested_provider
            )
        logger.info(f"[StoryWorker] Adapter: {adapter.name}")

        # ── 3. Generate video clips (parallel, max 4 concurrent) ──────────
        clip_dur = max(3, min(10, duration_seconds))
        semaphore = asyncio.Semaphore(4)

        async def _bounded_clip(i: int, sc: Dict) -> Optional[bytes]:
            async with semaphore:
                logger.info(f"[StoryWorker] Clip {i+1}/{len(scenes)}: {sc.get('title','')}")
                return await _generate_clip(
                    adapter,
                    sc.get("video_prompt", sc.get("narration", prompt)),
                    story_video_model,
                    clip_dur,
                )

        clips: List[Optional[bytes]] = list(
            await asyncio.gather(*[_bounded_clip(i, sc) for i, sc in enumerate(scenes)])
        )

        valid_pairs = [(clips[i], scenes[i]) for i in range(len(clips)) if clips[i]]
        if not valid_pairs:
            raise RuntimeError("All clip generations failed- no material to stitch")

        valid_clips = [p[0] for p in valid_pairs]
        valid_scenes = [p[1] for p in valid_pairs]
        logger.info(f"[StoryWorker] {len(valid_clips)}/{len(clips)} clips OK")

        # ── 4. TTS narration ───────────────────────────────────────────────
        narrations: List[Optional[bytes]] = []
        for i, sc in enumerate(valid_scenes):
            text = sc.get("narration", "")
            logger.info(f"[StoryWorker] TTS {i+1}/{len(valid_scenes)}")
            narrations.append(await _generate_narration(text, story_voice, cfg))

        # ── 5. Background music ────────────────────────────────────────────
        music_bytes: Optional[bytes] = None
        if generate_audio:
            import httpx

            music_prompt = (
                audio_prompt or "cinematic background music, emotional storytelling, orchestral, subtle"
            )
            total_dur = min(len(valid_clips) * clip_dur + 10, 300)  # up to 5 min music
            logger.info(f"[StoryWorker] Generating music ({total_dur}s)…")
            try:
                mres = await adapter.text_to_audio(
                    music_prompt,
                    duration_seconds=total_dur,
                    audio_type="music",
                )
                if mres.success and mres.media_url:
                    async with httpx.AsyncClient(timeout=120.0) as client:
                        r = await client.get(mres.media_url)
                        r.raise_for_status()
                        music_bytes = r.content
                    logger.info("[StoryWorker] Music ✓")
            except Exception as e:
                logger.warning(f"[StoryWorker] Music failed (non-fatal): {e}")

        # ── 6. FFmpeg stitch ───────────────────────────────────────────────
        logger.info(f"[StoryWorker] Stitching {len(valid_clips)} clips…")
        final_bytes = await _stitch_story(valid_clips, narrations, music_bytes, clip_duration=clip_dur)
        logger.info(f"[StoryWorker] Stitch done: {len(final_bytes)//1024} KB")

        # ── 7. Upload ──────────────────────────────────────────────────────
        from app.services.storage import StorageService

        storage = StorageService()
        media_url = await storage.upload_video(
            final_bytes, project_id, filename=f"story_{uuid.uuid4()}.mp4"
        )
        logger.info(f"[StoryWorker] Uploaded: {media_url}")

        scene_meta = json.dumps(
            {
                "scenes": [
                    {"title": s.get("title", ""), "narration": s.get("narration", "")}
                    for s in valid_scenes
                ],
                "scene_count": len(valid_scenes),
                "voice": story_voice,
                "video_model": story_video_model,
            }
        )
        return {
            "media_url": media_url,
            "enhanced_prompt": scene_meta,
            "model_name": f"{adapter.name}/{story_video_model}",
        }

    try:
        scene = db.query(Scene).filter(Scene.id == uuid.UUID(scene_id)).first()
        if not scene:
            raise RuntimeError(f"Scene {scene_id} not found")
        scene.status = "enhancing"
        db.commit()

        res = _run_async(async_pipeline())

        plans_config = get_plans_config()
        costs = plans_config.get("generation_costs", {}) if plans_config else {}
        cost = Decimal(str(costs.get(tier, 0.10)))

        scene.output_video_url = res["media_url"]
        scene.enhanced_prompt = res["enhanced_prompt"]
        scene.model_used = res["model_name"]
        scene.provider_used = res["model_name"]
        scene.task_type = task_type
        scene.cost = cost
        scene.status = "completed"
        scene.completed_at = datetime.utcnow()

        if settings.enforce_credit_balance:

            async def _finalize():
                from app.db.session import get_async_session_factory
                from app.services.billing_quota import compute_credit_cost, finalize_deduction

                async_sf = get_async_session_factory()
                async with async_sf() as async_db:
                    async with async_db.begin():
                        await finalize_deduction(
                            async_db,
                            user_id,
                            compute_credit_cost(cost),
                            scene_id,
                            reason="story_generation",
                        )

            try:
                _run_async(_finalize())
            except Exception as e:
                logger.warning(f"[StoryWorker] Credit finalization (non-fatal): {e}")

        db.add(
            Draft(
                scene_id=uuid.UUID(scene_id),
                version=1,
                video_url=res["media_url"],
                is_final=True,
            )
        )

        project = db.query(Project).filter(Project.id == uuid.UUID(project_id)).first()
        if project:
            project.output_video_url = res["media_url"]
            project.status = "completed"

        db.add(
            UsageLog(
                user_id=uuid.UUID(user_id),
                action="generation",
                model_used=res["model_name"],
                provider_used=res["model_name"],
                task_type=task_type,
                tier=tier,
                cost=cost,
            )
        )
        db.commit()

        if settings.enforce_credit_balance:

            async def _cb():
                from app.services.circuit_breaker import record_success

                await record_success(user_id)

            try:
                _run_async(_cb())
            except Exception:
                pass

        logger.info(f"[StoryWorker] ✅ completed: {scene_id}")
        return {"success": True, "scene_id": scene_id, "media_url": res["media_url"]}

    except Exception as exc:
        logger.error(f"[StoryWorker] ❌ failed: {exc}\n{traceback.format_exc()[:800]}")
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

            async def _release():
                from app.db.session import get_async_session_factory
                from app.services.billing_quota import compute_credit_cost, release_reservation
                from app.services.circuit_breaker import record_failure

                plans_cfg = get_plans_config() or {}
                cost_val = Decimal(str((plans_cfg.get("generation_costs") or {}).get(tier, 0.10)))
                async_sf = get_async_session_factory()
                async with async_sf() as async_db:
                    async with async_db.begin():
                        await release_reservation(
                            async_db, user_id, compute_credit_cost(cost_val), scene_id
                        )
                await record_failure(user_id)

            try:
                _run_async(_release())
            except Exception as e:
                logger.warning(f"[StoryWorker] Credit release (non-fatal): {e}")

        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()
