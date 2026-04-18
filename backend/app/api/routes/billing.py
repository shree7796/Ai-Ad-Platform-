"""
Billing API Routes — Plan info, Stripe checkout, webhook.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional
import logging

from app.db.session import get_db
from app.models.user import User
from app.models.subscription import Subscription
from app.api.deps import get_current_user
from app.config import get_settings, get_plans_config

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["Billing"])
settings = get_settings()


class PlanInfo(BaseModel):
    plan_key: str
    display_name: str
    price_monthly: float
    features: dict


class CurrentPlanResponse(BaseModel):
    current_plan: str
    subscription_active: bool
    plans: list[PlanInfo]


@router.get("/plans", response_model=CurrentPlanResponse)
async def get_plans(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return available plans and the user's current plan."""
    plans_config = get_plans_config() or {}
    raw_plans = plans_config.get("plans", {})

    plan_list = [
        PlanInfo(
            plan_key=key,
            display_name=val.get("display_name", key.title()),
            price_monthly=float(val.get("price_monthly", 0)),
            features=val.get("features", {}),
        )
        for key, val in raw_plans.items()
    ]

    sub_result = await db.execute(
        select(Subscription).where(Subscription.user_id == current_user.id)
    )
    subscription = sub_result.scalar_one_or_none()

    return CurrentPlanResponse(
        current_plan=current_user.plan or "free",
        subscription_active=bool(subscription and subscription.is_active),
        plans=plan_list,
    )


class CheckoutRequest(BaseModel):
    plan: str  # basic | pro | premium
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutResponse(BaseModel):
    checkout_url: str


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    payload: CheckoutRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe checkout session for a plan upgrade."""
    try:
        import stripe  # type: ignore
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Stripe is not installed. Add 'stripe' to requirements.txt.",
        )

    price_map = {
        "basic": settings.stripe_price_basic if hasattr(settings, "stripe_price_basic") else None,
        "pro": settings.stripe_price_pro if hasattr(settings, "stripe_price_pro") else None,
        "premium": settings.stripe_price_premium if hasattr(settings, "stripe_price_premium") else None,
    }
    price_id = price_map.get(payload.plan)
    if not price_id:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {payload.plan}")

    stripe.api_key = settings.stripe_secret_key if hasattr(settings, "stripe_secret_key") else ""
    if not stripe.api_key:
        raise HTTPException(status_code=501, detail="Stripe secret key not configured.")

    public_url = getattr(settings, "public_app_url", "http://localhost:3000")
    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        customer_email=current_user.email,
        metadata={"user_id": str(current_user.id), "plan": payload.plan},
        success_url=payload.success_url or f"{public_url}/studio?upgrade=success",
        cancel_url=payload.cancel_url or f"{public_url}/studio?upgrade=cancel",
    )
    return CheckoutResponse(checkout_url=session.url)


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Stripe webhook events (subscription updates)."""
    try:
        import stripe  # type: ignore
    except ImportError:
        raise HTTPException(status_code=501, detail="Stripe not installed.")

    payload_bytes = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    webhook_secret = getattr(settings, "stripe_webhook_secret", "")

    try:
        event = stripe.Webhook.construct_event(payload_bytes, sig_header, webhook_secret)
    except Exception as e:
        logger.warning(f"[billing] Webhook verification failed: {e}")
        raise HTTPException(status_code=400, detail="Webhook verification failed")

    event_type = event["type"]
    logger.info(f"[billing] Stripe event: {event_type}")

    if event_type in ("checkout.session.completed", "customer.subscription.updated"):
        data = event["data"]["object"]
        user_id = (data.get("metadata") or {}).get("user_id")
        plan = (data.get("metadata") or {}).get("plan")

        if user_id and plan:
            import uuid as _uuid
            result = await db.execute(select(User).where(User.id == _uuid.UUID(user_id)))
            user = result.scalar_one_or_none()
            if user:
                user.plan = plan
                sub_result = await db.execute(
                    select(Subscription).where(Subscription.user_id == user.id)
                )
                sub = sub_result.scalar_one_or_none()
                if sub:
                    sub.plan = plan
                    sub.is_active = True
                await db.commit()
                logger.info(f"[billing] Updated user {user_id} to plan '{plan}'")

    elif event_type in ("customer.subscription.deleted", "customer.subscription.paused"):
        data = event["data"]["object"]
        user_id = (data.get("metadata") or {}).get("user_id")
        if user_id:
            import uuid as _uuid
            result = await db.execute(select(User).where(User.id == _uuid.UUID(user_id)))
            user = result.scalar_one_or_none()
            if user:
                user.plan = "free"
                sub_result = await db.execute(
                    select(Subscription).where(Subscription.user_id == user.id)
                )
                sub = sub_result.scalar_one_or_none()
                if sub:
                    sub.plan = "free"
                    sub.is_active = False
                await db.commit()
                logger.info(f"[billing] Downgraded user {user_id} to free")

    return {"received": True}
