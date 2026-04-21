"""
FastAPI Main Application Entry Point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.session import init_db
from app.api.routes import admin, auth, projects, generation, health, models, usage, billing, upload


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup & shutdown lifecycle."""
    # Startup: create tables if they don't exist
    await init_db()
    yield
    # Shutdown: cleanup if needed


app = FastAPI(
    title=settings.app_name,
    description="AI-powered marketing video generation platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    # POST + multipart breaks when clients get 307 redirect (slash mismatch); match paths exactly instead.
    redirect_slashes=False,
)

# CORS — allow frontend (strict list + dev regex for machine hostname / LAN IP on :3000)
_cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://[::1]:3000",
    "http://frontend:3000",
]
_cors_kwargs = dict(
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
if settings.debug:
    # Browser Origin like http://bhavin-Inspiron-5502:3000 or http://192.168.x.x:3000 is otherwise blocked.
    _cors_kwargs["allow_origin_regex"] = r"^http://[\w\.\-]+:(3000|3001)$"
app.add_middleware(CORSMiddleware, **_cors_kwargs)

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
    return {
        "service": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
    }
