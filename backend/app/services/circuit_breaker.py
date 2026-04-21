"""
Generation circuit breaker — Redis-backed.

Policy (from credits.yaml):
  • Track consecutive failures per user in a rolling 15-minute window.
  • After 3 failures, impose a 30-minute generation cooldown.
  • On cooldown: generation endpoint returns HTTP 429.
  • Success resets the failure counter.
"""

from __future__ import annotations

import logging
from typing import Optional

import redis.asyncio as aioredis
from fastapi import HTTPException, status

from app.config import get_credits_config, get_settings

logger = logging.getLogger(__name__)

_redis_client: Optional[aioredis.Redis] = None


def _get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        settings = get_settings()
        _redis_client = aioredis.from_url(
            settings.celery_broker_url, decode_responses=True
        )
    return _redis_client


def _cfg() -> dict:
    cfg = get_credits_config() or {}
    return cfg.get("circuit_breaker") or {}


def _keys(user_id: str) -> tuple[str, str]:
    return f"gen:fail:{user_id}", f"gen:cooldown:{user_id}"


async def assert_not_in_cooldown(user_id: str) -> None:
    """
    Raise HTTP 429 if the user is currently in a generation cooldown.
    Call this in the generation endpoint BEFORE creating a scene or reserving credits.
    """
    cfg = _cfg()
    cooldown_minutes = int(cfg.get("cooldown_minutes", 30))

    try:
        r = _get_redis()
        _, cooldown_key = _keys(str(user_id))
        ttl = await r.ttl(cooldown_key)
        if ttl > 0:
            minutes_left = (ttl + 59) // 60
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=(
                    f"Generation temporarily paused due to repeated failures. "
                    f"Try again in {minutes_left} minute(s). "
                    "If the issue persists, contact support."
                ),
            )
    except HTTPException:
        raise
    except Exception as exc:
        # Redis unavailable — fail open (do not block user)
        logger.warning("[circuit_breaker] Redis check failed (fail-open): %s", exc)


async def record_failure(user_id: str) -> None:
    """
    Increment the failure counter for a user.
    If the threshold is reached, set the cooldown key.
    """
    cfg = _cfg()
    window_seconds = int(cfg.get("failure_window_minutes", 15)) * 60
    threshold = int(cfg.get("failure_threshold", 3))
    cooldown_seconds = int(cfg.get("cooldown_minutes", 30)) * 60

    try:
        r = _get_redis()
        fail_key, cooldown_key = _keys(str(user_id))
        count = await r.incr(fail_key)
        if count == 1:
            await r.expire(fail_key, window_seconds)
        if count >= threshold:
            await r.set(cooldown_key, "1", ex=cooldown_seconds)
            await r.delete(fail_key)
            logger.warning(
                "[circuit_breaker] User %s hit %d failures — %d-minute cooldown activated",
                user_id, count, cooldown_seconds // 60,
            )
    except Exception as exc:
        logger.warning("[circuit_breaker] record_failure Redis error: %s", exc)


async def record_success(user_id: str) -> None:
    """Reset the failure counter on a successful generation."""
    try:
        r = _get_redis()
        fail_key, _ = _keys(str(user_id))
        await r.delete(fail_key)
    except Exception as exc:
        logger.warning("[circuit_breaker] record_success Redis error: %s", exc)
