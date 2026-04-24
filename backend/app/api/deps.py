"""
API Dependencies- Auth, DB session, plan enforcement.
"""

from datetime import datetime, timedelta
from typing import Optional
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import noload

from app.config import get_settings, get_plans_config
from app.db.session import get_db
from app.models.user import User

settings = get_settings()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Password Hashing ──

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT Token ──

def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = {"sub": user_id}
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.jwt_expiration_minutes)
    )
    to_encode["exp"] = expire
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        return payload.get("sub")
    except JWTError:
        return None


# ── Current User Dependency ──

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and validate the current user from JWT token."""
    token = credentials.credentials
    user_id = decode_access_token(token)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        uid = uuid.UUID(user_id)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    result = await db.execute(
        select(User)
        .options(
            noload(User.projects),
            noload(User.usage_logs),
            noload(User.subscription),
        )
        .where(User.id == uid)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    return user


# ── Plan Enforcement ──

def check_plan_access(user: User, required_tier: str) -> bool:
    """Check if user's plan allows access to a given tier."""
    plans = get_plans_config()
    if not plans or "plans" not in plans:
        return True  # No plan config = allow all

    user_plan = plans["plans"].get(user.plan, {})
    available_tiers = user_plan.get("features", {}).get("available_tiers", ["basic"])
    return required_tier in available_tiers


def enforce_plan_access(user: User, required_tier: str):
    """Raise 403 if user's plan doesn't support the tier."""
    if not check_plan_access(user, required_tier):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your '{user.plan}' plan does not include '{required_tier}' tier. Please upgrade.",
        )
