"""Draft ORM model."""

import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Text, ForeignKey, Boolean, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Draft(Base):
    __tablename__ = "drafts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    scene_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("scenes.id"), nullable=False, index=True
    )
    version: Mapped[int] = mapped_column(Integer, default=1)
    video_url: Mapped[str] = mapped_column(Text, nullable=True)
    is_final: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )

    # Relationships
    scene = relationship("Scene", back_populates="drafts")
