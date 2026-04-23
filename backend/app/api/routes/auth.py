"""
Auth API Routes — Register, Login, Profile.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import noload

from app.db.session import get_db
from app.models.user import User
from app.models.subscription import Subscription
from app.schemas.user import UserRegister, UserLogin, UserResponse, TokenResponse, UserProfileUpdate
from app.api.deps import hash_password, verify_password, create_access_token, get_current_user
from app.config import get_settings
from app.security.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])

_USER_LOAD = (
    noload(User.projects),
    noload(User.usage_logs),
    noload(User.subscription),
)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("8/minute")
async def register(request: Request, payload: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new user account."""
    settings = get_settings()
    email_key = str(payload.email).strip().lower()

    result = await db.execute(
        select(User)
        .options(*_USER_LOAD)
        .where(func.lower(User.email) == email_key)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    result = await db.execute(
        select(User).options(*_USER_LOAD).where(User.username == payload.username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )

    is_admin = email_key in settings.admin_email_set

    user = User(
        email=email_key,
        username=payload.username,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        plan="free",
        is_admin=is_admin,
        credit_balance=settings.new_user_credit_grant,
        reserved_balance=0,
    )
    db.add(user)
    await db.flush()

    subscription = Subscription(user_id=user.id, plan="free")
    db.add(subscription)
    await db.flush()

    token = create_access_token(str(user.id))

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
async def login(request: Request, payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """Authenticate and receive a JWT token."""
    identifier = str(payload.email).strip().lower()
    result = await db.execute(
        select(User)
        .options(*_USER_LOAD)
        .where(func.lower(User.email) == identifier)
    )
    user = result.scalar_one_or_none()
    if user is None:
        result = await db.execute(
            select(User)
            .options(*_USER_LOAD)
            .where(func.lower(User.username) == identifier)
        )
        user = result.scalar_one_or_none()

    if (
        not user
        or not user.password_hash
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    token = create_access_token(str(user.id))

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current authenticated user profile."""
    base = UserResponse.model_validate(current_user)
    sub_r = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    sub = sub_r.scalar_one_or_none()
    exp = sub.expires_at if sub else None
    return base.model_copy(update={"plan_expires_at": exp})


@router.patch("/me", response_model=UserResponse)
async def update_me(
    payload: UserProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update profile fields for the current user."""
    if payload.full_name is not None:
        stripped = payload.full_name.strip()
        current_user.full_name = stripped or None
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)
