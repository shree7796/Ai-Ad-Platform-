"""UsageLog ORM model."""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, DateTime, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class UsageLog(Base):
    __tablename__ = "usage_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    action: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # generation, enhancement, upload
    task_type: Mapped[str] = mapped_column(String(50), nullable=True)
    provider_used: Mapped[str] = mapped_column(String(50), nullable=True)
    model_used: Mapped[str] = mapped_column(String(50), nullable=True)
    tier: Mapped[str] = mapped_column(String(20), nullable=True)
    cost: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), default=Decimal("0.0000")
    )
    metadata_json: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    # Relationships
    user = relationship("User", back_populates="usage_logs")
