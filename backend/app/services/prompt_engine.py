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

        # Detect marketplace/clean styles
        lower_prompt = prompt.lower()
        if any(x in lower_prompt for x in ["flipkart", "amazon", "white background", "clean", "minimal"]):
            background = "clean, high-key white studio background"
            lighting = "soft, even white lighting with minimal shadows"
            # Avoid the word 'photography' as it often causes cameras to appear
            style = "marketplace product display, e-commerce quality, maintain original item appearance"
        else:
            background = "sleek dark background"
            lighting = "dramatic cinematic lighting with volumetric rays"
            style = "premium commercial aesthetic, ultra-detailed 4K quality"

        enhanced = (
            f"Official product shot: {prompt}. "
            f"The original product in the input image must be preserved exactly. "
            f"Scene: {lighting} against a {background}. "
            f"{style}. "
            f"High resolution, sharp focus on the product, professional commercial style."
        )
        return enhanced
