"""
FastAPI Main Application Entry Point.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.session import init_db
from app.api.routes import auth, projects, generation, health, models


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
)

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://frontend:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routes ──
app.include_router(health.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(generation.router, prefix="/api/v1")
app.include_router(models.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "version": "1.0.0",
        "docs": "/docs",
    }
