"""
Auth API Routes- Register, Login, Google OAuth, Profile.
"""

import re
import secrets
import urllib.parse
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from starlette.responses import Response, RedirectResponse
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
from app.services.email_service import send_verification_email

router = APIRouter(prefix="/auth", tags=["Authentication"])

_USER_LOAD = (
    noload(User.projects),
    noload(User.usage_logs),
    noload(User.subscription),
)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("8/minute")
async def register(
    request: Request,
    payload: UserRegister,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
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

    # Generate email verification token
    verify_token = secrets.token_urlsafe(32)
    verify_expires = datetime.utcnow() + timedelta(hours=24)

    user = User(
        email=email_key,
        username=payload.username,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        plan="free",
        is_admin=is_admin,
        credit_balance=settings.new_user_credit_grant,
        reserved_balance=0,
        # email verified immediately when verification is disabled
        email_verified=not settings.email_verification_required,
        email_verify_token=verify_token if settings.email_verification_required else None,
        email_verify_expires_at=verify_expires if settings.email_verification_required else None,
    )
    db.add(user)
    await db.flush()

    subscription = Subscription(user_id=user.id, plan="free")
    db.add(subscription)
    await db.commit()

    # Send verification email (non-blocking — failure doesn't break registration)
    if settings.email_verification_required:
        verify_url = (
            f"{settings.public_app_url.rstrip('/')}/auth/verify-email"
            f"?token={urllib.parse.quote(verify_token)}"
        )
        send_verification_email(
            to_email=email_key,
            username=payload.username,
            verify_url=verify_url,
            from_address=settings.email_from_address,
            from_name=settings.email_from_name,
            sendgrid_api_key=settings.sendgrid_api_key,
        )

    token = create_access_token(str(user.id))

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
async def login(
    request: Request,
    payload: UserLogin,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
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


# ── Google OAuth ──────────────────────────────────────────────────────────────

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def _slugify_username(raw: str) -> str:
    """Turn an email prefix into a valid username (alphanum + underscore, max 30)."""
    base = re.sub(r"[^a-z0-9]", "_", raw.lower())[:24].strip("_") or "user"
    return base


@router.get("/google")
async def google_login(request: Request):
    """Redirect the browser to Google's OAuth consent screen."""
    settings = get_settings()
    if not settings.google_client_id:
        raise HTTPException(status_code=501, detail="Google OAuth not configured. Set GOOGLE_CLIENT_ID.")

    state = secrets.token_urlsafe(16)
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    url = _GOOGLE_AUTH_URL + "?" + urllib.parse.urlencode(params)
    return RedirectResponse(url, status_code=302)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str = "",
    error: str = "",
    db: AsyncSession = Depends(get_db),
):
    """Handle Google OAuth callback: exchange code, find/create user, issue JWT."""
    settings = get_settings()
    frontend_url = settings.public_app_url.rstrip("/")

    if error or not code:
        return RedirectResponse(f"{frontend_url}/login?error=google_denied", status_code=302)

    if not settings.google_client_id or not settings.google_client_secret:
        return RedirectResponse(f"{frontend_url}/login?error=not_configured", status_code=302)

    # Exchange auth code for tokens
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_resp = await client.post(
                _GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": settings.google_redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            token_resp.raise_for_status()
            tokens = token_resp.json()

            # Fetch user profile
            info_resp = await client.get(
                _GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            info_resp.raise_for_status()
            info = info_resp.json()
    except Exception:
        return RedirectResponse(f"{frontend_url}/login?error=google_failed", status_code=302)

    email = (info.get("email") or "").strip().lower()
    if not email:
        return RedirectResponse(f"{frontend_url}/login?error=no_email", status_code=302)

    # Find existing user by email
    result = await db.execute(
        select(User).options(*_USER_LOAD).where(func.lower(User.email) == email)
    )
    user = result.scalar_one_or_none()

    if user is None:
        # Create new user from Google profile
        base_username = _slugify_username(email.split("@")[0])
        username = base_username
        suffix = 1
        while True:
            existing = await db.execute(
                select(User).where(func.lower(User.username) == username)
            )
            if not existing.scalar_one_or_none():
                break
            username = f"{base_username}_{suffix}"
            suffix += 1

        user = User(
            email=email,
            username=username,
            password_hash=hash_password(secrets.token_hex(32)),  # unusable random hash
            full_name=info.get("name") or info.get("given_name") or username,
            plan="free",
            is_admin=email in settings.admin_email_set,
            credit_balance=settings.new_user_credit_grant,
            reserved_balance=0,
            email_verified=True,  # Google already verified this email
        )
        db.add(user)
        await db.flush()
        db.add(Subscription(user_id=user.id, plan="free"))
        await db.flush()

    if not user.is_active:
        return RedirectResponse(f"{frontend_url}/login?error=deactivated", status_code=302)

    token = create_access_token(str(user.id))
    await db.commit()

    # Redirect frontend to /auth/callback with the JWT
    return RedirectResponse(
        f"{frontend_url}/auth/callback?token={urllib.parse.quote(token)}",
        status_code=302,
    )


# ── Email Verification ────────────────────────────────────────────────────────

@router.get("/verify-email")
@limiter.limit("10/minute")
async def verify_email(
    request: Request,
    token: str = "",
    db: AsyncSession = Depends(get_db),
):
    """Verify the user's email using the token sent to them on registration."""
    if not token:
        raise HTTPException(status_code=400, detail="Verification token is required")

    result = await db.execute(
        select(User).options(*_USER_LOAD).where(User.email_verify_token == token)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")

    if user.email_verify_expires_at and user.email_verify_expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=400,
            detail="Verification link has expired. Please request a new one.",
        )

    user.email_verified = True
    user.email_verify_token = None
    user.email_verify_expires_at = None
    await db.commit()

    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
@limiter.limit("3/minute")
async def resend_verification(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Re-send the email verification link to the current user."""
    settings = get_settings()

    if current_user.email_verified:
        return {"message": "Email is already verified"}

    verify_token = secrets.token_urlsafe(32)
    verify_expires = datetime.utcnow() + timedelta(hours=24)

    current_user.email_verify_token = verify_token
    current_user.email_verify_expires_at = verify_expires
    await db.commit()

    verify_url = (
        f"{settings.public_app_url.rstrip('/')}/auth/verify-email"
        f"?token={urllib.parse.quote(verify_token)}"
    )
    send_verification_email(
        to_email=current_user.email,
        username=current_user.username,
        verify_url=verify_url,
        from_address=settings.email_from_address,
        from_name=settings.email_from_name,
        sendgrid_api_key=settings.sendgrid_api_key,
    )

    return {"message": "Verification email sent"}
