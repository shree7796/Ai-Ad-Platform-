"""
AI Model API Routes — List available models.
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.ai_model import AIModel
from app.schemas.common import APIResponse
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/models", tags=["Models"])

class ModelResponse(BaseModel):
    id: uuid.UUID
    name: str
    provider: str
    supported_tasks: List[str]
    cost_per_unit: float
    quality_score: int
    minimum_tier: str
    description: str | None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[ModelResponse])
async def list_models(
    db: AsyncSession = Depends(get_db),
):
    """List all active AI models from the registry."""
    result = await db.execute(
        select(AIModel).where(AIModel.is_active == True).order_by(AIModel.quality_score.desc())
    )
    models = result.scalars().all()
    return models
