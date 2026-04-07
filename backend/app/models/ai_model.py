import uuid
from sqlalchemy import Column, String, Float, Integer, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.db.session import Base

class AIModel(Base):
    __tablename__ = "ai_models"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    provider = Column(String(50), nullable=False, index=True)
    supported_tasks = Column(JSONB, nullable=False, default=list) # e.g. ["text_to_image", "image_to_video"]
    cost_per_unit = Column(Float, nullable=False, default=0.0)
    quality_score = Column(Integer, nullable=False, default=5) # 1-10
    is_active = Column(Boolean, default=True, nullable=False)
    minimum_tier = Column(String(50), nullable=False, default="basic") # free, basic, pro, premium
    description = Column(Text, nullable=True)

    def __repr__(self):
        return f"<AIModel(name={self.name}, provider={self.provider})>"
