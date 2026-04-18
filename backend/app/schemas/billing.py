"""Billing / Stripe API schemas."""

from typing import Literal

from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    plan_key: Literal["basic", "pro", "premium"]


class CheckoutResponse(BaseModel):
    url: str


class SyncCheckoutSessionRequest(BaseModel):
    session_id: str


class SyncCheckoutSessionResponse(BaseModel):
    ok: bool = True
