"""Scene ORM model."""

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, DateTime, Text, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Scene(Base):
    __tablename__ = "scenes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False, index=True
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=True)
    enhanced_prompt: Mapped[str] = mapped_column(Text, nullable=True)
    task_type: Mapped[str] = mapped_column(String(50), nullable=True)
    provider_used: Mapped[str] = mapped_column(String(50), nullable=True)
    model_used: Mapped[str] = mapped_column(String(50), nullable=True)
    tier: Mapped[str] = mapped_column(
        String(20), default="basic"
    )  # basic, pro, premium
    output_video_url: Mapped[str] = mapped_column(Text, nullable=True)
    cost: Mapped[Decimal] = mapped_column(
        Numeric(10, 4), default=Decimal("0.0000")
    )
    status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending, enhancing, generating, processing, completed, failed
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[int] = mapped_column(default=12)
    celery_task_id: Mapped[str] = mapped_column(String(255), nullable=True)
    # Idempotency key provided by the client; prevents double-reserve on retries/double-clicks.
    idempotency_key: Mapped[str] = mapped_column(String(100), nullable=True, unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="scenes")
    drafts = relationship("Draft", back_populates="scene", lazy="selectin")
