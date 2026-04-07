"""Project ORM model."""

import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    input_media_url: Mapped[str] = mapped_column(Text, nullable=True)
    input_media_type: Mapped[str] = mapped_column(
        String(20), nullable=True
    )  # "image" or "video"
    status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # pending, processing, completed, failed
    output_video_url: Mapped[str] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[str] = mapped_column(Text, nullable=True)
    task_type: Mapped[str] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    user = relationship("User", back_populates="projects")
    scenes = relationship("Scene", back_populates="project", lazy="selectin")
