"""User schemas for request/response validation."""

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=6, max_length=128)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class UserProfileUpdate(BaseModel):
    """Fields the signed-in user may change for their own account."""

    full_name: Optional[str] = Field(None, max_length=255)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    username: str
    full_name: Optional[str] = None
    plan: str
    is_admin: bool = False
    is_active: bool
    email_verified: bool = False
    credit_balance: int = 0
    reserved_balance: int = 0
    bonus_credit_balance: int = 0
    bonus_credits_expire_at: Optional[datetime] = None
    plan_expires_at: Optional[datetime] = None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
