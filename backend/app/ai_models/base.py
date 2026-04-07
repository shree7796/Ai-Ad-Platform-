"""
Abstract base class for all AI generation model adapters.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Dict, Any


@dataclass
class GenerationResult:
    """Result from an AI generation model."""
    success: bool
    media_url: Optional[str] = None  # URL or local path to generated media (image/video)
    media_data: Optional[bytes] = None  # Raw bytes (if returned directly)
    error_message: Optional[str] = None
    model_name: str = ""
    generation_time_seconds: float = 0.0
    metadata: Optional[Dict[str, Any]] = None


class BaseAIProvider(ABC):
    """
    Abstract base adapter for AI providers (Fal, Runway, Pika, etc.).
    Providers should implement the modalities they support.
    """

    def __init__(self, name: str, config: Dict[str, Any] = None):
        self.name = name
        self.config = config or {}

    async def text_to_image(self, prompt: str, **kwargs) -> GenerationResult:
        raise NotImplementedError(f"{self.name} does not support text_to_image")

    async def image_to_image(self, image_url: str, prompt: str, **kwargs) -> GenerationResult:
        raise NotImplementedError(f"{self.name} does not support image_to_image")

    async def image_to_video(self, image_url: str, prompt: str, duration_seconds: int = 12, **kwargs) -> GenerationResult:
        raise NotImplementedError(f"{self.name} does not support image_to_video")

    async def text_to_video(self, prompt: str, duration_seconds: int = 12, **kwargs) -> GenerationResult:
        raise NotImplementedError(f"{self.name} does not support text_to_video")

    async def video_to_video(self, video_url: str, prompt: str, duration_seconds: int = 12, **kwargs) -> GenerationResult:
        raise NotImplementedError(f"{self.name} does not support video_to_video")

    @abstractmethod
    async def check_status(self, job_id: str) -> Dict[str, Any]:
        """Check the status of an async generation job."""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Verify the model API is accessible."""
        pass

    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} name={self.name}>"
