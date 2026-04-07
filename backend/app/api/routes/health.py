"""
Health check route.
"""

from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ai-ad-generator"}
