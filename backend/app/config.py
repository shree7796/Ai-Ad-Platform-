"""
AI Ad Generation Platform - Configuration
Loads settings from environment variables and YAML config files.
"""

import os
from pathlib import Path
from functools import lru_cache
from typing import Optional, Set

import yaml
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── App ──
    app_name: str = "AI Ad Generator"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change-me"
    # Comma-separated Host headers allowed (e.g. "api.example.com,localhost"). Empty = disable TrustedHostMiddleware.
    trusted_hosts: str = ""
    # When True, rate limiting uses X-Forwarded-For / X-Real-IP (set behind nginx, Traefik, etc.).
    trust_proxy_headers: bool = False
    # Extra CORS origins (comma-separated), merged with built-in dev origins. Include your production site URL.
    cors_extra_origins: str = ""
    # Global API rate limit (SlowAPI). Disable only for special debugging.
    rate_limit_enabled: bool = True
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # ── Database ──
    database_url_override: Optional[str] = Field(default=None, validation_alias="DATABASE_URL")
    postgres_user: str = "adgen"
    postgres_password: str = "adgen_secret"
    postgres_db: str = "adgen_db"
    postgres_host: str = "localhost"
    postgres_port: int = 5432

    @property
    def database_url(self) -> str:
        if self.database_url_override:
            u = self.database_url_override.strip()
            if u.startswith("postgresql://") and "+asyncpg" not in u:
                return u.replace("postgresql://", "postgresql+asyncpg://", 1)
            return u
        return (
            f"postgresql+asyncpg://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
        )

    @property
    def database_url_sync(self) -> str:
        if self.database_url_override:
            return self.database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
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

    # ── Stripe ──
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    stripe_price_basic: Optional[str] = None
    stripe_price_pro: Optional[str] = None
    stripe_price_premium: Optional[str] = None
    public_app_url: str = "http://localhost:3000"
    require_paid_plan: bool = False

    # ── RBAC ──
    # Comma-separated list of emails that are automatically granted admin on registration.
    # Example: ADMIN_EMAILS="alice@example.com,bob@example.com"
    admin_emails: str = ""

    @property
    def admin_email_set(self) -> Set[str]:
        """Return the set of trusted admin emails (lowercased, stripped)."""
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}

    @property
    def is_production(self) -> bool:
        return str(self.app_env).lower() in ("production", "prod")

    @property
    def trusted_hosts_list(self) -> list[str]:
        return [h.strip() for h in self.trusted_hosts.split(",") if h.strip()]

    @property
    def cors_allow_origins(self) -> list[str]:
        """Origins allowed for browser CORS (deduped, stable order)."""
        base = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://[::1]:3000",
            "http://frontend:3000",
        ]
        extra = [o.strip().rstrip("/") for o in self.cors_extra_origins.split(",") if o.strip()]
        pub = self.public_app_url.strip().rstrip("/")
        merged = [*base, *extra]
        if pub and pub not in merged:
            merged.append(pub)
        seen: set[str] = set()
        out: list[str] = []
        for o in merged:
            if o not in seen:
                seen.add(o)
                out.append(o)
        return out

    # ── Google OAuth ──
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    # Redirect URI registered in Google Cloud Console
    # Dev:  http://localhost:8000/api/v1/auth/google/callback
    # Prod: https://api.yourdomain.com/api/v1/auth/google/callback
    google_redirect_uri: str = "http://localhost:8000/api/v1/auth/google/callback"

    # ── Credits ──
    # Set to True to enforce the credit-balance gate on generation.
    # Keep False during the migration rollout so existing quota-based users
    # are not blocked before their accounts are credited.
    enforce_credit_balance: bool = False

    # Credits awarded to new users on registration (top-up separately for existing users).
    new_user_credit_grant: int = 0


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


@lru_cache()
def get_credits_config() -> dict:
    return load_yaml_config("credits.yaml")
