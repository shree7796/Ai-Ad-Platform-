"""
Fal Adapter
"""
import asyncio
import os
import logging
import traceback
import re
import io
import httpx
import numpy as np
from typing import Any, Dict, Optional, Tuple
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

import fal_client
from app.ai_models.base import BaseAIProvider, GenerationResult
from app.config import get_settings

logger = logging.getLogger(__name__)

# --- Regex Patterns for Prompt Parsing ---
_WM_PATTERNS = [
    re.compile(r'add\s+(?:metallic\s+)?["\u201c]([^"\u201d]+)["\u201d]\s+watermark', re.I),
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

_FIRE_RE = re.compile(
    r"\b(flames?|fire\b|burnout|burning|embers?|inferno|combustion)\b",
    re.I,
)


# --- Utility Functions for Prompt Engineering ---

def _extract_watermark_text(user_prompt: str) -> Optional[str]:
    """Extracted text requested for watermark."""
    for pat in _WM_PATTERNS:
        m = pat.search(user_prompt)
        if m:
            t = m.group(1).strip()
            if t:
                return t
    return None


def _strip_watermark_phrases(text: str) -> str:
    """Remove watermark specific instructions from text to avoid AI confusion."""
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
    Extract only the environment description from a complex prompt.
    Avoids sending product-specific descriptions to the background generator.
    """
    work = _strip_watermark_phrases(user_prompt)
    
    # Priority 1: Direct placement markers
    m = re.search(
        r"(?:placed on|sitting on|resting on|standing on|on a|on an)\s+(.+)",
        work,
        re.I | re.DOTALL,
    )
    if m:
        return m.group(1).strip().rstrip(".")

    # Priority 2: Surround markers
    m = re.search(
        r"\b(?:surrounded by|surrounded with|engulfed in|wrapped in|amid|among)\s+(.+)",
        work,
        re.I | re.DOTALL,
    )
    if m:
        return m.group(1).strip().rstrip(".")

    # Priority 3: Cleanup common subjects if nothing above matched
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
    return bool(_FIRE_RE.search(user_prompt))


def _fire_scene_composition_hint() -> str:
    return (
        "COMPOSITION CRITICAL for product compositing: "
        "Fire columns rising on BOTH the left side AND right side of the frame simultaneously — "
        "tall orange-yellow flames at left edge, tall flames at right edge, framing the center. "
        "Thick volumetric smoke billowing upward from behind and both sides. "
        "Hot orange glow reflecting on the dark asphalt ground. "
        "Center of frame: dark asphalt/ground surface only, absolutely NO fire or flames in the center ground. "
        "Center must be clear open road space for compositing. "
        "Camera angle: slightly low, eye-level to the ground. "
        "No car, vehicle, person, tire, wheel, or mechanical part anywhere in the scene. "
        "No single isolated fire blob under the center. Pure atmospheric environment plate."
    )

def _anti_wheel_hallucination_hint() -> str:
    return (
        "CRITICAL: no wheels, tires, rims, hubs, brake discs, or floating mechanical parts. "
        "No fire or glow concentrated in one spot under the middle of the frame."
    )


def _wants_composite_plate(prompt: str, kwargs: Dict[str, Any]) -> bool:
    """
    Composite (rembg + background plate) is opt-in. Default is true img2img so the
    pixel grid is actually transformed — otherwise a generic studio plate + same
    cutout looks identical to the user's upload.
    """
    if kwargs.get("force_direct"):
        return False
    if kwargs.get("force_composite") or kwargs.get("use_composite"):
        return True
    low = prompt.lower()
    phrases = (
        "replace background",
        "remove background",
        "isolated on white",
        "pure white background",
        "on white background",
        "catalog shot",
        "marketplace listing",
        "ecommerce product on white",
        "cut out and place",
    )
    if any(p in low for p in phrases):
        return True
    if re.search(r"\b(flipkart|amazon)\b", low):
        return True
    return False


def _wants_preserve_exact_product(prompt: str) -> bool:
    """
    Detect diecast / toy / scale-model prompts so we can add a style lock in direct img2img.
    (Forcing rembg+plate for these looked visibly “pasted” — direct + lock reads more real.)
    """
    low = prompt.lower()
    markers = (
        "diecast",
        "scale model",
        "model car",
        "toy car",
        "miniature",
        "alloy model",
        "collectible car",
        "hot wheels",
        "matchbox",
    )
    if any(m in low for m in markers):
        return True
    if re.search(r"\b1\s*[/:]\s*(18|24|32|43|64)\b", low):
        return True
    return False


def _diecast_style_lock(prompt: str) -> str:
    """Extra instructions for direct img2img so the model keeps toy scale, not a full-size car."""
    if not _wants_preserve_exact_product(prompt):
        return ""
    return (
        "CRITICAL SUBJECT: keep the same small-scale diecast or collectible toy model — not a life-size real vehicle. "
        "Preserve miniature proportions, thick tire sidewalls with readable lettering, toy gloss, and model panel detail. "
        "Light the toy with the same fire, smoke, and ambient colors as the scene so it feels shot in-camera."
    )


def _feather_rgba_edges(img: Image.Image, radius: float = 1.15) -> Image.Image:
    """Soften alpha edges slightly so composites don't read as a hard sticker cutout."""
    arr = np.array(img.convert("RGBA"), dtype=np.float32)
    a = arr[:, :, 3]
    pil_a = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "L")
    blurred = np.asarray(pil_a.filter(ImageFilter.GaussianBlur(radius=radius)), dtype=np.float32)
    arr[:, :, 3] = np.clip(blurred, 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


# --- Image Processing Helpers ---

def _sample_bg_edge_color(background: Image.Image) -> Tuple[float, float, float]:
    """
    Sample the dominant color from the 4 edges of the background.
    Returns (R, G, B) as floats 0-255.
    Used to tint the edge glow to match any scene environment.
    """
    arr = np.array(background.convert("RGB"), dtype=np.float32)
    h, w, _ = arr.shape
    thickness = max(20, h // 8)

    top    = arr[:thickness, :, :]
    bottom = arr[-thickness:, :, :]
    left   = arr[:, :thickness, :]
    right  = arr[:, -thickness:, :]

    combined = np.concatenate([
        top.reshape(-1, 3),
        bottom.reshape(-1, 3),
        left.reshape(-1, 3),
        right.reshape(-1, 3),
    ], axis=0)

    return tuple(combined.mean(axis=0).tolist())


def _apply_environment_edge_glow(
    foreground: Image.Image,
    background: Image.Image,
    intensity: float = 0.45,
    glow_spread: int = 12,
    fire_override: bool = False,
) -> Image.Image:
    """
    Subtle environment-aware rim light around the product silhouette.
    Samples dominant background edge color and applies a soft glow.
    - Small spread (12px) so it reads as rim lighting, not a halo.
    - Vertical gradient: stronger at bottom 60% (ground lighting), fades toward top.
    Works for all scene types: fire, neon, studio, colorful.
    """
    alpha = np.array(foreground.split()[-1], dtype=np.float32)
    h, w = alpha.shape
    mask = (alpha > 12).astype(np.float32)

    pil_mask = Image.fromarray((mask * 255).astype(np.uint8), "L")
    # Small MaxFilter so glow hugs the silhouette edge tightly
    expanded = pil_mask.filter(ImageFilter.MaxFilter(glow_spread * 2 + 1))
    softened = expanded.filter(ImageFilter.GaussianBlur(radius=glow_spread))

    glow_arr = np.array(softened, dtype=np.float32) / 255.0
    glow_arr = glow_arr * (1.0 - mask)  # only outside the product

    # Vertical gradient: glow is 100% at bottom, fades to 20% at top
    # This makes it look like ground/side lighting, not a floating aura
    y_positions = np.linspace(0.2, 1.0, h).reshape(h, 1)
    glow_arr = glow_arr * y_positions

    glow_arr = np.clip(glow_arr * intensity, 0, 1)

    # Sample background edge color
    if fire_override:
        r, g, b = 240.0, 80.0, 15.0   # warm orange-red, no boost needed
    else:
        raw = _sample_bg_edge_color(background)
        r, g, b = float(raw[0]), float(raw[1]), float(raw[2])
        # Mild saturation boost only (1.3x max)
        gray = 0.299 * r + 0.587 * g + 0.114 * b
        sat_boost = 1.3
        r = float(np.clip(gray + (r - gray) * sat_boost, 0, 255))
        g = float(np.clip(gray + (g - gray) * sat_boost, 0, 255))
        b = float(np.clip(gray + (b - gray) * sat_boost, 0, 255))

    r_ch = np.clip(glow_arr * r, 0, 255).astype(np.uint8)
    g_ch = np.clip(glow_arr * g, 0, 255).astype(np.uint8)
    b_ch = np.clip(glow_arr * b, 0, 255).astype(np.uint8)
    a_ch = np.clip(glow_arr * 180.0, 0, 180).astype(np.uint8)  # capped alpha at 180

    return Image.merge("RGBA", (
        Image.fromarray(r_ch, "L"),
        Image.fromarray(g_ch, "L"),
        Image.fromarray(b_ch, "L"),
        Image.fromarray(a_ch, "L"),
    ))


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


def _align_foreground_center_stance_to_fraction(
    fg: Image.Image,
    y_fraction: float,
    max_shift_frac: float = 0.40,
    center_frac: float = 0.46,
) -> Image.Image:
    """
    Like bottom align but uses lowest row in the central band (wheel track), not the front lip.
    Reduces 'rear wheel floating' when the splitter is the global low point.
    """
    y_fraction = float(np.clip(y_fraction, 0.55, 0.98))
    a = np.array(fg.split()[-1])
    h, w = a.shape
    half = center_frac / 2.0
    c0 = int(w * (0.5 - half))
    c1 = int(w * (0.5 + half))
    sub = a[:, c0:c1]
    row_has = np.any(sub > 12, axis=1)
    if not row_has.any():
        return fg
    bottom = int(np.where(row_has)[0].max())
    target = int(h * y_fraction)
    dy = target - bottom
    if dy <= 0:
        return fg
    max_dy = max(1, int(h * max_shift_frac))
    return _translate_rgba_down(fg, min(dy, max_dy))


def _neutralize_background_under_subject(
    background: Image.Image,
    foreground: Image.Image,
    blur_radius: Optional[int] = None,
) -> Image.Image:
    """
    Replace the generated plate under/near the product with a smooth, desaturated patch.
    Stops Flux from leaving phantom wheels, tires, or localized fire blobs behind the composite.
    """
    fg_a = np.array(foreground.split()[-1])
    h, w = fg_a.shape
    if not np.any(fg_a > 12):
        return background

    rows = np.any(fg_a > 12, axis=1)
    cols = np.any(fg_a > 12, axis=0)
    y0, y1 = int(np.where(rows)[0][0]), int(np.where(rows)[0][-1])
    x0, x1 = int(np.where(cols)[0][0]), int(np.where(cols)[0][-1])
    bw, bh = x1 - x0, y1 - y0
    pad_x = max(int(bw * 0.14), int(w * 0.03))
    pad_top = max(int(bh * 0.08), 10)
    pad_bot = max(int(bh * 0.26), int(h * 0.05))

    r0, r1 = max(0, y0 - pad_top), min(h, y1 + pad_bot)
    c0, c1 = max(0, x0 - pad_x), min(w, x1 + pad_x)

    bg = background.convert("RGBA")
    arr = np.asarray(bg, dtype=np.float32)
    roi = arr[r0:r1, c0:c1].copy()
    if roi.size == 0:
        return background

    rh, rw = roi.shape[:2]
    br = blur_radius if blur_radius is not None else max(32, min(110, max(rw, rh) // 2))

    pil_roi = Image.fromarray(np.clip(roi, 0, 255).astype(np.uint8), "RGBA")
    smooth = np.asarray(pil_roi.filter(ImageFilter.GaussianBlur(br)), dtype=np.float32)
    gray = 0.299 * smooth[..., 0] + 0.587 * smooth[..., 1] + 0.114 * smooth[..., 2]
    desat = np.stack([gray, gray, gray], axis=-1)
    smooth[..., :3] = smooth[..., :3] * 0.38 + desat * 0.62
    smooth[..., :3] *= 0.78

    arr[r0:r1, c0:c1] = smooth
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def _resolve_fg_auto_ground(prompt: str, kwargs: Dict[str, Any]) -> bool:
    low = prompt.lower()
    ground_contact = any(
        ph in low
        for ph in (
            "on road", "on asphalt", "on the road", "on floor", "on ground",
            "placed on", "sitting on", "resting on", "standing on",
        )
    )
    v = kwargs.get("fg_auto_ground")
    if v is False: return False
    if v is True: return True
    if ground_contact: return True
    if _has_fire_or_burning(prompt) or _is_action_fx_scene(prompt):
        return bool(kwargs.get("fg_auto_ground_fire", True))
    return False


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
    anti_wheel = _anti_wheel_hallucination_hint() if (action_fx or _has_fire_or_burning(user_prompt)) else ""

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
    full = f"{scene.rstrip('.')}. {scale_hint}{fire_extra} {anti_wheel} {guard}".strip()
    return full, watermark, metallic_wm


# --- Watermarking Helpers ---

def _get_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    """Robustly find a font on the system."""
    font_names = (
        ["DejaVuSans-Bold.ttf", "LiberationSans-Bold.ttf"] if bold
        else ["DejaVuSans.ttf", "LiberationSans.ttf"]
    )
    search_paths = [
        "/usr/share/fonts/truetype/dejavu/",
        "/usr/share/fonts/truetype/liberation/",
        "/usr/share/fonts/TTF/",
    ]
    
    for path in search_paths:
        for name in font_names:
            full_path = os.path.join(path, name)
            if os.path.exists(full_path):
                try:
                    return ImageFont.truetype(full_path, size)
                except Exception:
                    continue
    return ImageFont.load_default()


def _draw_watermark_road_surface(img: Image.Image, text: str) -> None:
    if img.mode != "RGB":
        img = img.convert("RGB")
    w, h = img.size
    draw = ImageDraw.Draw(img)
    font_size = max(16, int(min(w, h) * 0.042))
    font = _get_font(font_size, bold=True)

    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (w - tw) // 2
    y = min(int(h * 0.90), h - th - 8)

    for dx, dy in ((2, 2), (1, 1)):
        draw.text((x + dx, y + dy), text, font=font, fill=(15, 15, 20))
    draw.text((x, y), text, font=font, fill=(230, 232, 238))


def _draw_watermark_metallic(
    img: Image.Image, text: str, on_road: bool = True, warm_glow: bool = False
) -> None:
    """Metallic embossed text; optional contact shadow + faint warm bounce on asphalt."""
    base = img.convert("RGBA")
    w, h = base.size
    font_size = max(18, int(min(w, h) * 0.048))
    font = _get_font(font_size, bold=True)

    # Calculate layout
    tmp_draw = ImageDraw.Draw(Image.new("L", (1, 1)))
    bbox = tmp_draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (w - tw) // 2
    y = min(int(h * 0.86), h - th - 10)

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


class FalAdapter(BaseAIProvider):
    def __init__(self, name: str):
        super().__init__(name)
        settings = get_settings()
        if settings.fal_key:
            os.environ["FAL_KEY"] = settings.fal_key
        else:
            logger.warning(f"[{self.name}] FAL_KEY is not set in settings!")

    def _get_client(self) -> httpx.AsyncClient:
        """Get a configured httpx client."""
        return httpx.AsyncClient(
            timeout=httpx.Timeout(60.0),
            follow_redirects=True,
            verify=False  # Allow internal/local certs for dev
        )

    async def _ensure_public_url(self, url: str) -> str:
        """
        Ensures the URL is publicly accessible by Fal AI.
        If it's a localhost/internal URL, upload it to Fal's CDN.
        """
        if not url:
            return ""
            
        is_internal = any(x in url for x in ["localhost", "127.0.0.1", "172.", "10."]) or url.startswith("/")
        
        if is_internal:
            # Internal URL detected. Translate 'localhost' to 'minio' for internal Docker network access if applicable
            # In some setups, 'minio' is the service name in docker-compose
            internal_url = url.replace("localhost", "minio").replace("127.0.0.1", "minio")
            logger.info(f"[{self.name}] Internal URL detected: {url}. Promoting to Fal storage...")
            
            try:
                async with self._get_client() as client:
                    resp = await client.get(internal_url)
                    resp.raise_for_status()
                    data = resp.content
                
                # Use sync upload via to_thread for byte data
                public_url = await asyncio.to_thread(fal_client.upload, data, "image/png")
                logger.info(f"[{self.name}] Promoted to: {public_url}")
                return public_url
            except Exception as e:
                logger.error(f"[{self.name}] Failed to promote internal URL: {str(e)}")
                # Fallback to original URL and hope for the best
                return url
        return url

    async def _refine_candidate(self, image_data: bytes, prompt: str, **kwargs) -> Optional[bytes]:
        """
        Stage 3: Refinement Pass.
        Bakes the product into the environment using low-strength img2img.
        """
        try:
            # Upload the candidate image to Fal for processing
            public_url = await asyncio.to_thread(fal_client.upload, image_data, "image/jpeg")
            
            refine_strength = float(kwargs.get("refine_strength", 0.15))
            
            # The refinement prompt focuses on realism and grounding
            refine_prompt = (
                f"High-quality product advertisement. {prompt}. "
                "Improve realism, lighting consistency, natural reflections, and grounding. "
                "Ensure the product is naturally placed in the scene. "
                "Preserve exact shape, structure, and details. Do not distort or redesign."
            )
            
            handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/flux/schnell/image-to-image",
                arguments={
                    "image_url": public_url,
                    "prompt": refine_prompt,
                    "strength": refine_strength,
                    "num_inference_steps": 4,
                    "guidance_scale": 3.5,
                    "enable_safety_checker": False,
                }
            )
            result = await asyncio.to_thread(handler.get)
            
            if result and "images" in result:
                refined_url = result["images"][0]["url"]
                async with self._get_client() as client:
                    return (await client.get(refined_url)).content
            return None
        except Exception as e:
            logger.warning(f"[{self.name}] Refinement pass failed: {e}")
            return None

    async def text_to_image(self, prompt: str, **kwargs) -> GenerationResult:
        """
        Generates an image from a text prompt using Fal.ai (Flux Schnell).
        """
        logger.info(f"[{self.name}] Starting text_to_image. Prompt: {prompt[:100]}...")
        try:
            arguments = {
                "prompt": prompt,
                "image_size": kwargs.get("image_size", "square"),
                "num_inference_steps": int(kwargs.get("steps", 4)),
                "enable_safety_checker": False,
                "guidance_scale": float(kwargs.get("guidance_scale", 3.5))
            }
            
            handler = await asyncio.to_thread(
                fal_client.submit, "fal-ai/flux/schnell", arguments=arguments
            )
            result = await asyncio.to_thread(handler.get)
            
            if result and "images" in result and len(result["images"]) > 0:
                media_url = result["images"][0]["url"]
                return GenerationResult(success=True, media_url=media_url, model_name=self.name)
            
            return GenerationResult(success=False, error_message="No images in result", model_name=self.name)
        except Exception as e:
            logger.error(f"[{self.name}] text_to_image failed: {str(e)}")
            return GenerationResult(success=False, error_message=str(e), model_name=self.name)

    async def image_to_image(self, image_url: str, prompt: str, **kwargs) -> GenerationResult:
        """
        Hybrid pipeline (Fal.ai):
        1. Route: composite only for explicit catalog / background-swap style prompts;
           default is flux dev img2img (more realistic fire integration). Diecast/toy prompts
           add a style lock in direct mode instead of forcing a cutout composite.
        2. Generate once
        3. Optional refinement for composite only if enable_refine
        4. Watermarking (prefers raw user_prompt for watermark extraction)
        """
        logger.info(f"[{self.name}] Starting Hybrid Pipeline for prompt: {prompt[:100]}...")
        try:
            current_image_url = await self._ensure_public_url(image_url)

            # Route on RAW user text only. Enhanced prompts often say "on white background"
            # (describing the upload) and falsely trigger composite → looks unchanged.
            routing_prompt = (kwargs.get("user_prompt") or prompt or "").strip() or prompt
            if kwargs.get("force_direct"):
                use_composite = False
            else:
                use_composite = _wants_composite_plate(routing_prompt, kwargs)
            use_direct = not use_composite
            mode_name = "DIRECT (flux dev img2img)" if use_direct else "COMPOSITE (rembg + plate)"
            logger.info(f"[{self.name}] Stage 1: {mode_name}")

            logger.info(f"[{self.name}] Stage 2: Generating...")
            if use_direct:
                candidate_bytes = await self._img2img_direct(current_image_url, prompt, **kwargs)
            else:
                candidate_bytes = await self._img2img_composite(current_image_url, prompt, **kwargs)

            if not candidate_bytes:
                return GenerationResult(
                    success=False,
                    error_message="Failed to generate candidate",
                    model_name=self.name,
                )

            if use_composite and kwargs.get("enable_refine", False):
                logger.info(f"[{self.name}] Stage 3: Refinement pass...")
                refined = await self._refine_candidate(candidate_bytes, prompt, **kwargs)
                chosen_data = refined if refined else candidate_bytes
            else:
                logger.info(f"[{self.name}] Stage 3: Skipping refinement.")
                chosen_data = candidate_bytes

            final_image = Image.open(io.BytesIO(chosen_data)).convert("RGB")

            wm_source = (kwargs.get("user_prompt") or prompt) or ""
            _, wm_text, wm_metallic = _build_full_background_prompt(wm_source)
            wm = kwargs.get("watermark_text", wm_text)
            if wm:
                logger.info(f"[{self.name}] Stage 4: Applying watermark '{wm}'")
                if kwargs.get("watermark_metallic", wm_metallic):
                    _draw_watermark_metallic(
                        final_image, str(wm), warm_glow=_has_fire_or_burning(wm_source)
                    )
                else:
                    _draw_watermark_road_surface(final_image, str(wm))
            
            # Save final output
            out = io.BytesIO()
            final_image.save(out, format="JPEG", quality=95)
            logger.info(f"[{self.name}] Hybrid Pipeline complete.")
            
            return GenerationResult(success=True, media_data=out.getvalue(), model_name=self.name)

        except Exception as e:
            logger.error(f"[{self.name}] Hybrid Pipeline failed: {str(e)}")
            logger.error(traceback.format_exc())
            return GenerationResult(success=False, error_message=str(e), model_name=self.name)

    async def _img2img_direct(self, image_url: str, prompt: str, **kwargs) -> Optional[bytes]:
        """
        True image-to-image: transforms the uploaded pixels (flux dev).
        Uses user_prompt when set — enhanced prompts often insist on zero change.
        Fal defaults (see fal.ai schema): strength=0.95, steps=40, guidance=3.5.
        """
        try:
            creative = (kwargs.get("user_prompt") or prompt or "").strip()
            if not creative:
                creative = prompt

            lock = _diecast_style_lock(creative)
            core = f"{creative}. {lock}" if lock else f"{creative}."
            strength = float(kwargs.get("img2img_strength", 0.95))
            handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/flux/dev/image-to-image",
                arguments={
                    "image_url": image_url,
                    "prompt": (
                        f"{core} "
                        "Cinematic product photography, photorealistic, ultra detailed. "
                        "Apply the full scene, lighting, and effects described. "
                        "Keep the product recognizable; do not swap it for a different model."
                    ),
                    "strength": strength,
                    "num_inference_steps": int(kwargs.get("img2img_steps", 40)),
                    "guidance_scale": float(kwargs.get("guidance_scale", 3.5)),
                    "enable_safety_checker": False,
                },
            )
            result = await asyncio.to_thread(handler.get)
            if not result or "images" not in result:
                return None

            img_url = result["images"][0]["url"]
            async with self._get_client() as client:
                return (await client.get(img_url)).content

        except Exception as e:
            logger.warning(f"[{self.name}] Direct img2img sub-pass failed: {e}")
            return None

    async def _blend_composite_with_flux(
        self, image_jpeg: bytes, routing_prompt: str, **kwargs
    ) -> Optional[bytes]:
        """
        One flux-dev pass on the flattened composite to kill the 'sticker' look:
        unified lighting, haze, and ground contact (high init strength).
        """
        if not kwargs.get("composite_flux_blend", True):
            return None
        try:
            public_url = await asyncio.to_thread(fal_client.upload, image_jpeg, "image/jpeg")
            blend_prompt = (
                f"{routing_prompt[:600]}. "
                "One seamless photoreal photograph — not a collage or layered cutout. "
                "Match fire and sky light on the product with natural color bounce, soft shadows at ground contact, "
                "atmospheric haze, shallow depth of field. Remove halos and hard compositing edges. "
                "Keep the subject identity, pose, scale, and proportions exactly as shown."
            )
            strength = float(kwargs.get("composite_blend_strength", 0.92))
            handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/flux/dev/image-to-image",
                arguments={
                    "image_url": public_url,
                    "prompt": blend_prompt,
                    "strength": strength,
                    "num_inference_steps": int(kwargs.get("composite_blend_steps", 28)),
                    "guidance_scale": float(kwargs.get("composite_blend_guidance", 3.5)),
                    "enable_safety_checker": False,
                },
            )
            result = await asyncio.to_thread(handler.get)
            if not result or "images" not in result:
                return None
            out_url = result["images"][0]["url"]
            async with self._get_client() as client:
                return (await client.get(out_url)).content
        except Exception as e:
            logger.warning(f"[{self.name}] Composite flux blend failed: {e}")
            return None

    async def _img2img_composite(self, image_url: str, prompt: str, **kwargs) -> Optional[bytes]:
        """
        Stage 2 (Composite): Rembg -> Background Gen -> Manual composite.
        """
        try:
            # 1. Remove Background
            rembg_handler = await asyncio.to_thread(
                fal_client.submit, "fal-ai/rembg", arguments={"image_url": image_url}
            )
            rembg_result = await asyncio.to_thread(rembg_handler.get)
            if not rembg_result or "image" not in rembg_result:
                return None

            transparent_url = rembg_result["image"]["url"]
            async with self._get_client() as client:
                fg_bytes = (await client.get(transparent_url)).content
            foreground = Image.open(io.BytesIO(fg_bytes)).convert("RGBA")
            if kwargs.get("feather_fg_edges", True):
                foreground = _feather_rgba_edges(foreground, radius=float(kwargs.get("feather_radius", 1.15)))

            is_fire_scene = _has_fire_or_burning(prompt) or _is_action_fx_scene(prompt)
            if is_fire_scene and kwargs.get("ambient_spill_enabled") is None:
                kwargs["ambient_spill_enabled"] = True

            # 2. Generate Background Environment
            bg_prompt, _, _ = _build_full_background_prompt(prompt)
            # More steps + larger canvas for action/fire plates (less mushy when resized to fg)
            bg_steps = 12 if is_fire_scene else 4
            bg_w = int(kwargs.get("bg_width", 768 if is_fire_scene else 512))
            bg_h = int(kwargs.get("bg_height", 768 if is_fire_scene else 512))

            bg_handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/flux/schnell",
                arguments={
                    "prompt": bg_prompt,
                    "image_size": {"width": bg_w, "height": bg_h},
                    "num_inference_steps": int(kwargs.get("bg_steps", bg_steps)),
                    "guidance_scale": 3.5,
                    "enable_safety_checker": False,
                }
            )
            bg_result = await asyncio.to_thread(bg_handler.get)
            if not bg_result or "images" not in bg_result:
                return None

            bg_url = bg_result["images"][0]["url"]
            async with self._get_client() as client:
                bg_bytes = (await client.get(bg_url)).content
            background = Image.open(io.BytesIO(bg_bytes)).convert("RGBA").resize(foreground.size)

            # 3. Foreground Quality Preservation
            fg_arr = np.array(foreground, dtype=np.float32)
            bg_arr = np.array(background, dtype=np.float32)
            a = fg_arr[:, :, 3]
            opaque = a > 12.0

            if opaque.any() and kwargs.get("exposure_match", True):
                bg_lum = (0.299 * bg_arr[..., 0] + 0.587 * bg_arr[..., 1] + 0.114 * bg_arr[..., 2]).mean()
                fg_lum = (0.299 * fg_arr[..., 0] + 0.587 * fg_arr[..., 1] + 0.114 * fg_arr[..., 2])[opaque].mean()
                lo, hi = (0.82, 1.18) if is_fire_scene else (0.95, 1.05)
                ratio = np.clip(bg_lum / (fg_lum + 1e-5), lo, hi)
                fg_arr[..., :3] = np.clip(fg_arr[..., :3] * ratio, 0, 255)

            if opaque.any() and kwargs.get("ambient_spill_enabled", False):
                strip = bg_arr[int(background.height * 0.7):, :, :3].reshape(-1, 3)
                if strip.size:
                    ambient = strip.mean(axis=0)
                    spill = float(kwargs.get("ambient_spill", 0.12 if is_fire_scene else 0.07))
                    fg_arr[..., :3] = np.where(opaque[..., None], fg_arr[..., :3] * (1 - spill) + ambient * spill, fg_arr[..., :3])
                    fg_arr[..., :3] = np.clip(fg_arr[..., :3], 0, 255)

            foreground = Image.fromarray(fg_arr.astype(np.uint8), "RGBA")

            if _has_fire_or_burning(prompt) and kwargs.get("fire_uplight", True):
                fus = float(kwargs.get("fire_uplight_strength", 0.28 if is_fire_scene else 0.18))
                foreground = _apply_fire_uplight_to_foreground(foreground, fus)

            # 4. Grounding (Stance)
            if _resolve_fg_auto_ground(prompt, kwargs):
                target_y = float(kwargs.get("fg_ground_target", 0.90))
                foreground = _align_foreground_center_stance_to_fraction(foreground, target_y)

            shadow_layer = Image.new("RGBA", background.size, (0, 0, 0, 0))
            if kwargs.get("draw_shadow", True):
                alpha = np.array(foreground.split()[-1], dtype=np.float32)
                shadow_mask = np.zeros_like(alpha)
                max_drop = max(8, int(background.height * 0.08))
                for x in range(alpha.shape[1]):
                    col = alpha[:, x]
                    nz = np.where(col > 12)[0]
                    if nz.size > 0:
                        y_contact = nz[-1]
                        for dy in range(1, max_drop):
                            y_shadow = y_contact + dy
                            if y_shadow < alpha.shape[0]:
                                strength = (1.0 - (dy / max_drop)) ** 1.5
                                shadow_mask[y_shadow, x] = max(shadow_mask[y_shadow, x], 180 * strength)
                shadow_image = Image.fromarray(shadow_mask.astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(radius=max(2, background.width // 200)))
                shadow_layer = Image.merge("RGBA", (Image.new("L", background.size, 0), Image.new("L", background.size, 0), Image.new("L", background.size, 0), shadow_image))

            background.paste(shadow_layer, (0, 0), shadow_layer)

            if kwargs.get("draw_reflection", True):
                alpha_arr = np.array(foreground.split()[-1], dtype=np.float32)
                nz_rows = np.where(alpha_arr.max(axis=1) > 12)[0]
                if nz_rows.size > 0:
                    car_bottom_y = int(nz_rows[-1])
                    refl_height = max(12, (car_bottom_y - int(nz_rows[0])) // 6)
                    refl_src = foreground.crop((0, car_bottom_y - refl_height, foreground.width, car_bottom_y))
                    refl_strip = refl_src.transpose(Image.FLIP_TOP_BOTTOM)
                    refl_arr = np.array(refl_strip, dtype=np.float32)
                    fade = np.linspace(0.35, 0.0, refl_height).reshape(refl_height, 1)
                    refl_arr[..., 3] = np.clip(refl_arr[..., 3] * fade, 0, 255)
                    refl_img = Image.fromarray(refl_arr.astype(np.uint8), "RGBA")
                    if car_bottom_y + refl_height <= background.height:
                        background.paste(refl_img, (0, car_bottom_y), refl_img)

            if kwargs.get("env_edge_glow", True):
                is_fire = _has_fire_or_burning(prompt)
                env_glow = _apply_environment_edge_glow(
                    foreground, background,
                    intensity=float(kwargs.get("glow_intensity", 0.55 if is_fire else 0.40)),
                    glow_spread=int(kwargs.get("glow_spread", 14 if is_fire else 10)),
                    fire_override=is_fire,
                )
                background.paste(env_glow, (0, 0), env_glow)

            final_image = Image.alpha_composite(background, foreground).convert("RGB")
            img_byte_arr = io.BytesIO()
            final_image.save(img_byte_arr, format="JPEG", quality=95)
            raw_bytes = img_byte_arr.getvalue()
            blend_hint = (kwargs.get("user_prompt") or prompt or "").strip() or prompt
            blended = await self._blend_composite_with_flux(raw_bytes, blend_hint, **kwargs)
            return blended if blended else raw_bytes

        except Exception as e:
            logger.warning(f"[{self.name}] Composite pipeline sub-pass failed: {e}")
            return None
    async def text_to_video(self, prompt: str, duration_seconds: int = 5, **kwargs) -> GenerationResult:
        """
        Generates video from text using Luma Dream Machine on Fal.ai.
        """
        logger.info(f"[{self.name}] Starting text_to_video. Prompt: {prompt[:100]}...")
        try:
            handler = await asyncio.to_thread(
                fal_client.submit, "fal-ai/luma-dream-machine",
                arguments={"prompt": prompt, "aspect_ratio": "16:9", "loop": False}
            )
            result = await asyncio.to_thread(handler.get)
            
            if result and "video" in result:
                return GenerationResult(success=True, media_url=result["video"]["url"], model_name=self.name)
            
            return GenerationResult(success=False, error_message="No video URL in result", model_name=self.name)
        except Exception as e:
            logger.error(f"[{self.name}] text_to_video failed: {str(e)}")
            return GenerationResult(success=False, error_message=str(e), model_name=self.name)

    async def image_to_video(self, image_url: str, prompt: str, duration_seconds: int = 5, **kwargs) -> GenerationResult:
        """
        Generates video from an image using Luma on Fal.ai.
        """
        logger.info(f"[{self.name}] Starting image_to_video. Image: {image_url}")
        try:
            public_image_url = await self._ensure_public_url(image_url)
            handler = await asyncio.to_thread(
                fal_client.submit, "fal-ai/luma-dream-machine/image-to-video",
                arguments={"prompt": prompt, "image_url": public_image_url}
            )
            result = await asyncio.to_thread(handler.get)
            if result and "video" in result:
                return GenerationResult(success=True, media_url=result["video"]["url"], model_name=self.name)
            return GenerationResult(success=False, error_message="No video URL in result", model_name=self.name)
        except Exception as e:
            logger.error(f"[{self.name}] image_to_video failed: {str(e)}")
            return GenerationResult(success=False, error_message=str(e), model_name=self.name)

    async def video_to_video(self, video_url: str, prompt: str, duration_seconds: int = 5, **kwargs) -> GenerationResult:
        """
        Transforms a video using Kling Video on Fal.ai.
        """
        logger.info(f"[{self.name}] Starting video_to_video. Video: {video_url}")
        try:
            public_video_url = await self._ensure_public_url(video_url)
            handler = await asyncio.to_thread(
                fal_client.submit, "fal-ai/kling-video/v1/standard/video-to-video",
                arguments={
                    "video_url": public_video_url,
                    "prompt": prompt,
                    "negative_prompt": "blurry, low quality",
                }
            )
            result = await asyncio.to_thread(handler.get)
            if result and "video" in result:
                return GenerationResult(success=True, media_url=result["video"]["url"], model_name=self.name)
            return GenerationResult(success=False, error_message="No video URL in result", model_name=self.name)
        except Exception as e:
            logger.error(f"[{self.name}] video_to_video failed: {str(e)}")
            return GenerationResult(success=False, error_message=str(e), model_name=self.name)

    async def check_status(self, job_id: str) -> Dict[str, Any]:
        """Placeholder for status checking if using async submission."""
        return {"status": "completed"}

    async def health_check(self) -> bool:
        """Verify the model API is accessible and configured."""
        settings = get_settings()
        is_ok = bool(settings.fal_key)
        if not is_ok:
            logger.error(f"[{self.name}] Health check failed: FAL_KEY missing")
        return is_ok
