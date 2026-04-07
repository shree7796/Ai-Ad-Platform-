import uuid
from typing import Dict, Any, Type, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.ai_model import AIModel
from app.ai_models.base import BaseAIProvider
from app.ai_models.mock_adapter import MockProvider
from app.ai_models.pika_adapter import PikaAdapter
from app.ai_models.runway_adapter import RunwayAdapter
from app.ai_models.fal_adapter import FalAdapter
from app.ai_models.replicate_adapter import ReplicateAdapter
from app.ai_models.pixazo_adapter import PixazoAdapter

ADAPTER_MAP: Dict[str, Type[BaseAIProvider]] = {
    "mock": MockProvider,
    "pika": PikaAdapter,
    "runway": RunwayAdapter,
    "fal": FalAdapter,
    "replicate": ReplicateAdapter,
    "pixazo": PixazoAdapter,
}

TIER_RANKS = {"free": 0, "basic": 1, "pro": 2, "premium": 3}

class ModelRouter:
    """
    Dynamically selects and instantiates the best AI Provider for a specific task and tier.
    """

    @staticmethod
    async def get_best_provider(
        db: AsyncSession,
        task_type: str,
        user_tier: str,
        requested_provider: Optional[str] = None
    ) -> BaseAIProvider:
        """
        Query DB for active models supporting task_type.
        Filter out models requiring higher tiers than user_tier.
        If requested_provider is provided, respect it if the tier allows.
        Otherwise, select the one with the best quality/cost ratio or just fallback logic.
        """
        stmt = select(AIModel).where(AIModel.is_active == True)
        result = await db.execute(stmt)
        models = result.scalars().all()

        user_rank = TIER_RANKS.get(user_tier, 0)

        valid_models = []
        for model in models:
            if task_type in model.supported_tasks:
                model_rank = TIER_RANKS.get(model.minimum_tier, 0)
                if user_rank >= model_rank:
                    valid_models.append(model)

        if not valid_models:
            # Fallback to Mock if no matching models
            return MockProvider()

        selected = None
        if requested_provider:
            for m in valid_models:
                if m.provider == requested_provider:
                    selected = m
                    break
        
        if not selected:
            # Simple Optimization: pick lowest cost that works, or highest quality.
            # Here: pick lowest cost per unit.
            selected = min(valid_models, key=lambda m: m.cost_per_unit)

        adapter_class = ADAPTER_MAP.get(selected.provider, MockProvider)
        return adapter_class(name=selected.name)

