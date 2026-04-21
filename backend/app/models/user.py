"""User ORM model."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import String, DateTime, Boolean, Integer, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class User(Base):
    __tablename__ = "users"

    __table_args__ = (
        CheckConstraint("credit_balance >= 0", name="ck_users_credit_balance_non_negative"),
        CheckConstraint("reserved_balance >= 0", name="ck_users_reserved_balance_non_negative"),
        CheckConstraint("bonus_credit_balance >= 0", name="ck_users_bonus_credit_balance_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    username: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False, index=True
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=True)
    plan: Mapped[str] = mapped_column(String(20), default="free")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    stripe_customer_id: Mapped[str] = mapped_column(String(100), nullable=True)

    # Paid credits (subscription/top-up) — never expire while account is active
    credit_balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Credits ring-fenced for in-flight jobs; not yet permanently deducted
    reserved_balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # Bonus/promotional credits — expire after bonus_credits_expire_at
    bonus_credit_balance: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    bonus_credits_expire_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    projects = relationship("Project", back_populates="user", lazy="selectin")
    usage_logs = relationship("UsageLog", back_populates="user", lazy="selectin")
    subscription = relationship(
        "Subscription", back_populates="user", uselist=False, lazy="selectin"
    )
    credit_transactions = relationship(
        "CreditTransaction", back_populates="user", lazy="dynamic", order_by="CreditTransaction.created_at.desc()"
    )
