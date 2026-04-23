"""Rate limiting (SlowAPI) — per-IP keys, proxy-aware when enabled."""

from __future__ import annotations

from functools import lru_cache

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def _make_key_func(trust_proxy: bool):
    def client_ip(request: Request) -> str:
        if trust_proxy:
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                return forwarded.split(",")[0].strip()[:45]
            real_ip = request.headers.get("X-Real-IP")
            if real_ip:
                return real_ip.strip()[:45]
        return get_remote_address(request)

    return client_ip


def build_limiter(*, trust_proxy_headers: bool, enabled: bool) -> Limiter:
    return Limiter(
        key_func=_make_key_func(trust_proxy_headers),
        default_limits=["400/minute"] if enabled else [],
        enabled=enabled,
        headers_enabled=True,
    )


@lru_cache
def get_limiter() -> Limiter:
    from app.config import get_settings

    s = get_settings()
    return build_limiter(trust_proxy_headers=s.trust_proxy_headers, enabled=s.rate_limit_enabled)


# Shared instance for route decorators (initialized from env on first import).
limiter = get_limiter()
