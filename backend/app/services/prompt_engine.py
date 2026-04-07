"""
Prompt Enhancement Engine.
Uses LLM (configurable: GPT-4o, mock, etc.) to transform basic prompts
into cinematic ad-quality generation prompts.
"""

import asyncio
from typing import Optional

from app.config import get_settings


class PromptEngine:
    """
    Transforms user prompts into enhanced cinematic ad prompts
    using a configurable LLM backend.
    """

    SYSTEM_PROMPT = """You are an expert AI video ad director. Your job is to transform 
simple product descriptions into cinematic, visually stunning video generation prompts.

Rules:
1. Keep the enhanced prompt under 200 words
2. Focus on visual elements: lighting, camera angles, movement, mood
3. Include specific cinematic techniques (dolly zoom, slow-mo, etc.)
4. Maintain the product/brand focus
5. Add atmosphere details (particles, bokeh, reflections, etc.)
6. Specify color palette and visual style
7. Output ONLY the enhanced prompt, nothing else

Example input: "Show a premium sneaker on a dark background"
Example output: "Cinematic hero shot of a premium sneaker floating against a deep matte black 
background. Dramatic rim lighting in electric blue and warm amber highlights every contour and 
texture. A slow orbital camera movement reveals the shoe from multiple angles while volumetric 
light rays pierce through atmospheric haze. Subtle particle effects dance in the background. 
The shoe gently rotates with a dolly-in motion, ultra-detailed textures, 4K quality, 
professional product photography style, moody color grading."
"""

    def __init__(self):
        self.settings = get_settings()

    async def enhance(self, prompt: str, context: Optional[str] = None) -> str:
        """
        Enhance a user prompt into a cinematic ad prompt.

        Args:
            prompt: The user's basic prompt
            context: Optional additional context (product type, brand, etc.)

        Returns:
            Enhanced cinematic prompt
        """
        provider = self.settings.llm_provider

        if provider == "mock" or provider == "mock_llm":
            return await self._mock_enhance(prompt)
        elif provider == "openai":
            return await self._openai_enhance(prompt, context)
        else:
            # Fallback to mock
            return await self._mock_enhance(prompt)

    async def _openai_enhance(self, prompt: str, context: Optional[str] = None) -> str:
        """Enhance prompt using OpenAI GPT-4."""
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=self.settings.openai_api_key)

            user_message = f"Enhance this product video prompt: {prompt}"
            if context:
                user_message += f"\n\nAdditional context: {context}"

            response = await client.chat.completions.create(
                model=self.settings.llm_model,
                messages=[
                    {"role": "system", "content": self.SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                max_tokens=500,
                temperature=0.7,
            )

            enhanced = response.choices[0].message.content.strip()
            return enhanced

        except Exception as e:
            # Fallback to mock if OpenAI fails
            print(f"OpenAI enhancement failed: {e}, falling back to mock")
            return await self._mock_enhance(prompt)

    async def _mock_enhance(self, prompt: str) -> str:
        """Mock enhancement for development without API keys."""
        await asyncio.sleep(0.5)  # Simulate latency

        enhanced = (
            f"Cinematic product advertisement: {prompt}. "
            f"Shot with dramatic lighting against a sleek dark background. "
            f"Smooth orbital camera movement with a slow dolly-in. "
            f"Volumetric light rays and subtle particle effects create depth. "
            f"Professional color grading with rich contrast. "
            f"Ultra-detailed 4K quality, premium commercial aesthetic. "
            f"Gentle bokeh in the background with reflective surface beneath the product."
        )
        return enhanced
