import asyncio
import sys
import os

# Add the project root to python path to resolve app imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_async_session_factory
from app.models.ai_model import AIModel

MODELS_SEED = [
    {
        "name": "Mock Fast",
        "provider": "mock",
        "supported_tasks": [
            "text_to_image",
            "image_to_image",
            "image_to_video",
            "text_to_video",
            "video_to_video",
            "image_to_3d",
            "text_to_story",
        ],
        "cost_per_unit": 0.00,
        "quality_score": 5,
        "minimum_tier": "free",
        "description": "Local mock generation for testing all modalities without cost.",
    },
    {
        "name": "Pika Pro",
        "provider": "pika",
        "supported_tasks": ["text_to_video", "image_to_video"],
        "cost_per_unit": 0.10,
        "quality_score": 7,
        "minimum_tier": "basic",
        "description": "Fast and economical video generation model ideal for basic tier.",
    },
    {
        "name": "Runway Gen-3 Alpha",
        "provider": "runway",
        "supported_tasks": ["text_to_video", "image_to_video", "video_to_video"],
        "cost_per_unit": 0.50,
        "quality_score": 9,
        "minimum_tier": "pro",
        "description": "Ultra high fidelity and photorealistic video generation. Pro tier.",
    },
    {
        "name": "Fal AI",
        "provider": "fal",
        "supported_tasks": [
            "text_to_image",
            "image_to_image",
            "text_to_video",
            "image_to_video",
            "video_to_video",
            "image_to_3d",
            "text_to_story",
        ],
        "cost_per_unit": 0.20,
        "quality_score": 9,
        "minimum_tier": "free",
        "description": "Fast multi-modal AI generation with Fal. Reduced to free tier for testing.",
    },
    {
        "name": "Replicate Open",
        "provider": "replicate",
        "supported_tasks": ["text_to_image", "image_to_image"],
        "cost_per_unit": 0.05,
        "quality_score": 6,
        "minimum_tier": "free",
        "description": "Budget-friendly open source models routed via Replicate.",
    },
    {
        "name": "Pixazo Experimental",
        "provider": "pixazo",
        "supported_tasks": ["image_to_video", "video_to_video"],
        "cost_per_unit": 0.35,
        "quality_score": 7,
        "minimum_tier": "pro",
        "description": "Experimental video to video models with unique stylization logic.",
    }
]

async def seed_db():
    print("Re-seeding AI models to database...")
    factory = get_async_session_factory()
    async with factory() as db:
        # Clear existing models to avoid duplicates
        from sqlalchemy import delete
        await db.execute(delete(AIModel))
        
        for model_data in MODELS_SEED:
            db.add(AIModel(**model_data))
        
        await db.commit()
    print("Seeding complete.")

if __name__ == "__main__":
    asyncio.run(seed_db())
