"""
Stripe Checkout + webhooks — activate paid plans on `users.plan` and `subscriptions`.
"""

import uuid
from datetime import datetime
from typing import Any, Optional

import stripe
from stripe.error import SignatureVerificationError, StripeError
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import get_settings, Settings
from app.db.session import get_db
from app.models.subscription import Subscription
from app.models.user import User
from app.schemas.billing import (
    CheckoutRequest,
    CheckoutResponse,
    SyncCheckoutSessionRequest,
    SyncCheckoutSessionResponse,
)

router = APIRouter(prefix="/billing", tags=["Billing"])

PAYABLE = frozenset({"basic", "pro", "premium"})


async def _apply_subscription(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    plan_key: str,
    stripe_customer_id: Optional[str] = None,
    stripe_subscription_id: Optional[str] = None,
    stripe_price_id: Optional[str] = None,
    is_active: bool = True,
    expires_at: Optional[datetime] = None,
) -> None:
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        return
    user.plan = plan_key[:20]
    if stripe_customer_id:
        user.stripe_customer_id = stripe_customer_id

    sres = await db.execute(select(Subscription).where(Subscription.user_id == user_id))
    sub = sres.scalar_one_or_none()
    if not sub:
        sub = Subscription(user_id=user_id, plan=plan_key[:20])
        db.add(sub)
    sub.plan = plan_key[:20]
    sub.is_active = is_active
    sub.stripe_subscription_id = stripe_subscription_id
    sub.stripe_price_id = stripe_price_id
    sub.expires_at = expires_at
    await db.flush()


def _plan_from_stripe_subscription(sub_obj: dict, settings: Settings) -> Optional[str]:
    meta = sub_obj.get("metadata") or {}
    pk = meta.get("plan_key")
    if pk:
        return str(pk)[:20]
    items = (sub_obj.get("items") or {}).get("data") or []
    if not items:
        return None
    price_id = (items[0].get("price") or {}).get("id")
    rev = {
        settings.stripe_price_basic: "basic",
        settings.stripe_price_pro: "pro",
        settings.stripe_price_premium: "premium",
    }
    return rev.get(price_id)


def _price_for_plan(settings: Settings, plan_key: str) -> Optional[str]:
    return {
        "basic": settings.stripe_price_basic,
        "pro": settings.stripe_price_pro,
        "premium": settings.stripe_price_premium,
    }.get(plan_key)


@router.post("/checkout-session", response_model=CheckoutResponse)
async def create_checkout_session(
    body: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Stripe secret key is missing: set STRIPE_SECRET_KEY in the API environment "
                "(repo root `.env` when using Docker), then restart the API so settings reload."
            ),
        )
    plan_key = body.plan_key.lower()
    if plan_key not in PAYABLE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid plan")
    env_name = {
        "basic": "STRIPE_PRICE_BASIC",
        "pro": "STRIPE_PRICE_PRO",
        "premium": "STRIPE_PRICE_PREMIUM",
    }.get(plan_key, "STRIPE_PRICE_*")
    price_id = _price_for_plan(settings, plan_key)
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                f"No Stripe Price ID for plan '{plan_key}'. Set {env_name}=price_... "
                "(recurring monthly price from Stripe Dashboard → Product catalog) and recreate the API container."
            ),
        )
    if price_id.startswith("prod_"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"{env_name} is a Product ID (`prod_...`). Checkout needs a Price ID (`price_...`). "
                "In Stripe: Product catalog → open the product → under Pricing, open the monthly price → copy Price ID."
            ),
        )

    stripe.api_key = settings.stripe_secret_key
    base = settings.public_app_url.rstrip("/")
    # Stripe replaces {CHECKOUT_SESSION_ID}; app uses it to sync plan if webhooks are not delivered (e.g. local dev).
    success_url = f"{base}/studio/billing?checkout=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{base}/studio/billing?checkout=cancel"

    params: dict = {
        "mode": "subscription",
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": success_url,
        "cancel_url": cancel_url,
        "client_reference_id": str(current_user.id),
        "metadata": {"user_id": str(current_user.id), "plan_key": plan_key},
        "subscription_data": {
            "metadata": {"user_id": str(current_user.id), "plan_key": plan_key},
        },
    }
    if current_user.stripe_customer_id:
        params["customer"] = current_user.stripe_customer_id
    else:
        params["customer_email"] = current_user.email

    try:
        session = stripe.checkout.Session.create(**params)
    except StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=getattr(e, "user_message", None) or str(e),
        ) from e

    if not session.url:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Stripe did not return a checkout URL.",
        )
    return CheckoutResponse(url=session.url)


@router.post("/sync-checkout-session", response_model=SyncCheckoutSessionResponse)
async def sync_checkout_session(
    body: SyncCheckoutSessionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Apply plan from a completed Checkout Session (fallback when webhook is not configured or failed)."""
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured.",
        )
    stripe.api_key = settings.stripe_secret_key
    try:
        sess = stripe.checkout.Session.retrieve(
            body.session_id,
            expand=["subscription"],
        )
    except StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=getattr(e, "user_message", None) or str(e),
        ) from e

    if sess.get("mode") != "subscription":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Checkout session is not a subscription.",
        )
    pay_status = sess.get("payment_status") or ""
    if pay_status not in ("paid", "no_payment_required"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Checkout not complete (payment_status={pay_status}).",
        )

    meta = sess.get("metadata") or {}
    uid = meta.get("user_id") or sess.get("client_reference_id")
    if not uid or str(uid) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This checkout belongs to a different account.",
        )

    plan_key = meta.get("plan_key")
    sub_raw = sess.get("subscription")
    sub_obj: Any = {}
    if isinstance(sub_raw, str):
        try:
            sub_obj = stripe.Subscription.retrieve(sub_raw)
        except StripeError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=getattr(e, "user_message", None) or str(e),
            ) from e
    elif sub_raw is not None:
        # Expanded subscription may be a StripeObject (dict-like), not isinstance(..., dict).
        sub_obj = sub_raw

    if not plan_key and sub_obj:
        sm = sub_obj.get("metadata") or {}
        plan_key = sm.get("plan_key") or _plan_from_stripe_subscription(sub_obj, settings)
    if not plan_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not determine plan from this checkout session.",
        )

    customer_id = sess.get("customer")
    sub_id = sub_obj.get("id") if sub_obj else None
    expires_at = None
    stripe_price_id = None
    if sub_obj:
        cpe = sub_obj.get("current_period_end")
        if cpe:
            expires_at = datetime.utcfromtimestamp(int(cpe))
        items = (sub_obj.get("items") or {}).get("data") or []
        if items:
            stripe_price_id = (items[0].get("price") or {}).get("id")

    await _apply_subscription(
        db,
        user_id=current_user.id,
        plan_key=str(plan_key),
        stripe_customer_id=customer_id if isinstance(customer_id, str) else None,
        stripe_subscription_id=sub_id if isinstance(sub_id, str) else None,
        stripe_price_id=stripe_price_id,
        is_active=True,
        expires_at=expires_at,
    )
    return SyncCheckoutSessionResponse()


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    settings = get_settings()
    if not settings.stripe_webhook_secret or not settings.stripe_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Webhook not configured.",
        )
    stripe.api_key = settings.stripe_secret_key
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    if not sig:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing stripe-signature")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig, settings.stripe_webhook_secret
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payload") from e
    except SignatureVerificationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature") from e

    et = event["type"]
    data = event["data"]["object"]

    try:
        if et == "checkout.session.completed":
            if data.get("mode") != "subscription":
                return {"received": True}
            meta = data.get("metadata") or {}
            # Session metadata is sometimes sparse; fall back to client_reference_id + subscription object.
            uid = meta.get("user_id") or data.get("client_reference_id")
            plan_key = meta.get("plan_key")
            customer_id = data.get("customer")
            sub_id = data.get("subscription")
            sub_full = None
            if sub_id:
                try:
                    sub_full = stripe.Subscription.retrieve(sub_id)
                except StripeError:
                    pass
            if sub_full:
                sm = sub_full.get("metadata") or {}
                uid = uid or sm.get("user_id")
                if not plan_key:
                    plan_key = sm.get("plan_key") or _plan_from_stripe_subscription(
                        sub_full, settings
                    )
                expires_at = datetime.utcfromtimestamp(int(sub_full["current_period_end"]))
                items = (sub_full.get("items") or {}).get("data") or []
                stripe_price_id = (
                    (items[0].get("price") or {}).get("id") if items else None
                )
            else:
                expires_at = None
                stripe_price_id = None

            if not uid or not plan_key:
                return {"received": True}
            try:
                user_uuid = uuid.UUID(str(uid))
            except ValueError:
                return {"received": True}
            await _apply_subscription(
                db,
                user_id=user_uuid,
                plan_key=str(plan_key),
                stripe_customer_id=customer_id,
                stripe_subscription_id=sub_id,
                stripe_price_id=stripe_price_id,
                is_active=True,
                expires_at=expires_at,
            )

        elif et == "customer.subscription.updated":
            meta = data.get("metadata") or {}
            uid = meta.get("user_id")
            if not uid:
                return {"received": True}
            try:
                user_uuid = uuid.UUID(str(uid))
            except ValueError:
                return {"received": True}
            st = data.get("status")
            customer_id = data.get("customer")
            sub_id = data.get("id")
            plan_key = _plan_from_stripe_subscription(data, settings) or meta.get("plan_key") or "free"
            plan_key = str(plan_key)[:20]
            expires_at = None
            if data.get("current_period_end"):
                expires_at = datetime.utcfromtimestamp(int(data["current_period_end"]))
            items = (data.get("items") or {}).get("data") or []
            stripe_price_id = None
            if items:
                stripe_price_id = (items[0].get("price") or {}).get("id")
            sub_id_final = sub_id
            if st in ("canceled", "unpaid", "incomplete_expired"):
                plan_key = "free"
                is_active = False
                sub_id_final = None
                stripe_price_id = None
            else:
                is_active = st in ("active", "trialing", "past_due")
            await _apply_subscription(
                db,
                user_id=user_uuid,
                plan_key=plan_key,
                stripe_customer_id=customer_id,
                stripe_subscription_id=sub_id_final,
                stripe_price_id=stripe_price_id,
                is_active=is_active,
                expires_at=expires_at,
            )

        elif et == "customer.subscription.deleted":
            meta = data.get("metadata") or {}
            uid = meta.get("user_id")
            if not uid:
                return {"received": True}
            try:
                user_uuid = uuid.UUID(str(uid))
            except ValueError:
                return {"received": True}
            customer_id = data.get("customer")
            await _apply_subscription(
                db,
                user_id=user_uuid,
                plan_key="free",
                stripe_customer_id=customer_id,
                stripe_subscription_id=None,
                stripe_price_id=None,
                is_active=False,
                expires_at=None,
            )
    except Exception:
        # Avoid 500 for malformed Stripe payloads; Stripe will retry on true failures if you return 5xx elsewhere.
        return {"received": True}

    return {"received": True}
