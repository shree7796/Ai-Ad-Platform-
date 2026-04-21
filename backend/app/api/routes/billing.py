"""
Billing API Routes — Plan info, Stripe checkout, webhook.
Endpoint contract must match frontend/src/lib/api.ts billingAPI.
"""

from __future__ import annotations

import logging
import uuid as _uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import get_credits_config, get_plans_config, get_settings
from app.db.session import get_db
from app.models.subscription import Subscription
from app.models.user import User
from app.services.billing_quota import get_subscription_credit_grant

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing", tags=["Billing"])


# ── helpers ──────────────────────────────────────────────────────────────────

def _stripe():
    """Import stripe; raise 501 if not installed."""
    try:
        import stripe  # type: ignore
        return stripe
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="stripe package not installed. Add 'stripe' to requirements.txt and rebuild.",
        )


def _price_map(settings):
    return {
        "basic": settings.stripe_price_basic,
        "pro": settings.stripe_price_pro,
        "premium": settings.stripe_price_premium,
    }


async def _apply_plan(
    db: AsyncSession,
    user_id: str,
    plan: str,
    stripe_customer_id: str | None = None,
    grant_credits: bool = False,
) -> None:
    """Update user + subscription row for a paid/downgraded plan.

    When grant_credits=True (triggered on successful payment), add the plan's
    monthly credit grant to the user's credit_balance and record a ledger entry.
    """
    from app.models.credit_transaction import CreditTransaction, TransactionStatus
    import uuid as _uuid_mod
    from datetime import datetime as _dt

    result = await db.execute(select(User).where(User.id == _uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        return

    prev_plan = user.plan
    user.plan = plan
    if stripe_customer_id:
        user.stripe_customer_id = stripe_customer_id

    sub_r = await db.execute(select(Subscription).where(Subscription.user_id == user.id))
    sub = sub_r.scalar_one_or_none()
    if sub:
        sub.plan = plan
        sub.is_active = plan != "free"

    # Grant credits on payment (new subscription or renewal)
    if grant_credits and plan != "free":
        credits = get_subscription_credit_grant(plan)
        if credits > 0:
            user.credit_balance += credits
            db.add(
                CreditTransaction(
                    id=_uuid_mod.uuid4(),
                    user_id=user.id,
                    delta=credits,
                    reason="purchase",
                    status=TransactionStatus.COMPLETED,
                    notes=f"Monthly credit grant for {plan} plan ({credits} ⚡)",
                )
            )
            logger.info("[billing] Granted %d credits to user %s for plan '%s'", credits, user_id, plan)

    await db.commit()
    logger.info("[billing] user %s → plan '%s' (prev: %s)", user_id, plan, prev_plan)


# ── schemas ───────────────────────────────────────────────────────────────────

class PlanFeatures(BaseModel):
    max_generations_per_month: Optional[int] = None
    max_generations_per_day: Optional[int] = None
    max_upload_size_mb: Optional[int] = None
    available_tiers: list[str] = []
    max_video_duration: Optional[int] = None
    watermark: bool = False
    priority: str = "normal"


class PlanInfo(BaseModel):
    plan_key: str
    display_name: str
    price_monthly: float
    features: dict


class BillingStatusResponse(BaseModel):
    current_plan: str
    subscription_active: bool
    stripe_customer_id: Optional[str] = None
    plans: list[PlanInfo]


class CheckoutSessionRequest(BaseModel):
    plan_key: str   # basic | pro | premium


class CheckoutSessionResponse(BaseModel):
    url: str


class SyncCheckoutRequest(BaseModel):
    session_id: str


# ── routes ────────────────────────────────────────────────────────────────────

@router.get("/credit-costs")
async def credit_costs(_: User = Depends(get_current_user)):
    """
    Return the full credit cost table from credits.yaml.
    Frontend uses this to display accurate ⚡ costs on generate buttons.
    """
    cfg = get_credits_config() or {}
    return {
        "model_credit_costs": cfg.get("model_credit_costs") or {},
        "image_credit_costs": cfg.get("image_credit_costs") or {},
        "subscription_credits": cfg.get("subscription_credits") or {},
        "topup_credits": cfg.get("topup_credits") or {},
    }


@router.get("/status", response_model=BillingStatusResponse)
async def billing_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return current plan + all available plans (for the Billing UI)."""
    plans_cfg = get_plans_config() or {}
    raw_plans = plans_cfg.get("plans", {})

    plan_list = [
        PlanInfo(
            plan_key=key,
            display_name=val.get("display_name", key.title()),
            price_monthly=float(val.get("price_monthly", 0)),
            features=val.get("features", {}),
        )
        for key, val in raw_plans.items()
    ]

    sub_r = await db.execute(select(Subscription).where(Subscription.user_id == current_user.id))
    sub = sub_r.scalar_one_or_none()

    return BillingStatusResponse(
        current_plan=current_user.plan or "free",
        subscription_active=bool(sub and sub.is_active),
        stripe_customer_id=getattr(current_user, "stripe_customer_id", None),
        plans=plan_list,
    )


@router.post("/checkout-session", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    payload: CheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a Stripe Checkout Session and return the hosted URL."""
    stripe = _stripe()
    settings = get_settings()

    price_id = _price_map(settings).get(payload.plan_key)
    if not price_id:
        raise HTTPException(
            status_code=400,
            detail=f"No Stripe price configured for plan '{payload.plan_key}'. "
                   f"Set STRIPE_PRICE_{payload.plan_key.upper()} in .env.",
        )
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=501, detail="STRIPE_SECRET_KEY not configured.")

    stripe.api_key = settings.stripe_secret_key
    pub = settings.public_app_url.rstrip("/")

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        customer_email=current_user.email,
        client_reference_id=str(current_user.id),
        metadata={"user_id": str(current_user.id), "plan": payload.plan_key},
        subscription_data={"metadata": {"user_id": str(current_user.id), "plan": payload.plan_key}},
        success_url=f"{pub}/studio/billing?session_id={{CHECKOUT_SESSION_ID}}&upgrade=success",
        cancel_url=f"{pub}/studio/billing?upgrade=cancel",
    )
    return CheckoutSessionResponse(url=session.url)


@router.post("/sync-checkout-session")
async def sync_checkout_session(
    payload: SyncCheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Called by the frontend after Stripe redirects back with ?session_id=...
    Verifies the session server-side and upgrades the user's plan immediately
    (backup path in case the webhook arrives late).
    """
    stripe = _stripe()
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise HTTPException(status_code=501, detail="STRIPE_SECRET_KEY not configured.")

    stripe.api_key = settings.stripe_secret_key
    try:
        session = stripe.checkout.Session.retrieve(payload.session_id, expand=["subscription"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not retrieve checkout session: {e}")

    if session.get("payment_status") not in ("paid", "no_payment_required"):
        raise HTTPException(status_code=402, detail="Payment not completed.")

    uid = (session.get("metadata") or {}).get("user_id") or session.get("client_reference_id")
    plan = (session.get("metadata") or {}).get("plan")
    customer_id = session.get("customer")

    if not uid or not plan:
        raise HTTPException(status_code=400, detail="Session metadata missing user_id/plan.")
    if str(current_user.id) != uid:
        raise HTTPException(status_code=403, detail="Session does not belong to this user.")

    await _apply_plan(db, uid, plan, customer_id, grant_credits=True)
    return {"ok": True, "plan": plan}


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Stripe webhook — handles subscription lifecycle events."""
    stripe = _stripe()
    settings = get_settings()

    payload_bytes = await request.body()
    sig = request.headers.get("stripe-signature", "")
    secret = settings.stripe_webhook_secret or ""

    try:
        event = stripe.Webhook.construct_event(payload_bytes, sig, secret)
    except stripe.error.SignatureVerificationError as e:
        logger.warning(f"[billing/webhook] Bad signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")
    except Exception as e:
        logger.warning(f"[billing/webhook] Parse error: {e}")
        raise HTTPException(status_code=400, detail="Webhook parse error.")

    etype = event["type"]
    obj = event["data"]["object"]
    logger.info(f"[billing/webhook] {etype}")

    meta = obj.get("metadata") or {}
    uid = meta.get("user_id") or obj.get("client_reference_id")
    plan = meta.get("plan")
    customer_id = obj.get("customer")

    if etype == "checkout.session.completed":
        if obj.get("payment_status") in ("paid", "no_payment_required") and uid and plan:
            # First payment: grant the monthly credit allotment immediately
            await _apply_plan(db, uid, plan, customer_id, grant_credits=True)

    elif etype == "invoice.paid":
        # Recurring renewal: grant credits on each successful invoice
        sub_meta = (obj.get("subscription_details") or {}).get("metadata") or {}
        uid = uid or sub_meta.get("user_id")
        plan = plan or sub_meta.get("plan")
        if uid and plan and plan != "free":
            await _apply_plan(db, uid, plan, customer_id, grant_credits=True)

    elif etype == "customer.subscription.updated":
        if uid and plan:
            await _apply_plan(db, uid, plan, customer_id)

    elif etype in ("customer.subscription.deleted", "customer.subscription.paused"):
        if uid:
            await _apply_plan(db, uid, "free", None)

    elif etype == "invoice.payment_failed":
        # Optionally notify / downgrade; for now just log
        logger.warning(f"[billing/webhook] Payment failed for customer {customer_id}")

    return {"received": True}
