"""
Fal Adapter
"""
import asyncio
from typing import Dict, Any
from app.ai_models.base import BaseAIProvider, GenerationResult

class FalAdapter(BaseAIProvider):
    async def text_to_image(self, prompt: str, **kwargs) -> GenerationResult:
        await asyncio.sleep(1)
        return GenerationResult(success=True, media_url="https://fake-fal/image.jpg", model_name=self.name)

    async def image_to_image(self, image_url: str, prompt: str, **kwargs) -> GenerationResult:
        await asyncio.sleep(1)
        return GenerationResult(success=True, media_url="https://fake-fal/image.jpg", model_name=self.name)

    async def text_to_video(self, prompt: str, duration_seconds: int = 12, **kwargs) -> GenerationResult:
        await asyncio.sleep(2)
        return GenerationResult(success=True, media_url="https://fake-fal/video.mp4", model_name=self.name)

    async def check_status(self, job_id: str) -> Dict[str, Any]:
        return {"status": "completed"}

    async def health_check(self) -> bool:
        return True
