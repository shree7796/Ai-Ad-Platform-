"""
Mock AI Provider — Generates placeholder images and videos for development.
Used when provider=mock or during testing.
"""

import asyncio
import time
import subprocess
import tempfile
import os
from typing import Optional, Dict, Any

from app.ai_models.base import BaseAIProvider, GenerationResult


class MockProvider(BaseAIProvider):
    """
    Mock adapter that generates simple test images and videos using FFmpeg.
    """

    def __init__(self, name: str = "mock", config: Dict[str, Any] = None):
        super().__init__(name, config or {})
        self.delay_seconds = self.config.get("delay_seconds", 3)

    async def _generate_media(self, prompt: str, duration: int, is_video: bool, mode_text: str) -> GenerationResult:
        start_time = time.time()
        await asyncio.sleep(self.delay_seconds)

        extension = ".mp4" if is_video else ".jpg"
        
        try:
            with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as tmp:
                output_path = tmp.name

            display_prompt = prompt[:80] + "..." if len(prompt) > 80 else prompt
            safe_prompt = display_prompt.replace("'", "").replace(":", " ").replace("\\", "")

            if is_video:
                ffmpeg_cmd = [
                    "ffmpeg", "-y",
                    "-f", "lavfi",
                    "-i", (
                        f"color=c=#1a1a2e:s=1920x1080:d={duration},"
                        f"drawtext=text='Mock {mode_text}':"
                        f"fontsize=48:fontcolor=white:"
                        f"x=(w-text_w)/2:y=h/3:"
                        f"enable='gte(t,0)',"
                        f"drawtext=text='{safe_prompt}':"
                        f"fontsize=28:fontcolor=#e94560:"
                        f"x=(w-text_w)/2:y=h/2:"
                        f"enable='gte(t,0.5)'"
                    ),
                    "-c:v", "libx264",
                    "-pix_fmt", "yuv420p",
                    "-preset", "ultrafast",
                    "-t", str(duration),
                    output_path,
                ]
            else:
                ffmpeg_cmd = [
                    "ffmpeg", "-y",
                    "-f", "lavfi",
                    "-i", f"color=c=#1a1a2e:s=1920x1080:d=1",
                    "-vframes", "1",
                    "-vf", (
                        f"drawtext=text='Mock {mode_text}':"
                        f"fontsize=48:fontcolor=white:"
                        f"x=(w-text_w)/2:y=h/3,"
                        f"drawtext=text='{safe_prompt}':"
                        f"fontsize=28:fontcolor=#e94560:"
                        f"x=(w-text_w)/2:y=h/2"
                    ),
                    output_path,
                ]

            process = await asyncio.create_subprocess_exec(
                *ffmpeg_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            _, stderr = await process.communicate()

            if process.returncode != 0:
                os.unlink(output_path)
                return GenerationResult(
                    success=False,
                    error_message=f"FFmpeg error: {stderr.decode()[:500]}",
                    model_name=self.name,
                    generation_time_seconds=time.time() - start_time,
                )

            with open(output_path, "rb") as f:
                media_data = f.read()

            os.unlink(output_path)

            return GenerationResult(
                success=True,
                media_data=media_data,
                model_name=self.name,
                generation_time_seconds=time.time() - start_time,
                metadata={"mock": True, "mode": mode_text},
            )

        except Exception as e:
            return GenerationResult(
                success=False,
                error_message=str(e),
                model_name=self.name,
                generation_time_seconds=time.time() - start_time,
            )

    async def text_to_image(self, prompt: str, **kwargs) -> GenerationResult:
        return await self._generate_media(prompt, 1, False, "Text-to-Image")

    async def image_to_image(self, image_url: str, prompt: str, **kwargs) -> GenerationResult:
        return await self._generate_media(prompt, 1, False, "Image-to-Image")

    async def image_to_video(self, image_url: str, prompt: str, duration_seconds: int = 12, **kwargs) -> GenerationResult:
        return await self._generate_media(prompt, duration_seconds, True, "Image-to-Video")

    async def text_to_video(self, prompt: str, duration_seconds: int = 12, **kwargs) -> GenerationResult:
        return await self._generate_media(prompt, duration_seconds, True, "Text-to-Video")

    async def video_to_video(self, video_url: str, prompt: str, duration_seconds: int = 12, **kwargs) -> GenerationResult:
        return await self._generate_media(prompt, duration_seconds, True, "Video-to-Video")

    async def check_status(self, job_id: str) -> Dict[str, Any]:
        return {"status": "completed", "job_id": job_id}

    async def health_check(self) -> bool:
        return True
