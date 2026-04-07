"""
Fal Adapter
"""
import asyncio
import os
import logging
import traceback
from typing import Dict, Any
import fal_client
from app.ai_models.base import BaseAIProvider, GenerationResult
from app.config import get_settings
from PIL import Image
import io
import httpx

logger = logging.getLogger(__name__)

class FalAdapter(BaseAIProvider):
    def __init__(self, name: str):
        super().__init__(name)
        settings = get_settings()
        if settings.fal_key:
            os.environ["FAL_KEY"] = settings.fal_key
        else:
            logger.warning("FAL_KEY is not set in settings!")

    async def _ensure_public_url(self, url: str) -> str:
        """
        Ensures the URL is publicly accessible by Fal AI.
        If it's a localhost/internal URL, upload it to Fal's CDN.
        """
        if "localhost" in url or "127.0.0.1" in url or url.startswith("/"):
            # Internal URL detected. Translate 'localhost' to 'minio' for internal Docker network access
            internal_url = url.replace("localhost", "minio").replace("127.0.0.1", "minio")
            logger.info(f"[{self.name}] internal URL detected: {url}. Promoting to public Fal storage via {internal_url}...")
            
            async with httpx.AsyncClient(verify=False, http1=True) as client:
                resp = await client.get(internal_url)
                resp.raise_for_status()
                data = resp.content
            
            # Use sync upload via to_thread for byte data
            public_url = await asyncio.to_thread(fal_client.upload, data, "image/png")
            logger.info(f"[{self.name}] Promoted to: {public_url}")
            return public_url
        return url

    async def text_to_image(self, prompt: str, **kwargs) -> GenerationResult:
        """
        Generates an image from a text prompt using Fal.ai (Flux Schnell).
        Optimized for low-cost testing with minimal steps and resolution.
        """
        logger.info(f"[{self.name}] Starting text_to_image. Prompt: {prompt[:100]}...")
        try:
            arguments = {
                "prompt": prompt,
                "image_size": kwargs.get("image_size", "square"), # Square is cheaper/faster
                "num_inference_steps": kwargs.get("steps", 2),    # Minimal steps for Schnell
                "enable_safety_checker": False,
            }
            logger.debug(f"[{self.name}] Fal arguments: {arguments}")
            
            handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/flux/schnell",
                arguments=arguments
            )
            result = await asyncio.to_thread(handler.get)
            logger.debug(f"[{self.name}] Fal raw result: {result}")
            
            if result and "images" in result and len(result["images"]) > 0:
                media_url = result["images"][0]["url"]
                logger.info(f"[{self.name}] Successfully generated image: {media_url}")
                return GenerationResult(success=True, media_url=media_url, model_name=self.name)
            
            error_msg = "No images returned from Fal.ai"
            logger.error(f"[{self.name}] {error_msg}. Full result: {result}")
            return GenerationResult(success=False, error_message=error_msg, model_name=self.name)
        except Exception as e:
            error_msg = f"Fal.ai text_to_image failed: {str(e)}"
            logger.error(f"[{self.name}] {error_msg}")
            logger.error(traceback.format_exc())
            return GenerationResult(success=False, error_message=error_msg, model_name=self.name)

    async def image_to_image(self, image_url: str, prompt: str, **kwargs) -> GenerationResult:
        """
        Performs image-to-image transformation.
        Optimized for low-cost testing.
        """
        try:
            current_image_url = await self._ensure_public_url(image_url)
            
            # Step 1: Remove background if requested (manual or auto-detected)
            if kwargs.get("remove_background"):
                logger.info(f"[{self.name}] Removing background using fal-ai/rembg...")
                rembg_handler = await asyncio.to_thread(
                    fal_client.submit,
                    "fal-ai/rembg",
                    arguments={"image_url": current_image_url}
                )
                rembg_result = await asyncio.to_thread(rembg_handler.get)
                
                if rembg_result and "image" in rembg_result:
                    transparent_url = rembg_result["image"]["url"]
                    logger.info(f"[{self.name}] Background removed: {transparent_url}")
                    
                    # For marketplace styles, force white background instead of transparency
                    if any(x in prompt.lower() for x in ["flipkart", "amazon", "white background", "clean"]):
                        logger.info(f"[{self.name}] Colors compositing on white background for marketplace style...")
                        
                        # Use a robust httpx configuration to avoid SSL EOF issues with some CDNs
                        # Some versions of httpx/httpcore have issues with certain SSL handshakes on HTTP/2
                        async with httpx.AsyncClient(verify=False, http1=True, http2=False, timeout=30.0) as client:
                            resp = await client.get(transparent_url)
                            resp.raise_for_status()
                            foreground_data = resp.content
                        
                        foreground = Image.open(io.BytesIO(foreground_data)).convert("RGBA")
                        background = Image.new("RGBA", foreground.size, (255, 255, 255, 255))
                        combined = Image.alpha_composite(background, foreground).convert("RGB")
                        
                        # Return local bytes so worker skips another upload if it wants, 
                        # but we'll return it as media_data
                        img_byte_arr = io.BytesIO()
                        combined.save(img_byte_arr, format='PNG')
                        return GenerationResult(
                            success=True, 
                            media_data=img_byte_arr.getvalue(),
                            model_name=self.name
                        )
                    else:
                        current_image_url = transparent_url

            # Step 2: Final Stylization (if not already handled by clean background logic)
            # Use extremely low strength to preserve product identity
            arguments = {
                "prompt": prompt,
                "image_url": current_image_url,
                "strength": 0.10 if kwargs.get("remove_background") else 0.15,
                "image_size": "square",
                "num_inference_steps": 2,
            }
            logger.debug(f"[{self.name}] Fal arguments: {arguments}")
            
            handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/flux/schnell",
                arguments=arguments
            )
            result = await asyncio.to_thread(handler.get)
            logger.debug(f"[{self.name}] Fal raw result: {result}")
            
            if result and "images" in result and len(result["images"]) > 0:
                media_url = result["images"][0]["url"]
                logger.info(f"[{self.name}] Successfully transformed image: {media_url}")
                return GenerationResult(success=True, media_url=media_url, model_name=self.name)
            
            error_msg = "No images returned from Fal.ai"
            return GenerationResult(success=False, error_message=error_msg, model_name=self.name)
        except Exception as e:
            error_msg = f"Fal.ai image_to_image failed: {str(e)}"
            logger.error(traceback.format_exc())
            return GenerationResult(success=False, error_message=error_msg, model_name=self.name)

    async def text_to_video(self, prompt: str, duration_seconds: int = 5, **kwargs) -> GenerationResult:
        """
        Generates video from text using Luma Dream Machine on Fal.ai.
        """
        logger.info(f"[{self.name}] Starting text_to_video. Prompt: {prompt[:100]}...")
        try:
            arguments = {
                "prompt": prompt,
                "aspect_ratio": "16:9",
                "loop": False,
            }
            logger.debug(f"[{self.name}] Fal arguments: {arguments}")
            
            handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/luma-dream-machine",
                arguments=arguments
            )
            result = await asyncio.to_thread(handler.get)
            logger.debug(f"[{self.name}] Fal raw result: {result}")
            
            if result and "video" in result:
                media_url = result["video"]["url"]
                return GenerationResult(success=True, media_url=media_url, model_name=self.name)
            
            return GenerationResult(success=False, error_message="No video URL in result", model_name=self.name)
        except Exception as e:
            logger.error(traceback.format_exc())
            return GenerationResult(success=False, error_message=str(e), model_name=self.name)

    async def image_to_video(self, image_url: str, prompt: str, duration_seconds: int = 5, **kwargs) -> GenerationResult:
        """
        Generates video from an image using Luma on Fal.ai.
        """
        logger.info(f"[{self.name}] Starting image_to_video. Image: {image_url}")
        try:
            public_image_url = await self._ensure_public_url(image_url)
            arguments = {
                "prompt": prompt,
                "image_url": public_image_url,
            }
            handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/luma-dream-machine/image-to-video",
                arguments=arguments
            )
            result = await asyncio.to_thread(handler.get)
            if result and "video" in result:
                return GenerationResult(success=True, media_url=result["video"]["url"], model_name=self.name)
            return GenerationResult(success=False, error_message="No video URL", model_name=self.name)
        except Exception as e:
            logger.error(traceback.format_exc())
            return GenerationResult(success=False, error_message=str(e), model_name=self.name)

    async def video_to_video(self, video_url: str, prompt: str, duration_seconds: int = 5, **kwargs) -> GenerationResult:
        """
        Transforms a video using Kling Video on Fal.ai (Stylization).
        """
        logger.info(f"[{self.name}] Starting video_to_video. Video: {video_url}")
        try:
            public_video_url = await self._ensure_public_url(video_url)
            arguments = {
                "video_url": public_video_url,
                "prompt": prompt,
                "negative_prompt": "blurry, low quality",
            }
            handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/kling-video/v1/standard/video-to-video",
                arguments=arguments
            )
            result = await asyncio.to_thread(handler.get)
            if result and "video" in result:
                return GenerationResult(success=True, media_url=result["video"]["url"], model_name=self.name)
            return GenerationResult(success=False, error_message="No video URL", model_name=self.name)
        except Exception as e:
            logger.error(traceback.format_exc())
            return GenerationResult(success=False, error_message=str(e), model_name=self.name)

    async def check_status(self, job_id: str) -> Dict[str, Any]:
        return {"status": "completed"}

    async def health_check(self) -> bool:
        settings = get_settings()
        is_ok = bool(settings.fal_key)
        if not is_ok:
            logger.warning(f"[{self.name}] Health check failed: FAL_KEY missing")
        return is_ok
