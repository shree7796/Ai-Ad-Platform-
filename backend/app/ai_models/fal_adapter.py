"""
Fal Adapter
"""
import asyncio
import os
import logging
import traceback
import re
from typing import Any, Dict, Optional, Tuple
import fal_client
from app.ai_models.base import BaseAIProvider, GenerationResult
from app.config import get_settings
import io
import httpx
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont
import numpy as np

logger = logging.getLogger(__name__)

_WM_PATTERNS = [
    re.compile(
        r'add\s+(?:metallic\s+)?["\u201c]([^"\u201d]+)["\u201d]\s+watermark',
        re.I,
    ),
    re.compile(r'add\s+metallic\s+["\u201c]([^"\u201d]+)["\u201d]\s+watermark', re.I),
    re.compile(r'add\s+["\u201c]([^"\u201d]+)["\u201d]\s+watermark', re.I),
    re.compile(r"add\s+['\"]([^'\"]+)['\"]\s+watermark", re.I),
    re.compile(r"watermark\s*(?:text|say)?\s*[:=]\s*['\"]?([A-Za-z0-9 _\-]+)", re.I),
]

_ACTION_FX_RE = re.compile(
    r"\b(flames?|smoke|smoky|fire\b|burnout|explosion|embers?|sparks?|"
    r"action style|aggressive sporty|sporty vibe)\b",
    re.I,
)


def _extract_watermark_text(user_prompt: str) -> Optional[str]:
    for pat in _WM_PATTERNS:
        m = pat.search(user_prompt)
        if m:
            t = m.group(1).strip()
            if t:
                return t
    return None


def _strip_watermark_phrases(text: str) -> str:
    t = text
    t = re.sub(
        r",?\s*add\s+(?:metallic\s+)?[\"'\u201c][^\"'\u201d]+[\"'\u201d]\s+watermark.*$",
        "",
        t,
        flags=re.I | re.DOTALL,
    )
    t = re.sub(r",?\s*with\s+watermark[^.,]*", "", t, flags=re.I)
    t = re.sub(r",?\s*watermark\s+on\s+[\w\s]+", "", t, flags=re.I)
    t = re.sub(r"\s+,", ",", t)
    t = re.sub(r",\s*,+", ",", t)
    return t.strip(" ,\t\n").strip(",")


def _scene_fragment_from_prompt(user_prompt: str) -> str:
    """
    Prefer text after 'placed on / surrounded by / ...' so we do not send the product
    description to Flux (avoids a second car in the plate).
    """
    work = _strip_watermark_phrases(user_prompt)
    m = re.search(
        r"(?:placed on|sitting on|resting on|standing on|on a|on an)\s+(.+)",
        work,
        re.I | re.DOTALL,
    )
    if m:
        return m.group(1).strip().rstrip(".")

    m = re.search(
        r"\b(?:surrounded by|surrounded with|engulfed in|wrapped in|amid|among)\s+(.+)",
        work,
        re.I | re.DOTALL,
    )
    if m:
        return m.group(1).strip().rstrip(".")

    work = re.sub(
        r"^[\s\S]{0,220}?\b(?:diecast|scale model)\s+model\s+",
        "",
        work,
        count=1,
        flags=re.I,
    )
    work = re.sub(
        r"^[^,]{0,120}?\b(?:diecast|scale model|model car)\b[^,]*,\s*",
        "",
        work,
        flags=re.I,
    )
    work = re.sub(
        r"^[\d:/\s]+(?:scale\s+)?[^\n,]+?\s+",
        "",
        work,
        count=1,
        flags=re.I,
    )
    return work.strip().rstrip(".")


def _is_action_fx_scene(user_prompt: str) -> bool:
    return bool(_ACTION_FX_RE.search(user_prompt))


def _has_fire_or_burning(user_prompt: str) -> bool:
    return bool(
        re.search(
            r"\b(flames?|fire\b|burnout|burning|embers?|inferno|combustion)\b",
            user_prompt,
            re.I,
        )
    )


def _fire_scene_composition_hint() -> str:
    return (
        "Composition for compositing: volumetric smoke billowing upward and behind; "
        "flames and embers hug the ground at the sides and rear, not a solid orange slab "
        "under the whole frame center. Keep the middle footprint slightly darker and readable "
        "asphalt so a subject can sit in-scene. One level road plane in the lower third, "
        "believable horizon for a stationary subject touching the ground. Orange bounce on "
        "pavement, realistic depth, no second vehicle, no toy silhouette."
    )


def _apply_fire_uplight_to_foreground(
    foreground: Image.Image, strength: float
) -> Image.Image:
    """Warm uplight on lower body panels so fire reads as lighting, not a sticker."""
    arr = np.array(foreground.convert("RGBA"), dtype=np.float32)
    a = arr[:, :, 3]
    opaque = a > 12.0
    if not opaque.any():
        return foreground
    ys = np.where(opaque)[0]
    y_min, y_max = float(ys.min()), float(ys.max())
    span = max(y_max - y_min, 1.0)
    h = arr.shape[0]
    row = np.arange(h, dtype=np.float32)[:, np.newaxis]
    y_norm = (row - y_min) / span
    y_norm = np.clip(y_norm, 0.0, 1.0)
    uplight = np.clip((y_norm - 0.32) / 0.68, 0.0, 1.0) ** 1.75
    uplight = uplight * opaque.astype(np.float32)
    fire = np.array([255.0, 82.0, 28.0], dtype=np.float32)
    rim = np.clip((y_norm - 0.5) / 0.5, 0.0, 1.0) * 0.35 * opaque.astype(np.float32)
    rim_color = np.array([255.0, 160.0, 90.0], dtype=np.float32)
    rgb = arr[:, :, :3]
    rgb = rgb + uplight[:, :, np.newaxis] * fire * strength
    rgb = rgb + rim[:, :, np.newaxis] * rim_color * strength
    arr[:, :, :3] = np.clip(rgb, 0.0, 255.0)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def _translate_rgba_down(fg: Image.Image, dy: int) -> Image.Image:
    """Shift opaque pixels down by dy; top clears to transparent. Helps wheels meet the road."""
    if dy <= 0:
        return fg
    arr = np.array(fg.convert("RGBA"), dtype=np.uint8)
    h, _, _ = arr.shape
    dy = min(dy, h - 1)
    out = np.zeros_like(arr)
    out[:, :, 3] = 0
    out[dy:, :] = arr[:-dy, :]
    return Image.fromarray(out, "RGBA")


def _align_foreground_bottom_to_fraction(
    fg: Image.Image,
    y_fraction: float,
    max_shift_frac: float = 0.14,
) -> Image.Image:
    """Move subject down until lowest opaque row is near y_fraction * height (capped)."""
    y_fraction = float(np.clip(y_fraction, 0.55, 0.97))
    a = np.array(fg.split()[-1])
    h, w = a.shape
    row_has_fg = np.any(a > 12, axis=1)
    if not row_has_fg.any():
        return fg
    bottom = int(np.where(row_has_fg)[0].max())
    target = int(h * y_fraction)
    dy = target - bottom
    if dy <= 0:
        return fg
    max_dy = max(1, int(h * max_shift_frac))
    return _translate_rgba_down(fg, min(dy, max_dy))


def _prompt_suggests_ground_contact(p: str) -> bool:
    low = p.lower()
    return any(
        ph in low
        for ph in (
            "on road",
            "on asphalt",
            "on the road",
            "on floor",
            "on ground",
            "placed on",
            "sitting on",
            "resting on",
            "standing on",
        )
    )


def _resolve_fg_auto_ground(prompt: str, kwargs: Dict[str, Any]) -> bool:
    v = kwargs.get("fg_auto_ground")
    if v is False:
        return False
    if v is True:
        return True
    return _prompt_suggests_ground_contact(prompt) or _has_fire_or_burning(prompt)


def _build_full_background_prompt(user_prompt: str) -> Tuple[str, Optional[str], bool]:
    watermark = _extract_watermark_text(user_prompt)
    metallic_wm = bool(
        re.search(r"\bmetallic\b", user_prompt, re.I)
        and (
            watermark is not None
            or re.search(r"\bwatermark\b", user_prompt, re.I)
        )
    )
    scene = _scene_fragment_from_prompt(user_prompt)
    if not scene:
        scene = "photorealistic environment with soft natural light, shallow depth of field"

    action_fx = _is_action_fx_scene(user_prompt)

    scale_hint = ""
    if not action_fx and (
        re.search(r"\b1\s*:\s*\d{1,2}\b", user_prompt, re.I)
        or (
            re.search(r"\b(diecast|miniature)\b", user_prompt, re.I)
            and re.search(r"\bmacro\b", user_prompt, re.I)
        )
    ):
        scale_hint = (
            " Macro product-photography scale: sharp ground texture near camera, "
            "strong depth of field; miniature subject will be composited later. "
        )

    fire_extra = f" {_fire_scene_composition_hint()}" if _has_fire_or_burning(user_prompt) else ""

    if action_fx:
        guard = (
            "Photorealistic full-bleed atmospheric plate. "
            "Strict: no car, vehicle, motorcycle, toy, diecast, wheels, chassis, product, or people. "
            "No logos, brand names, or readable watermark text in the scene. "
            "Show only environment: lighting, flames, smoke, sparks, haze, ground, and mood as described."
        )
    else:
        guard = (
            "Photorealistic scene plate only. "
            "Do not draw any car, vehicle, toy, diecast model, product, packaging, people, or text. "
            "Leave a clear ground plane in the lower/middle area for compositing one small object."
        )
    full = f"{scene.rstrip('.')}. {scale_hint}{fire_extra} {guard}".strip()
    return full, watermark, metallic_wm


def _draw_watermark_road_surface(img: Image.Image, text: str) -> None:
    if img.mode != "RGB":
        img = img.convert("RGB")
    w, h = img.size
    draw = ImageDraw.Draw(img)
    font_size = max(16, int(min(w, h) * 0.042))
    font = None
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        try:
            font = ImageFont.truetype(path, font_size)
            break
        except OSError:
            continue
    if font is None:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (w - tw) // 2
    y = min(int(h * 0.90), h - th - 8)

    for dx, dy in ((2, 2), (1, 1)):
        draw.text((x + dx, y + dy), text, font=font, fill=(15, 15, 20))
    draw.text((x, y), text, font=font, fill=(230, 232, 238))


def _load_bold_font(size: int) -> Any:
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def _draw_watermark_metallic(
    img: Image.Image, text: str, on_road: bool = True, warm_glow: bool = False
) -> None:
    """Metallic embossed text; optional contact shadow + faint warm bounce on asphalt."""
    base = img.convert("RGBA")
    w, h = base.size
    font_size = max(18, int(min(w, h) * 0.048))
    font = _load_bold_font(font_size)

    tw, th, x, y = _watermark_layout(w, h, text, font)
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)

    if on_road:
        pad_x = int(max(tw * 0.65, 24))
        pad_y = max(10, int(th * 0.45))
        ey0 = y + th - 2
        draw.ellipse(
            [x - pad_x, ey0, x + tw + pad_x, ey0 + pad_y * 2],
            fill=(0, 0, 0, 120),
        )
        if warm_glow:
            draw.ellipse(
                [x - pad_x // 2, ey0 - 4, x + tw + pad_x // 2, ey0 + pad_y + 12],
                fill=(255, 100, 45, 50),
            )
        layer = layer.filter(ImageFilter.GaussianBlur(max(6, min(18, w // 80))))

    dt = ImageDraw.Draw(layer)
    for dx, dy in ((5, 5), (4, 4)):
        dt.text((x + dx, y + dy), text, font=font, fill=(0, 0, 0, 230))
    dt.text((x + 2, y + 3), text, font=font, fill=(40, 42, 48, 255))
    dt.text((x + 1, y + 2), text, font=font, fill=(75, 78, 86, 255))
    dt.text((x, y + 1), text, font=font, fill=(130, 135, 145, 255))
    dt.text((x, y), text, font=font, fill=(210, 214, 222, 255))
    dt.text((x - 1, y - 1), text, font=font, fill=(255, 255, 255, 240))

    blended = Image.alpha_composite(base, layer)
    img.paste(blended.convert("RGB"), (0, 0))


def _watermark_layout(
    w: int, h: int, text: str, font: ImageFont.ImageFont
) -> tuple[int, int, int, int]:
    tmp = Image.new("RGB", (w, h))
    draw = ImageDraw.Draw(tmp)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (w - tw) // 2
    y = min(int(h * 0.86), h - th - 10)
    return tw, th, x, y


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
                # "image_size": kwargs.get("image_size", "square"), # Square is cheaper/faster
                "image_size": {
                    "width": 256,
                    "height": 256
                },
                "num_inference_steps": kwargs.get("steps", 4),    # Minimal steps for Schnell
                "enable_safety_checker": False,
                "guidance_scale": 3.5
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
        try:
            current_image_url = await self._ensure_public_url(image_url)

            # -------------------------------
            # STEP 1: Remove Background
            # -------------------------------
            rembg_handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/rembg",
                arguments={"image_url": current_image_url}
            )
            rembg_result = await asyncio.to_thread(rembg_handler.get)

            if not rembg_result or "image" not in rembg_result:
                return GenerationResult(False, error_message="Background removal failed", model_name=self.name)

            transparent_url = rembg_result["image"]["url"]

            async with httpx.AsyncClient(timeout=30.0) as client:
                fg_bytes = (await client.get(transparent_url)).content

            foreground = Image.open(io.BytesIO(fg_bytes)).convert("RGBA")

            # -------------------------------
            # STEP 2–3: Scene background from user prompt (reference-style), not generic studio
            # -------------------------------
            background_prompt, watermark_text, wm_metallic = _build_full_background_prompt(
                prompt
            )
            logger.info(f"[{self.name}] Background prompt: {background_prompt[:280]}...")

            if _has_fire_or_burning(prompt):
                default_bg_steps = 12
            elif _is_action_fx_scene(prompt):
                default_bg_steps = 10
            else:
                default_bg_steps = 8
            bg_handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/flux/schnell",
                arguments={
                    "prompt": background_prompt,
                    "image_size": {
                        "width": foreground.width,
                        "height": foreground.height
                    },
                    "num_inference_steps": int(kwargs.get("bg_steps", default_bg_steps)),
                    "guidance_scale": float(kwargs.get("guidance_scale", 3.5)),
                    "enable_safety_checker": False,
                }
            )

            bg_result = await asyncio.to_thread(bg_handler.get)

            if not bg_result or "images" not in bg_result:
                return GenerationResult(False, error_message="Background generation failed", model_name=self.name)

            bg_url = bg_result["images"][0]["url"]

            async with httpx.AsyncClient(timeout=30.0) as client:
                bg_bytes = (await client.get(bg_url)).content

            background = Image.open(io.BytesIO(bg_bytes)).convert("RGBA")
            background = background.resize(foreground.size)

            # -------------------------------
            # STEP 4: Match exposure (opaque fg only) + light ambient spill from BG
            # -------------------------------
            fg_arr = np.array(foreground, dtype=np.float32)
            bg_arr = np.array(background, dtype=np.float32)
            a = fg_arr[:, :, 3]
            opaque = a > 12.0

            bg_lum = (
                0.299 * bg_arr[:, :, 0]
                + 0.587 * bg_arr[:, :, 1]
                + 0.114 * bg_arr[:, :, 2]
            )
            avg_bg = float(bg_lum.mean())

            fg_lum = (
                0.299 * fg_arr[:, :, 0]
                + 0.587 * fg_arr[:, :, 1]
                + 0.114 * fg_arr[:, :, 2]
            )
            avg_fg = float(fg_lum[opaque].mean()) if opaque.any() else float(fg_lum.mean())

            ratio = avg_bg / (avg_fg + 1e-5)
            ratio = max(0.75, min(1.35, ratio))

            rgb = fg_arr[:, :, :3] * ratio
            fg_arr[:, :, :3] = np.clip(rgb, 0.0, 255.0)
            # Mild contrast on RGB only
            rgb2 = fg_arr[:, :, :3]
            m = rgb2[opaque].mean() if opaque.any() else rgb2.mean()
            fg_arr[:, :, :3] = np.clip((rgb2 - m) * 1.06 + m, 0.0, 255.0)

            # Tint from lower background strip (rim / bounce light)
            bh = background.height
            strip = bg_arr[int(bh * 0.68) :, :, :3].reshape(-1, 3)
            if strip.size:
                ambient = strip.mean(axis=0)
                default_spill = 0.22 if _is_action_fx_scene(prompt) else 0.14
                blend = float(kwargs.get("ambient_spill", default_spill))
                for c in range(3):
                    ch = fg_arr[:, :, c]
                    ch = np.where(opaque, ch * (1.0 - blend) + ambient[c] * blend, ch)
                    fg_arr[:, :, c] = ch

            foreground = Image.fromarray(fg_arr.astype(np.uint8), "RGBA")
            if _has_fire_or_burning(prompt) and kwargs.get("fire_uplight", True):
                uplight_strength = float(kwargs.get("fire_uplight_strength", 0.38))
                foreground = _apply_fire_uplight_to_foreground(foreground, uplight_strength)

            # Vertical placement: source photos are often framed high → car "floats" vs AI road.
            if kwargs.get("fg_align_bottom_to_fraction") is not None:
                foreground = _align_foreground_bottom_to_fraction(
                    foreground,
                    float(kwargs["fg_align_bottom_to_fraction"]),
                    float(kwargs.get("fg_max_nudge_fraction", 0.14)),
                )
            elif _resolve_fg_auto_ground(prompt, kwargs):
                foreground = _align_foreground_bottom_to_fraction(
                    foreground,
                    float(kwargs.get("fg_ground_target_fraction", 0.865)),
                    float(kwargs.get("fg_max_nudge_fraction", 0.14)),
                )
            elif int(kwargs.get("fg_nudge_down_px") or 0) > 0:
                foreground = _translate_rgba_down(
                    foreground, int(kwargs["fg_nudge_down_px"])
                )

            # -------------------------------
            # STEP 5: Per-column contact shadow (grounding)
            # -------------------------------
            alpha = foreground.split()[-1]
            width, height = alpha.size
            a = np.array(alpha, dtype=np.int16)
            shadow_np = np.zeros((height, width), dtype=np.float32)

            threshold = 12
            max_drop = max(10, int(height * 0.09))
            for x in range(width):
                col = a[:, x]
                nz = np.where(col > threshold)[0]
                if nz.size == 0:
                    continue
                y0 = int(nz[-1])
                # Strongest just under contact, fade with distance
                for dy in range(1, max_drop + 1):
                    y = y0 + dy
                    if y >= height:
                        break
                    t = dy / float(max_drop)
                    strength = (1.0 - t) ** 1.35
                    shadow_np[y, x] = max(
                        shadow_np[y, x], 210.0 * strength * (col[y0] / 255.0)
                    )

            shadow_mult = float(kwargs.get("shadow_opacity", 0.55))
            if _has_fire_or_burning(prompt):
                shadow_mult = float(kwargs.get("shadow_opacity", 0.62))
            shadow_u8 = np.clip(shadow_np * shadow_mult, 0, 255).astype(np.uint8)
            blur_radius = max(2, min(12, int(width * 0.006)))
            shadow_l = Image.fromarray(shadow_u8, mode="L").filter(
                ImageFilter.GaussianBlur(blur_radius)
            )
            sh = np.array(shadow_l, dtype=np.float32) / 255.0

            if _has_fire_or_burning(prompt):
                sr = np.clip(22.0 + 120.0 * sh, 0, 255).astype(np.uint8)
                sg = np.clip(10.0 + 38.0 * sh, 0, 255).astype(np.uint8)
                sb = np.clip(6.0 + 18.0 * sh, 0, 255).astype(np.uint8)
                sa = np.clip(sh * 255.0 * 0.92, 0, 255).astype(np.uint8)
            else:
                sr = np.zeros_like(sh, dtype=np.uint8)
                sg = np.zeros_like(sh, dtype=np.uint8)
                sb = np.zeros_like(sh, dtype=np.uint8)
                sa = np.clip(sh * 255.0, 0, 255).astype(np.uint8)

            shadow_rgba = Image.merge(
                "RGBA",
                (
                    Image.fromarray(sr, mode="L"),
                    Image.fromarray(sg, mode="L"),
                    Image.fromarray(sb, mode="L"),
                    Image.fromarray(sa, mode="L"),
                ),
            )
            background.paste(shadow_rgba, (0, 0), shadow_rgba)

            # -------------------------------
            # STEP 6: Composite
            # -------------------------------
            final_image = Image.alpha_composite(background, foreground)

            # -------------------------------
            # STEP 7: Export (optional watermark from prompt, e.g. COUNTRYLINK on road)
            # -------------------------------
            out = final_image.convert("RGB")
            wm = kwargs.get("watermark_text", watermark_text)
            if wm:
                use_metallic = bool(
                    kwargs.get("watermark_metallic", wm_metallic)
                )
                if use_metallic:
                    _draw_watermark_metallic(
                        out,
                        str(wm),
                        on_road=True,
                        warm_glow=_has_fire_or_burning(prompt),
                    )
                else:
                    _draw_watermark_road_surface(out, str(wm))

            img_byte_arr = io.BytesIO()
            out.save(img_byte_arr, format="JPEG", quality=90)

            return GenerationResult(
                success=True,
                media_data=img_byte_arr.getvalue(),
                model_name=self.name
            )

        except Exception as e:
            logger.error(traceback.format_exc())
            return GenerationResult(
                success=False,
                error_message=f"Image pipeline failed: {str(e)}",
                model_name=self.name,
            )
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
