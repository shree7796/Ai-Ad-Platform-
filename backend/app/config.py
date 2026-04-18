"""
AI Ad Generation Platform - Configuration
Loads settings from environment variables and YAML config files.
"""

import os
from pathlib import Path
from functools import lru_cache
from typing import Optional

import yaml
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/config.py → backend dir; parent → monorepo root (when not in Docker /app-only layout)
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_REPO_ROOT = _BACKEND_DIR.parent


def _dotenv_paths() -> tuple[str, ...]:
    """Prefer repo-root `.env` so `uvicorn` from `backend/` still sees Stripe keys next to docker-compose."""
    paths: list[str] = []
    repo_env = _REPO_ROOT / ".env"
    backend_env = _BACKEND_DIR / ".env"
    if repo_env.is_file():
        paths.append(str(repo_env))
    if backend_env.is_file():
        paths.append(str(backend_env))
    return tuple(paths)


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ── App ──
    app_name: str = "AI Ad Generator"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change-me"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # ── Database ──
    postgres_user: str = "adgen"
    postgres_password: str = "adgen_secret"
    postgres_db: str = "adgen_db"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    # ── Redis ──
    redis_host: str = "localhost"
    redis_port: int = 6379
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    # ── Object Storage ──
    storage_endpoint: str = "http://localhost:9000"
    storage_access_key: str = "minioadmin"
    storage_secret_key: str = "minioadmin"
    storage_bucket: str = "adgen-media"
    storage_region: str = "us-east-1"
    storage_public_url: str = "http://localhost:9000"

    # ── JWT ──
    jwt_secret: str = "change-me-jwt"
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 1440

    # ── LLM ──
    llm_provider: str = "openai"
    llm_model: str = "gpt-4o"
    openai_api_key: Optional[str] = None

    # ── Video Model ──
    video_model_provider: str = "mock"

    # ── Pika ──
    pika_api_key: Optional[str] = None
    pika_api_url: str = "https://api.pika.art/v1"

    # ── Runway ──
    runway_api_key: Optional[str] = None
    runway_api_url: str = "https://api.runwayml.com/v1"

    # ── FFmpeg ──
    ffmpeg_path: str = "/usr/bin/ffmpeg"

    # ── Fal.ai ──
    fal_key: Optional[str] = None

    # ── Billing (Stripe) ──
    public_app_url: str = "http://localhost:3000"
    require_paid_plan: bool = False
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    stripe_price_basic: Optional[str] = None
    stripe_price_pro: Optional[str] = None
    stripe_price_premium: Optional[str] = None

    model_config = SettingsConfigDict(
        env_file=_dotenv_paths() or None,
        env_file_encoding="utf-8",
        extra="ignore",
    )


def load_yaml_config(filename: str) -> dict:
    """Load a YAML config file from the config directory."""
    config_dir = Path(__file__).parent.parent / "config"
    config_path = config_dir / filename
    if not config_path.exists():
        # Also check parent directory (for Docker mounts)
        config_path = Path("/app/config") / filename
    if not config_path.exists():
        return {}
    with open(config_path, "r") as f:
        data = yaml.safe_load(f)
    # Resolve environment variable placeholders
    return _resolve_env_vars(data)


def _resolve_env_vars(obj):
    """Recursively resolve ${VAR} placeholders in config values."""
    if isinstance(obj, str):
        import re
        pattern = r"\$\{(\w+)\}"
        def replacer(match):
            return os.environ.get(match.group(1), "")
        return re.sub(pattern, replacer, obj)
    elif isinstance(obj, dict):
        return {k: _resolve_env_vars(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_resolve_env_vars(item) for item in obj]
    return obj


@lru_cache()
def get_settings() -> Settings:
    return Settings()


@lru_cache()
def get_models_config() -> dict:
    return load_yaml_config("models.yaml")


@lru_cache()
def get_plans_config() -> dict:
    return load_yaml_config("plans.yaml")
