"""
Monthly quota: separate image vs video buckets; video consumption in duration-weighted **units**.

Also implements the token-ledger Reserve → Execute → Finalize/Release pipeline with a
50 % platform margin (provider cost × 2.2 dynamic multiplier).

Uses `usage_logs` + `plans.yaml` + `credits.yaml`. Does not import or call Fal adapters.
"""

from __future__ import annotations

import logging
import math
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from typing import TYPE_CHECKING, Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_credits_config, get_plans_config
from app.models.usage_log import UsageLog

if TYPE_CHECKING:
    from app.config import Settings
    from app.models.user import User

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Margin configuration
# ---------------------------------------------------------------------------
# Provider cost × MARGIN_MULTIPLIER = credits charged to user.
# 2.2 ≈ provider cost + 10 % overhead + 50 % gross margin.
MARGIN_MULTIPLIER: Decimal = Decimal("2.2")

VIDEO_TASK_TYPES = frozenset({"text_to_video", "image_to_video", "video_to_video"})

_DEFAULT_IMAGE_VIDEO: dict[str, Tuple[int, int]] = {
    "free": (2, 0),
    "basic": (90, 12),
    "pro": (240, 32),
    "premium": (520, 72),
}


def month_window_utc(reference: Optional[datetime] = None) -> Tuple[datetime, datetime]:
    now = reference or datetime.utcnow()
    start = datetime(now.year, now.month, 1)
    if now.month == 12:
        end = datetime(now.year + 1, 1, 1)
    else:
        end = datetime(now.year, now.month + 1, 1)
    return start, end


def _features_for_plan(plan_key: str) -> dict:
    plans = get_plans_config() or {}
    block = (plans.get("plans") or {}).get(plan_key) or (plans.get("plans") or {}).get("free")
    if block and isinstance(block, dict):
        feat = block.get("features") or {}
        if isinstance(feat, dict):
            return feat
    return {}


def monthly_image_video_quotas_for_plan(plan_key: str) -> Tuple[int, int]:
    plan_key = (plan_key or "free").lower()
    features = _features_for_plan(plan_key)
    img = features.get("max_image_generations_per_month")
    vid = features.get("max_video_generations_per_month")
    if img is not None and vid is not None:
        return max(0, int(img)), max(0, int(vid))
    legacy = features.get("max_generations_per_month")
    if legacy is not None:
        total = max(0, int(legacy))
        video = total // 5
        if total >= 5 and video < 1:
            video = 1
        image = max(0, total - video)
        return image, video
    return _DEFAULT_IMAGE_VIDEO.get(plan_key, _DEFAULT_IMAGE_VIDEO["free"])


def monthly_image_quota_for_plan(plan_key: str) -> int:
    return monthly_image_video_quotas_for_plan(plan_key)[0]


def monthly_video_quota_for_plan(plan_key: str) -> int:
    return monthly_image_video_quotas_for_plan(plan_key)[1]


def monthly_quota_for_plan(plan_key: str) -> int:
    i, v = monthly_image_video_quotas_for_plan(plan_key)
    return i + v


def plan_display_name(plan_key: str) -> str:
    plans = get_plans_config() or {}
    block = (plans.get("plans") or {}).get(plan_key)
    if block and isinstance(block, dict):
        name = block.get("display_name")
        if name:
            return str(name)
    return plan_key.replace("_", " ").title()


def video_billing_unit_seconds() -> int:
    plans = get_plans_config() or {}
    raw = plans.get("video_billing_unit_seconds")
    if raw is not None:
        return max(1, int(raw))
    return 15


def video_units_for_duration(duration_seconds: int) -> int:
    unit = video_billing_unit_seconds()
    d = max(1, int(duration_seconds))
    return max(1, math.ceil(d / unit))


def max_video_duration_for_plan(plan_key: str) -> int:
    plan_key = (plan_key or "free").lower()
    features = _features_for_plan(plan_key)
    raw = features.get("max_video_duration")
    if raw is not None:
        return max(1, int(raw))
    return 15


def is_video_task(task_type: Optional[str]) -> bool:
    if not task_type or not str(task_type).strip():
        return False
    return str(task_type).strip().lower() in VIDEO_TASK_TYPES


async def count_monthly_generations(db: AsyncSession, user_id) -> int:
    period_start, period_end = month_window_utc()
    stmt = select(func.count()).select_from(UsageLog).where(
        and_(
            UsageLog.user_id == user_id,
            UsageLog.action == "generation",
            UsageLog.created_at >= period_start,
            UsageLog.created_at < period_end,
        )
    )
    result = await db.execute(stmt)
    return int(result.scalar_one() or 0)


async def count_monthly_video_generations(db: AsyncSession, user_id) -> int:
    period_start, period_end = month_window_utc()
    tt = tuple(VIDEO_TASK_TYPES)
    stmt = select(func.count()).select_from(UsageLog).where(
        and_(
            UsageLog.user_id == user_id,
            UsageLog.action == "generation",
            UsageLog.created_at >= period_start,
            UsageLog.created_at < period_end,
            UsageLog.task_type.isnot(None),
            UsageLog.task_type.in_(tt),
        )
    )
    result = await db.execute(stmt)
    return int(result.scalar_one() or 0)


async def count_monthly_image_generations(db: AsyncSession, user_id) -> int:
    period_start, period_end = month_window_utc()
    tt = tuple(VIDEO_TASK_TYPES)
    stmt = select(func.count()).select_from(UsageLog).where(
        and_(
            UsageLog.user_id == user_id,
            UsageLog.action == "generation",
            UsageLog.created_at >= period_start,
            UsageLog.created_at < period_end,
            or_(
                UsageLog.task_type.is_(None),
                and_(UsageLog.task_type.isnot(None), ~UsageLog.task_type.in_(tt)),
            ),
        )
    )
    result = await db.execute(stmt)
    return int(result.scalar_one() or 0)


async def sum_monthly_video_billing_units(db: AsyncSession, user_id) -> int:
    period_start, period_end = month_window_utc()
    stmt = select(func.coalesce(func.sum(UsageLog.video_billing_units), 0)).where(
        and_(
            UsageLog.user_id == user_id,
            UsageLog.action == "generation",
            UsageLog.created_at >= period_start,
            UsageLog.created_at < period_end,
        )
    )
    result = await db.execute(stmt)
    return int(result.scalar_one() or 0)


async def enforce_generation_allowed(
    db: AsyncSession,
    user: "User",
    settings: "Settings",
    task_type: str,
    duration_seconds: int = 12,
) -> None:
    plan_key = (user.plan or "free").lower()
    tt = (task_type or "text_to_image").strip().lower()

    if settings.require_paid_plan and plan_key == "free":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscribe to a plan to generate. Visit Billing to choose a subscription.",
        )

    img_quota, vid_quota = monthly_image_video_quotas_for_plan(plan_key)
    if is_video_task(tt):
        if vid_quota <= 0:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Your current plan does not include video generations. Upgrade in Billing.",
            )
        need_units = video_units_for_duration(duration_seconds)
        used_units = await sum_monthly_video_billing_units(db, user.id)
        if used_units + need_units > vid_quota:
            unit = video_billing_unit_seconds()
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    f"Monthly video allowance exceeded: this {duration_seconds}s clip needs {need_units} unit(s) "
                    f"({unit}s each), and only {max(0, vid_quota - used_units)} unit(s) remain. "
                    "Shorten the duration, upgrade your plan, or wait until your quota resets (UTC)."
                ),
            )
    else:
        if img_quota <= 0:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Your current plan has no image generation quota. Upgrade in Billing to continue.",
            )
        used_i = await count_monthly_image_generations(db, user.id)
        if used_i >= img_quota:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    "Monthly image generation limit reached. Upgrade your plan or wait until your quota resets (UTC)."
                ),
            )


def normalize_image_model_key(raw: Optional[str]) -> str:
    """Normalize client image model ids to internal keys (matches credits.yaml / fal hints)."""
    if raw is None or not str(raw).strip():
        return "flux_dev"
    return str(raw).strip().lower().replace("-", "_").replace(".", "_")


def allowed_image_models_for_plan(plan_key: str) -> Optional[frozenset[str]]:
    """
    If the plan defines `allowed_image_models` in plans.yaml features, only those
    normalized keys may be used for text_to_image / image_to_image. None = no restriction.
    """
    plan_key = (plan_key or "free").lower()
    plans = get_plans_config() or {}
    block = (plans.get("plans") or {}).get(plan_key)
    if not block or not isinstance(block, dict):
        return None
    feat = block.get("features") or {}
    if not isinstance(feat, dict):
        return None
    allowed = feat.get("allowed_image_models")
    if not allowed or not isinstance(allowed, (list, tuple)):
        return None
    keys = frozenset(
        str(x).strip().lower().replace("-", "_").replace(".", "_")
        for x in allowed
        if x is not None and str(x).strip()
    )
    return keys if keys else None


def enforce_plan_image_model(plan_key: str, image_model: Optional[str]) -> None:
    allowed = allowed_image_models_for_plan(plan_key)
    if allowed is None:
        return
    key = normalize_image_model_key(image_model)
    if key not in allowed:
        pretty = ", ".join(sorted(s.replace("_", " ").title() for s in allowed))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your plan includes these image models only: {pretty}. Upgrade for full model access.",
        )


# ---------------------------------------------------------------------------
# Credits config helpers
# ---------------------------------------------------------------------------

def _credits_cfg() -> dict:
    return get_credits_config() or {}


def get_model_credit_cost(model_key: Optional[str], task_type: Optional[str] = None) -> int:
    """
    Look up the credit cost for a specific model from credits.yaml.
    Falls back to the 'default' entry or 1 if nothing matches.
    """
    cfg = _credits_cfg()
    key = (model_key or "").strip().lower().replace("-", "_").replace(".", "_")
    if is_video_task(task_type):
        costs = cfg.get("model_credit_costs") or {}
    else:
        costs = cfg.get("image_credit_costs") or {}
    if key and key in costs:
        return max(1, int(costs[key]))
    default_costs = cfg.get("model_credit_costs") if is_video_task(task_type) else cfg.get("image_credit_costs")
    if default_costs:
        fallback = default_costs.get("default")
        if fallback is not None:
            return max(1, int(fallback))
    return 1


def get_subscription_credit_grant(plan_key: str) -> int:
    """Return the number of credits granted when a user subscribes to a plan."""
    cfg = _credits_cfg()
    grants = cfg.get("subscription_credits") or {}
    key = (plan_key or "free").lower()
    value = grants.get(key)
    if value is not None:
        return max(0, int(value))
    # Fallback to plans.yaml credit_grant field
    plans = get_plans_config() or {}
    plan_block = (plans.get("plans") or {}).get(key) or {}
    grant = plan_block.get("credit_grant")
    if grant is not None:
        return max(0, int(grant))
    return 0


# ---------------------------------------------------------------------------
# Token Ledger: Reserve → Execute → Finalize / Release
# ---------------------------------------------------------------------------

def compute_credit_cost(provider_cost_usd: Decimal, multiplier: Decimal = MARGIN_MULTIPLIER) -> int:
    """
    Convert a raw provider cost (in USD) to platform credits using the margin multiplier.

    Credits are integer tokens; we always round *up* so the platform never subsidises
    a generation at a loss.

    Example: provider_cost_usd=0.10, multiplier=2.2  →  ceil(0.22) = 1 credit
    (At a scale where 1 credit ≡ $0.10 platform price this would be 1 credit charged.)
    """
    raw = provider_cost_usd * multiplier
    return max(1, math.ceil(float(raw)))


async def check_velocity_limit(db: AsyncSession, user: "User", amount: int) -> None:
    """
    Block new accounts (<5 days old) that would exceed 1500 credits spent in any 24-hour window.
    Raises HTTP 429 if the limit is exceeded.
    """
    from app.models.credit_transaction import CreditTransaction, TransactionStatus

    cfg = _credits_cfg()
    limits = cfg.get("velocity_limits") or {}
    new_account_days = int(limits.get("new_account_days", 5))
    max_per_24h = int(limits.get("new_account_credits_per_24h", 1500))

    account_age_days = (datetime.utcnow() - user.created_at).days
    if account_age_days >= new_account_days:
        return  # Not a new account; no velocity restriction

    window_start = datetime.utcnow() - timedelta(hours=24)
    result = await db.execute(
        select(func.coalesce(func.sum(func.abs(CreditTransaction.delta)), 0)).where(
            and_(
                CreditTransaction.user_id == user.id,
                CreditTransaction.status == TransactionStatus.COMPLETED,
                CreditTransaction.created_at >= window_start,
                CreditTransaction.delta < 0,
            )
        )
    )
    spent_24h = int(result.scalar_one() or 0)

    if spent_24h + amount > max_per_24h:
        remaining = max(0, max_per_24h - spent_24h)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Daily spending limit reached for new accounts. "
                f"You can spend {remaining} ⚡ more in the next 24 hours. "
                "This limit lifts automatically after your account is {new_account_days} days old."
            ),
        )


def _bonus_spendable(user: "User") -> int:
    """Return how many bonus credits are still valid (not expired)."""
    if user.bonus_credit_balance <= 0:
        return 0
    if user.bonus_credits_expire_at and datetime.utcnow() > user.bonus_credits_expire_at:
        return 0
    return user.bonus_credit_balance


async def reserve_credits(
    db: AsyncSession,
    user: "User",
    amount: int,
    job_id: str,
    reason: str = "generation_reserve",
) -> None:
    """
    Atomically lock `amount` credits for an in-flight job.

    Drains bonus credits first (FIFO), then paid credits.
    Uses SELECT … FOR UPDATE to prevent concurrent over-spend.
    Raises HTTP 402 if the user has insufficient spendable balance.
    """
    from app.models.user import User as UserModel
    from app.models.credit_transaction import CreditTransaction, TransactionStatus

    # Lock the user row for the duration of this transaction
    result = await db.execute(
        select(UserModel)
        .where(UserModel.id == user.id)
        .with_for_update()
    )
    locked_user = result.scalar_one_or_none()
    if locked_user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    bonus_avail = _bonus_spendable(locked_user)
    paid_avail = locked_user.credit_balance - locked_user.reserved_balance
    total_spendable = bonus_avail + paid_avail

    if total_spendable < amount:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Insufficient credits. Need {amount} ⚡, available {max(0, total_spendable)} ⚡. "
                "Top up your balance in Billing."
            ),
        )

    locked_user.reserved_balance += amount

    ledger = CreditTransaction(
        id=uuid.uuid4(),
        user_id=locked_user.id,
        delta=-amount,
        reason=reason,
        status=TransactionStatus.PENDING,
        job_id=job_id,
        notes=f"Reserved {amount} credits for job {job_id}",
    )
    db.add(ledger)
    await db.flush()
    logger.info("Reserved %d credits for user=%s job=%s", amount, locked_user.id, job_id)


async def finalize_deduction(
    db: AsyncSession,
    user_id: str | uuid.UUID,
    amount: int,
    job_id: str,
    reason: str = "generation_cost",
) -> None:
    """
    On successful job completion: permanently deduct `amount` from credit_balance
    and release the matching reservation.

    Idempotent — safe to call even if the reservation was partially consumed.
    """
    from app.models.user import User as UserModel
    from app.models.credit_transaction import CreditTransaction, TransactionStatus

    uid = uuid.UUID(str(user_id))
    result = await db.execute(
        select(UserModel).where(UserModel.id == uid).with_for_update()
    )
    user_row = result.scalar_one_or_none()
    if user_row is None:
        logger.error("finalize_deduction: user %s not found", uid)
        return

    # Drain bonus credits first, then paid credits.
    # Reserved balance is released by the same total to keep accounting consistent.
    remaining = amount
    bonus_avail = _bonus_spendable(user_row)
    bonus_deduct = min(remaining, bonus_avail)
    if bonus_deduct > 0:
        user_row.bonus_credit_balance -= bonus_deduct
        remaining -= bonus_deduct

    actual_deduct = min(remaining, user_row.credit_balance)
    actual_release = min(amount, user_row.reserved_balance)

    user_row.credit_balance -= actual_deduct
    user_row.reserved_balance -= actual_release

    # Update the matching PENDING ledger entry; create a new COMPLETED entry as fallback.
    result2 = await db.execute(
        select(CreditTransaction).where(
            CreditTransaction.user_id == uid,
            CreditTransaction.job_id == job_id,
            CreditTransaction.status == TransactionStatus.PENDING,
        )
    )
    pending = result2.scalar_one_or_none()
    if pending:
        pending.status = TransactionStatus.COMPLETED
        pending.reason = reason
        pending.notes = f"Finalised deduction of {actual_deduct} credits for job {job_id}"
        pending.updated_at = datetime.utcnow()
    else:
        db.add(
            CreditTransaction(
                id=uuid.uuid4(),
                user_id=uid,
                delta=-actual_deduct,
                reason=reason,
                status=TransactionStatus.COMPLETED,
                job_id=job_id,
                notes=f"Finalised deduction of {actual_deduct} credits for job {job_id}",
            )
        )

    await db.flush()
    logger.info(
        "Finalised deduction of %d credits for user=%s job=%s", actual_deduct, uid, job_id
    )


async def release_reservation(
    db: AsyncSession,
    user_id: str | uuid.UUID,
    amount: int,
    job_id: str,
) -> None:
    """
    On job failure: return the reserved credits to the user's available pool.
    Marks the ledger entry as CANCELLED.
    """
    from app.models.user import User as UserModel
    from app.models.credit_transaction import CreditTransaction, TransactionStatus

    uid = uuid.UUID(str(user_id))
    result = await db.execute(
        select(UserModel).where(UserModel.id == uid).with_for_update()
    )
    user_row = result.scalar_one_or_none()
    if user_row is None:
        logger.error("release_reservation: user %s not found", uid)
        return

    actual_release = min(amount, user_row.reserved_balance)
    user_row.reserved_balance -= actual_release

    result2 = await db.execute(
        select(CreditTransaction).where(
            CreditTransaction.user_id == uid,
            CreditTransaction.job_id == job_id,
            CreditTransaction.status == TransactionStatus.PENDING,
        )
    )
    pending = result2.scalar_one_or_none()
    if pending:
        pending.status = TransactionStatus.CANCELLED
        pending.notes = f"Released {actual_release} reserved credits; job {job_id} failed"
        pending.updated_at = datetime.utcnow()

    await db.flush()
    logger.info(
        "Released %d reserved credits for user=%s job=%s", actual_release, uid, job_id
    )
