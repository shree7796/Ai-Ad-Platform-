"""
FastAPI Main Application Entry Point.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app.config import get_settings
from app.db.session import init_db
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.security.limiter import limiter
from app.api.routes import admin, auth, projects, generation, health, models, usage, billing, upload

logger = logging.getLogger(__name__)
settings = get_settings()


def _validate_production_secrets() -> None:
    if not settings.is_production:
        return
    weak_jwt = {
        "",
        "change-me",
        "change-me-jwt",
        "secret",
        "jwt-secret",
        "your-secret-key",
    }
    secret = (settings.jwt_secret or "").strip()
    if secret.lower() in weak_jwt or len(secret) < 32:
        logger.error(
            "JWT_SECRET is missing, too short, or uses a default value. "
            "Set a strong random secret (32+ characters) before accepting production traffic."
        )
    sk = (settings.secret_key or "").strip()
    if sk.lower() in {"change-me", "secret", ""} or (sk and len(sk) < 16):
        logger.warning(
            "SECRET_KEY should be set to a long random value in production "
            "(used for signing; keep out of version control)."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown lifecycle."""
    _validate_production_secrets()
    await init_db()
    yield


_expose_docs = settings.debug and not settings.is_production

app = FastAPI(
    title=settings.app_name,
    description="AI-powered marketing video generation platform",
    version="1.0.0",
    docs_url="/docs" if _expose_docs else None,
    redoc_url="/redoc" if _expose_docs else None,
    openapi_url="/openapi.json" if _expose_docs else None,
    lifespan=lifespan,
    redirect_slashes=False,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Middleware order: first registered = innermost. Last = outermost (runs first on request).
app.add_middleware(
    SecurityHeadersMiddleware,
    enable_hsts=settings.is_production,
)
if settings.trusted_hosts_list:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts_list)

_cors_kwargs: dict = dict(
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
)
if settings.debug and not settings.is_production:
    _cors_kwargs["allow_origin_regex"] = r"^http://[\w\.\-]+:(3000|3001)$"

app.add_middleware(CORSMiddleware, **_cors_kwargs)
app.add_middleware(SlowAPIMiddleware)

# ── Register Routes ──
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(generation.router, prefix="/api/v1")
app.include_router(models.router, prefix="/api/v1")
app.include_router(usage.router, prefix="/api/v1")
app.include_router(billing.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")


@app.get("/")
async def root():
    payload = {
        "service": settings.app_name,
        "version": "1.0.0",
    }
    if _expose_docs:
        payload["docs"] = "/docs"
    return payload
