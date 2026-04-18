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

# FLUX.1 [schnell] is trained for very few steps; higher values can fail validation or error on fal.
_SCHNELL_MAX_INFERENCE_STEPS = 4

# Appended to fire/action background plates (subject is composited later — plate must be environment-only).
_PREMIUM_FIRE_PLATE_SUFFIX = (
    "Hollywood-grade explosion VFX plate: razor-sharp volumetric fireballs, dense turbulent smoke, embers, "
    "heat shimmer, dramatic rim and bounce light on asphalt, IMAX contrast, HDR, 8K micro-detail, "
    "physically plausible practical-effects look — empty center for compositing; absolutely no products, "
    "people, packaging, props, vehicles, or main subjects in frame."
)

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


def _strip_watermark_instructions_for_generation(text: str) -> str:
    """
    Strip watermark/branding instructions before sending to Flux so the model does not paint
    garbled text or fake URLs; we add a clean watermark in post.
    """
    t = text
    t = re.sub(
        r",?\s*add\s+(?:metallic\s+)?[\"'\u201c][^\"'\u201d]+[\"'\u201d]\s+watermark[^,.\n]*(?:bottom\s+(?:right|left|center)[^,.\n]*)?",
        "",
        t,
        flags=re.I,
    )
    t = re.sub(r",?\s*add\s+[\"']?[\w\s]+[\"']?\s+watermark[^,.\n]*", "", t, flags=re.I)
    t = re.sub(r",?\s*watermark\s+bottom\s+(?:right|left|center)[^,.\n]*", "", t, flags=re.I)
    t = re.sub(r",?\s*with\s+watermark[^,.\n]*", "", t, flags=re.I)
    t = re.sub(
        r",?\s*add\s+[^,\n]{0,120}\bwatermark\b[^,\n]{0,100}",
        "",
        t,
        flags=re.I,
    )
    t = re.sub(r"\s+,", ",", t)
    t = re.sub(r",\s*,+", ",", t)
    return t.strip(" ,\t\n").strip(",")


def _sanitize_watermark_draw_text(wm: Optional[str]) -> Optional[str]:
    """Deduplicate glitched doubles; drop fake URLs."""
    if not wm:
        return None
    s = " ".join(wm.split())
    if re.search(r"www\.|https?://", s, re.I):
        return None
    if len(s) >= 8 and len(s) % 2 == 0:
        h = len(s) // 2
        if s[:h] == s[h:]:
            s = s[:h].strip()
    elif len(s) >= 16 and s[: len(s) // 2] == s[len(s) // 2 :]:
        s = s[: len(s) // 2].strip()
    low = s.lower()
    if "countrylink" in low:
        return "COUNTRYLINK"
    return s[:48]


def _watermark_corner_from_prompt(user_prompt: str) -> str:
    """Where to draw programmatic watermark: 'right' | 'center'."""
    low = user_prompt.lower()
    if re.search(r"watermark.*bottom\s+right|bottom\s+right.*watermark", low):
        return "right"
    return "center"


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
        "Hot orange glow reflecting on dark WET asphalt with subtle mirror reflections and scattered pebbles. "
        "Shallow depth of field: background flames and smoke soft and creamy (bokeh), ground plane sharp near camera. "
        "Center of frame: dark asphalt/ground surface only, absolutely NO fire or flames in the center ground. "
        "Center must be clear open floor space for compositing the subject. "
        "Camera angle: slightly low, eye-level to the ground. "
        "No products, people, packaging, props, vehicles, duplicate object silhouettes, or floating parts. "
        "No single isolated fire blob under the center. Pure atmospheric environment plate."
    )


def _anti_phantom_subject_hint() -> str:
    return (
        "CRITICAL: no ghost or duplicate product shapes, floating parts, or extra objects. "
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
    Toys / miniatures / small collectibles: direct img2img often reskins the subject.
    Triggers an extra prompt lock on the direct path (composite still handles all products via preserve_subject).
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
        "figurine",
        "action figure",
        "funko",
        "statuette",
        "pvc figure",
        "blind box",
    )
    if any(m in low for m in markers):
        return True
    if re.search(r"\b1\s*[/:]\s*(18|24|32|43|64)\b", low):
        return True
    return False


def _wants_cinematic_redraw(prompt: str) -> bool:
    """User explicitly wants a full subject/scene redraw (hero shot, different product, concept look)."""
    low = prompt.lower()
    phrases = (
        "cinematic redraw",
        "full cgi redesign",
        "completely different car",
        "different vehicle",
        "not the same car",
        "redesign the car",
        "concept car",
        "change the car",
        "swap the car",
        "different model car",
        "ignore the upload car",
        "completely different product",
        "different product",
        "replace the product",
        "swap the product",
        "redesign the product",
        "ignore the upload",
        "new hero product",
    )
    return any(p in low for p in phrases)


def _wants_structural_showcase_redraw(prompt: str) -> bool:
    """
    Exploded view, open panels, or interior visibility need a full img2img — composite (same cutout) cannot do it.
    """
    low = prompt.lower()
    markers = (
        "exploded view",
        "exploded-view",
        "doors open",
        "door open",
        "hood open",
        "bonnet open",
        "trunk open",
        "boot open",
        "interior visible",
        "show interior",
        "open interior",
        "dashboard visible",
        "cutaway",
        "cut-away",
        "cross section",
        "cross-section",
        "engineering showcase",
        "engineering look",
        "engineering visualization",
        "floating parts",
        "parts separated",
        "components separated",
        "suspended parts",
        "disassembled",
        "assembly diagram",
    )
    if any(m in low for m in markers):
        return True
    if "engineering" in low and any(x in low for x in ("showcase", "high detail", "high-detail", "diagram")):
        return True
    return False


_STRUCTURAL_SHOWCASE_DIECAST = (
    "Diecast or scale-model ENGINEERING exploded diagram: you MUST open hood and doors as requested and show interior "
    "detail. Separate real vehicle assemblies from THIS car only — front bumper cover, hood, doors, trunk/boot lid, "
    "wheels with brakes visible, rear wing — each part clearly from the same model as the source photo. "
    "When the prompt asks for exploded or floating layout, show several major modules separated with clear air gaps "
    "(aim for multiple distinct pieces, not a single loose fragment). "
    "Gaps between parts like a factory service manual exploded illustration. "
)

_STRUCTURAL_EXPLODED_NEGATIVE = (
    "Do NOT add random foam, tools, electronics, or unrelated accessories above the roof or on the floor. "
    "Do NOT render watermarks, fake URLs, or marketing copy in the image — leave the image text-free for post-production. "
)

_STRUCTURAL_SHOWCASE_GENERIC = (
    "Product visualization: follow the prompt for open panels, exploded or floating parts, and clean studio background. "
)

_STRUCTURAL_SHOWCASE_TAIL = (
    "Seamless bright white or very light gray cyclorama, soft even product lighting, subtle floor shadow, "
    "premium catalog / press-kit quality, photorealistic. Keep the same vehicle model identity and badging family as "
    "the source; do not substitute a different car. License plate: leave blank or an unobtrusive soft blur — "
    "do not invent random letters or numbers on plates."
)


def _coerce_bool_opt(value: Any, default: bool) -> bool:
    """Celery/JSON sometimes yields strings."""
    if value is None:
        return default
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return bool(value)


_DIRECT_SUBJECT_IDENTITY_GUARD = (
    "Keep the exact same product or object as the source image: identical silhouette, proportions, materials, "
    "surface colors, printed text, logos, and geometry — do not substitute a different item, SKU, or generic hero render."
)

_TEXT_INTEGRITY_GUARD = (
    "Do not add, replace, erase, or hallucinate any text, license plate, sticker, decal, or badge. "
    "Keep existing lettering exactly as in the source; if it was unreadable, leave it soft or blurred — never invent characters or gibberish."
)


def _hero_cinematic_environment_clause(user_prompt: str) -> str:
    """Extra prompt for hero reframe: match fire-poster refs vs general hero framing."""
    if _has_fire_or_burning(user_prompt) or _is_action_fx_scene(user_prompt):
        return (
            "Premium fire-poster / movie-ad look: intense volumetric flames and smoke, dark gritty or wet asphalt "
            "with pebbles and crisp reflections, orange rim light and warm bounce on bodywork, glowing headlights if they "
            "appear in the source, shallow depth of field bokeh on the background, high contrast. "
        )
    return (
        "Premium automotive hero framing: cohesive dramatic lighting, believable ground plane and reflections, "
        "shallow depth of field, high-end magazine or showroom-ad quality. "
    )


def _miniature_subject_style_lock(prompt: str) -> str:
    """Extra lock for toys/miniatures on the direct img2img path."""
    if not _wants_preserve_exact_product(prompt):
        return ""
    return (
        "CRITICAL: this is a small-scale toy, replica, or collectible — not a full-size real object. "
        "Preserve miniature proportions, molded detail, and replica surface finish; only add scene lighting and effects."
    )


def _feather_rgba_edges(img: Image.Image, radius: float = 1.15) -> Image.Image:
    """Soften alpha edges slightly so composites don't read as a hard sticker cutout."""
    arr = np.array(img.convert("RGBA"), dtype=np.float32)
    a = arr[:, :, 3]
    pil_a = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "L")
    blurred = np.asarray(pil_a.filter(ImageFilter.GaussianBlur(radius=radius)), dtype=np.float32)
    arr[:, :, 3] = np.clip(blurred, 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def _defringe_rgba_edges(
    img: Image.Image,
    pull: float = 0.74,
    bottom_extra: float = 1.32,
) -> Image.Image:
    """
    Pull semi-transparent edge RGB toward luminance to kill colored halos from rembg
    (orange/red fringes under splitters, wheels, and ground contact).
    """
    arr = np.array(img.convert("RGBA"), dtype=np.float32)
    a = arr[:, :, 3] / 255.0
    rgb = arr[:, :, :3]
    lum = 0.299 * rgb[:, :, 0] + 0.587 * rgb[:, :, 1] + 0.114 * rgb[:, :, 2]
    lum3 = np.stack([lum, lum, lum], axis=-1)
    w = np.clip(1.0 - a, 0, 1) ** 0.82
    mid = (a > 0.04) & (a < 0.985)
    w = np.where(mid, np.maximum(w, 0.24 * pull), w)
    w = np.clip(w * pull, 0, 1)
    row_hit = np.any(a > 0.08, axis=1)
    if row_hit.any():
        ys = np.where(row_hit)[0]
        y0, y1 = int(ys[0]), int(ys[-1])
        span = max(y1 - y0, 1)
        y_idx = np.arange(arr.shape[0], dtype=np.float32)[:, np.newaxis]
        lower = (y_idx >= float(y0) + span * 0.60).astype(np.float32)
        w = np.clip(w * (1.0 + (bottom_extra - 1.0) * lower), 0, 1)
    out_rgb = rgb * (1.0 - w[..., None]) + lum3 * w[..., None]
    arr[:, :, :3] = np.clip(out_rgb, 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def _polish_preserved_composite(
    img_rgb: Image.Image,
    fg_rgba: Image.Image,
    fire_scene: bool,
    warm_bounce_strength: float = 0.07,
) -> Image.Image:
    """
    Non-generative finish: scene color onto the subject silhouette + mild sharpen.
    Does not redraw geometry — same subject pixels as the rembg cutout.
    """
    rgb = img_rgb.convert("RGB")
    fg_a = np.array(fg_rgba.split()[-1], dtype=np.float32)
    h, w = fg_a.shape
    mask = fg_a > 12.0
    if not np.any(mask):
        return rgb

    arr = np.array(rgb, dtype=np.float32)
    row_fg_frac = mask.mean(axis=1)
    candidates = np.where((row_fg_frac < 0.05) & (np.arange(h) > h * 0.48))[0]
    if fire_scene and candidates.size > 0:
        y_strip = int(candidates.min())
        strip = arr[y_strip:, :, :].reshape(-1, 3)
        if strip.size > 0:
            warm = strip.mean(axis=0)
            ys = np.where(mask)[0]
            y0c, y1c = int(ys.min()), int(ys.max())
            band_y0 = int(y0c + (y1c - y0c) * 0.50)
            yy = np.arange(h, dtype=np.float32)[:, np.newaxis]
            lower_body = mask & (yy >= band_y0)
            bump = np.zeros_like(arr)
            bump[lower_body] = warm * warm_bounce_strength
            arr = np.clip(arr + bump, 0.0, 255.0)

    out = Image.fromarray(arr.astype(np.uint8), "RGB")
    try:
        out = out.filter(ImageFilter.UnsharpMask(radius=1.0, percent=42, threshold=2))
    except Exception:
        out = ImageEnhance.Sharpness(out).enhance(1.11)

    # Lateral fire tint on upper subject (e.g. hood, bottle shoulder, top of packaging) from frame edges
    if fire_scene:
        side_w = max(2, w // 22)
        post = np.array(out, dtype=np.float32)
        left = post[:, :side_w, :].reshape(-1, 3)
        right = post[:, -side_w:, :].reshape(-1, 3)
        if left.size and right.size:
            warm_side = (left.mean(axis=0) + right.mean(axis=0)) * 0.5
            ys_c = np.where(mask)[0]
            y0c, y1c = int(ys_c.min()), int(ys_c.max())
            yy = np.arange(h, dtype=np.float32)[:, np.newaxis]
            upper = mask & (yy <= int(y0c + (y1c - y0c) * 0.62))
            bump = np.zeros_like(post)
            bump[upper] = warm_side * float(np.clip(warm_bounce_strength * 0.65, 0.03, 0.09))
            post = np.clip(post + bump, 0.0, 255.0)
            out = Image.fromarray(post.astype(np.uint8), "RGB")

    return out


def _enhance_preserved_cutout(fg_rgba: Image.Image, is_fire: bool) -> Image.Image:
    """
    Same silhouette and pixels: premium gloss, fire-touched highlights, subtle specular glow on bright top-front areas.
    """
    arr = np.array(fg_rgba.convert("RGBA"), dtype=np.float32)
    a = arr[:, :, 3]
    m = a > 12.0
    if not np.any(m):
        return fg_rgba
    h, w = a.shape
    rgb = arr[:, :, :3].copy()
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    hl = np.clip((lum - 95.0) / 160.0, 0.0, 1.0) ** 1.55
    gain = 1.0 + 0.15 * hl
    rgb = rgb * gain[..., None]
    if is_fire:
        rgb[..., 0] = np.clip(rgb[..., 0] + hl * 24.0, 0, 255)
        rgb[..., 1] = np.clip(rgb[..., 1] + hl * 11.0, 0, 255)
    ys, xs = np.where(m)
    y0, y1 = int(ys.min()), int(ys.max())
    top_cut = int(y0 + (y1 - y0) * 0.44)
    yy = np.arange(h, dtype=np.float32)[:, np.newaxis]
    lum2 = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    bright = m & (yy <= top_cut) & (lum2 > 118.0)
    rgb[..., 0] = np.where(bright, np.clip(rgb[..., 0] + 28.0, 0, 255), rgb[..., 0])
    rgb[..., 1] = np.where(bright, np.clip(rgb[..., 1] + 16.0, 0, 255), rgb[..., 1])
    rgb[..., 2] = np.where(bright, np.clip(rgb[..., 2] + 4.0, 0, 255), rgb[..., 2])
    arr[:, :, :3] = np.where(m[..., None], np.clip(rgb, 0, 255), arr[:, :, :3])
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
    """Shift opaque pixels down by dy; top clears to transparent. Helps subject base meet the ground plane."""
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
    Like bottom align but uses lowest row in the central band (footprint), not a protruding front edge.
    Reduces one corner floating when the lowest point is off-center on the subject.
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
    Stops Flux from leaving phantom shapes or localized fire blobs behind the composite.
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
    anti_phantom = _anti_phantom_subject_hint() if (action_fx or _has_fire_or_burning(user_prompt)) else ""

    if action_fx:
        guard = (
            "Photorealistic full-bleed atmospheric plate. "
            "Strict: no products, items, packaging, props, people, vehicles, toys, or main subjects. "
            "No logos, brand names, or readable watermark text in the scene. "
            "Show only environment: lighting, flames, smoke, sparks, haze, ground, and mood as described."
        )
    else:
        guard = (
            "Photorealistic scene plate only. "
            "Do not draw any product, item, packaging, toy, prop, person, or text. "
            "Leave a clear ground plane in the lower/middle area for compositing one subject."
        )
    full = f"{scene.rstrip('.')}. {scale_hint}{fire_extra} {anti_phantom} {guard}".strip()
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


def _draw_watermark_road_surface(
    img: Image.Image, text: str, align: str = "center"
) -> None:
    if img.mode != "RGB":
        img = img.convert("RGB")
    w, h = img.size
    draw = ImageDraw.Draw(img)
    font_size = max(16, int(min(w, h) * 0.042))
    font = _get_font(font_size, bold=True)

    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    margin = max(12, int(w * 0.028))
    if align == "right":
        x = w - tw - margin
    else:
        x = (w - tw) // 2
    y = min(int(h * 0.90), h - th - 8)

    for dx, dy in ((2, 2), (1, 1)):
        draw.text((x + dx, y + dy), text, font=font, fill=(15, 15, 20))
    draw.text((x, y), text, font=font, fill=(230, 232, 238))


def _draw_watermark_metallic(
    img: Image.Image,
    text: str,
    on_road: bool = True,
    warm_glow: bool = False,
    align: str = "center",
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
    margin = max(12, int(w * 0.028))
    if align == "right":
        x = w - tw - margin
    else:
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
        If it's a localhost/internal URL, fetch bytes locally then upload to Fal's CDN.
        """
        if not url:
            return ""

        is_internal = any(x in url for x in ["localhost", "127.0.0.1", "172.", "10."]) or url.startswith("/")

        if is_internal:
            logger.info(f"[{self.name}] Internal URL detected: {url}. Promoting to Fal storage...")
            # Rewrite public URL to the storage endpoint so we can fetch it from inside the worker.
            # STORAGE_ENDPOINT is the address boto3 / internal services use to reach MinIO
            # (e.g. http://127.0.0.1:9000 or http://minio:9000).  Use that origin for the fetch.
            settings = get_settings()
            try:
                from urllib.parse import urlparse, urlunparse
                parsed_src = urlparse(url)
                parsed_ep = urlparse(settings.storage_endpoint)
                # Swap origin only; keep path, query, fragment intact
                fetch_url = urlunparse((
                    parsed_ep.scheme,
                    parsed_ep.netloc,
                    parsed_src.path,
                    parsed_src.params,
                    parsed_src.query,
                    parsed_src.fragment,
                ))
                async with self._get_client() as client:
                    resp = await client.get(fetch_url)
                    resp.raise_for_status()
                    data = resp.content

                # Detect content type from URL extension for correct Fal upload
                path_lower = parsed_src.path.lower()
                ct = "image/jpeg" if path_lower.endswith((".jpg", ".jpeg")) else "image/png"
                public_url = await asyncio.to_thread(fal_client.upload, data, ct)
                logger.info(f"[{self.name}] Promoted to Fal CDN: {public_url}")
                return public_url
            except Exception as e:
                logger.error(f"[{self.name}] Failed to promote internal URL: {str(e)}")
                # Fallback: return original URL (will fail for truly private hosts, but safe for dev)
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
            _steps = max(
                1,
                min(int(kwargs.get("steps", 4)), _SCHNELL_MAX_INFERENCE_STEPS),
            )
            arguments = {
                "prompt": prompt,
                "image_size": kwargs.get("image_size", "square"),
                "num_inference_steps": _steps,
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
        Hybrid pipeline (Fal.ai) for any product/subject:
        1. Route: exploded view / open doors / interior / engineering showcase → DIRECT (structural redraw).
           preserve_subject + hero_cinematic_reframe → DIRECT hero. Else preserve_subject → composite + optional blend.
           cinematic_redraw → full direct reskin. force_direct forces direct.
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
            preserve_pixels = _wants_preserve_exact_product(routing_prompt)
            preserve_subject = _coerce_bool_opt(kwargs.get("preserve_subject"), True)
            cinematic = _coerce_bool_opt(kwargs.get("cinematic_redraw"), False) or _wants_cinematic_redraw(
                routing_prompt
            )
            structural = _wants_structural_showcase_redraw(routing_prompt)
            if structural:
                kwargs["structural_showcase_redraw"] = True
            hero_reframe = (
                _coerce_bool_opt(kwargs.get("hero_cinematic_reframe"), False)
                and not cinematic
                and not structural
            )

            if kwargs.get("force_direct") or cinematic or hero_reframe or structural:
                use_composite = False
            else:
                use_composite = (
                    _wants_composite_plate(routing_prompt, kwargs)
                    or preserve_pixels
                    or preserve_subject
                )
            use_direct = not use_composite
            if structural:
                mode_name = "DIRECT structural showcase (flux dev)"
            elif hero_reframe:
                mode_name = "DIRECT hero reframe (flux dev)"
            elif use_direct:
                mode_name = "DIRECT (flux dev img2img)"
            else:
                mode_name = "COMPOSITE (rembg + plate)"
            logger.info(
                f"[{self.name}] Stage 1: {mode_name} "
                f"(preserve_subject={preserve_subject}, preserve_pixels={preserve_pixels}, "
                f"cinematic={cinematic}, hero_reframe={hero_reframe}, structural={structural})"
            )

            if use_composite and (preserve_pixels or preserve_subject):
                kwargs["tight_subject_blend"] = True
                # Fire/action: one moderate flux-dev pass merges lighting and kills the "sticker" look (like a hero ad),
                # without full cinematic_redraw (which replaces the whole car). Toys need lower strength.
                dramatic = _has_fire_or_burning(routing_prompt) or _is_action_fx_scene(routing_prompt)
                if kwargs.get("composite_flux_blend") is None:
                    kwargs["composite_flux_blend"] = bool(dramatic)
                if kwargs.get("composite_blend_strength") is None:
                    kwargs["composite_blend_strength"] = (
                        0.58 if preserve_pixels else 0.72
                    ) if dramatic else 0.88
                if kwargs.get("composite_blend_steps") is None:
                    kwargs["composite_blend_steps"] = 20 if dramatic else 24
                if kwargs.get("composite_blend_guidance") is None and dramatic:
                    kwargs["composite_blend_guidance"] = 3.2
                if _has_fire_or_burning(routing_prompt) and kwargs.get("fire_uplight") is None:
                    kwargs["fire_uplight"] = True
                if dramatic and kwargs.get("fire_uplight_strength") is None:
                    kwargs["fire_uplight_strength"] = 0.30 if preserve_pixels else 0.38
                if dramatic and kwargs.get("warm_bounce_strength") is None:
                    kwargs["warm_bounce_strength"] = 0.11
                if dramatic and kwargs.get("feather_radius") is None:
                    kwargs["feather_radius"] = 1.38
                if dramatic:
                    logger.info(
                        f"[{self.name}] Dramatic scene: composite_flux_blend="
                        f"{kwargs.get('composite_flux_blend')} strength="
                        f"{kwargs.get('composite_blend_strength')}"
                    )

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
            wm = _sanitize_watermark_draw_text(wm)
            wm_align = _watermark_corner_from_prompt(wm_source)
            if wm:
                logger.info(f"[{self.name}] Stage 4: Applying watermark '{wm}' align={wm_align}")
                if kwargs.get("watermark_metallic", wm_metallic):
                    _draw_watermark_metallic(
                        final_image,
                        str(wm),
                        warm_glow=_has_fire_or_burning(wm_source),
                        align=wm_align,
                    )
                else:
                    _draw_watermark_road_surface(final_image, str(wm), align=wm_align)
            
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

            structural = _coerce_bool_opt(kwargs.get("structural_showcase_redraw"), False) or _wants_structural_showcase_redraw(
                creative
            )
            hero = _coerce_bool_opt(kwargs.get("hero_cinematic_reframe"), False) and not structural

            if structural:
                flux_user = _strip_watermark_instructions_for_generation(creative)
                struct_body = (
                    _STRUCTURAL_SHOWCASE_DIECAST
                    if _wants_preserve_exact_product(creative)
                    else _STRUCTURAL_SHOWCASE_GENERIC
                )
                core = (
                    f"{flux_user}. {_DIRECT_SUBJECT_IDENTITY_GUARD} {_TEXT_INTEGRITY_GUARD} "
                    f"{struct_body}{_STRUCTURAL_EXPLODED_NEGATIVE}{_STRUCTURAL_SHOWCASE_TAIL}"
                )
                strength = float(kwargs.get("img2img_strength", 0.94))
                steps = int(kwargs.get("img2img_steps", 48))
                full_prompt = (
                    f"{core} "
                    "Photorealistic, ultra sharp, studio catalog resolution. "
                    "Execute every structural instruction: open panels, show interior, exploded spacing — exactly as the user asked."
                )
            else:
                mini_lock = _miniature_subject_style_lock(creative)
                core = f"{creative}. {_DIRECT_SUBJECT_IDENTITY_GUARD} {_TEXT_INTEGRITY_GUARD}"
                if mini_lock:
                    core = f"{core} {mini_lock}"

                if hero:
                    env_clause = _hero_cinematic_environment_clause(creative)
                    d_strength = 0.84 if _wants_preserve_exact_product(creative) else 0.88
                    strength = float(kwargs.get("img2img_strength", d_strength))
                    steps = int(kwargs.get("img2img_steps", 44))
                    full_prompt = (
                        f"{core} "
                        f"{env_clause}"
                        "Photorealistic, ultra detailed. You may move the camera to a dramatic hero angle "
                        "(low front, straight-on, or strong three-quarter) like a blockbuster car poster — "
                        "but keep this exact same vehicle: body kit, wheels, spoiler, paint, badges, and scale. "
                        "Apply the full scene, lighting, and effects from the prompt. "
                        "Do not replace the subject with a different car, color, or generic render."
                    )
                else:
                    strength = float(kwargs.get("img2img_strength", 0.95))
                    steps = int(kwargs.get("img2img_steps", 40))
                    full_prompt = (
                        f"{core} "
                        "Cinematic product photography, photorealistic, ultra detailed. "
                        "Apply the full scene, lighting, and effects described. "
                        "Keep the same subject as the source; do not replace it with a different product or object."
                    )

            default_guidance = 3.65 if structural else 3.5
            guidance = float(kwargs.get("guidance_scale", default_guidance))

            handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/flux/dev/image-to-image",
                arguments={
                    "image_url": image_url,
                    "prompt": full_prompt,
                    "strength": strength,
                    "num_inference_steps": steps,
                    "guidance_scale": guidance,
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
        unified lighting, haze, wet-ground contact (moderate strength so the upload subject is not reskinned).
        """
        if not kwargs.get("composite_flux_blend", True):
            return None
        try:
            public_url = await asyncio.to_thread(fal_client.upload, image_jpeg, "image/jpeg")
            tight = bool(kwargs.get("tight_subject_blend"))
            subject_clause = (
                "Do not change the subject's shape, materials, labels, logos, colors, gloss, or structural details. "
                "Only adjust global lighting, atmospheric haze, shadows, and edge integration. "
                if tight
                else "Keep the subject identity, pose, scale, and proportions exactly as shown."
            )
            mini_lock = _miniature_subject_style_lock(routing_prompt)
            dramatic_bg = _has_fire_or_burning(routing_prompt) or _is_action_fx_scene(routing_prompt)
            if dramatic_bg:
                hero_integrate = (
                    "Cinematic automotive-ad finish: warm orange firelight raking across the subject, "
                    "coherent specular highlights matching the flames, wet dark asphalt with soft reflections, "
                    "background fire and smoke out of focus (bokeh). "
                )
                light_line = (
                    "Match fire and ambient light on the product with natural color bounce, soft shadows at ground contact, "
                    "atmospheric haze, shallow depth of field. Remove orange/red fringing and hard compositing edges. "
                )
            else:
                hero_integrate = (
                    "Photoreal integration: match the environment key and fill light already in the plate, "
                    "coherent reflections on glossy surfaces, believable showroom or garage depth of field. "
                )
                light_line = (
                    "Match ambient light on the product with natural color bounce, tight contact shadows at tire patches, "
                    "shallow depth of field. Remove colored fringes and halos at ground contact. "
                )
            blend_prompt = (
                f"{routing_prompt[:480]}. "
                f"{hero_integrate}"
                "One seamless photoreal photograph — not a collage or layered cutout. "
                f"{light_line}"
                f"{subject_clause} {_TEXT_INTEGRITY_GUARD}"
            )
            if mini_lock:
                blend_prompt = f"{blend_prompt} {mini_lock}"
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
                logger.warning(
                    f"[{self.name}] rembg missing image in response: {rembg_result!r:.1200}"
                )
                return None

            transparent_url = rembg_result["image"]["url"]
            async with self._get_client() as client:
                fg_bytes = (await client.get(transparent_url)).content
            foreground = Image.open(io.BytesIO(fg_bytes)).convert("RGBA")
            is_fire_scene = _has_fire_or_burning(prompt) or _is_action_fx_scene(prompt)
            if kwargs.get("feather_fg_edges", True):
                foreground = _feather_rgba_edges(foreground, radius=float(kwargs.get("feather_radius", 1.15)))
            if kwargs.get("defringe_fg_edges", True):
                foreground = _defringe_rgba_edges(
                    foreground,
                    pull=float(kwargs.get("defringe_pull", 0.76 if is_fire_scene else 0.70)),
                    bottom_extra=float(kwargs.get("defringe_bottom_extra", 1.38 if is_fire_scene else 1.28)),
                )

            if is_fire_scene and kwargs.get("ambient_spill_enabled") is None:
                kwargs["ambient_spill_enabled"] = True

            # 2. Generate Background Environment
            bg_prompt, _, _ = _build_full_background_prompt(prompt)
            if kwargs.get("premium_cinematic_plate", True) and is_fire_scene:
                bg_prompt = f"{bg_prompt.rstrip()} {_PREMIUM_FIRE_PLATE_SUFFIX}"
            # Quality for fire plates: larger preset (square_hd); Schnell stays at ≤4 steps.
            _raw_bg_steps = int(kwargs.get("bg_steps", 4))
            bg_steps = max(1, min(_raw_bg_steps, _SCHNELL_MAX_INFERENCE_STEPS))
            if _raw_bg_steps > _SCHNELL_MAX_INFERENCE_STEPS:
                logger.info(
                    f"[{self.name}] capping bg_steps {_raw_bg_steps} → {bg_steps} for fal-ai/flux/schnell"
                )
            if kwargs.get("bg_width") is not None or kwargs.get("bg_height") is not None:
                bg_image_size = {
                    "width": int(kwargs.get("bg_width", 1024 if is_fire_scene else 512)),
                    "height": int(kwargs.get("bg_height", 1024 if is_fire_scene else 512)),
                }
            elif is_fire_scene:
                bg_image_size = kwargs.get("bg_image_size", "square_hd")
            else:
                bg_image_size = {
                    "width": int(kwargs.get("bg_width", 512)),
                    "height": int(kwargs.get("bg_height", 512)),
                }

            bg_handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/flux/schnell",
                arguments={
                    "prompt": bg_prompt[:8000],
                    "image_size": bg_image_size,
                    "num_inference_steps": bg_steps,
                    "guidance_scale": 3.5,
                    "enable_safety_checker": False,
                }
            )
            bg_result = await asyncio.to_thread(bg_handler.get)
            if (
                not bg_result
                or "images" not in bg_result
                or not bg_result["images"]
            ):
                logger.warning(
                    f"[{self.name}] flux schnell (composite bg) missing images: {bg_result!r:.1200}"
                )
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

            if kwargs.get("enhance_preserved_cutout", True):
                foreground = _enhance_preserved_cutout(foreground, is_fire_scene)

            # 4. Grounding (Stance)
            if _resolve_fg_auto_ground(prompt, kwargs):
                target_y = float(kwargs.get("fg_ground_target", 0.90))
                foreground = _align_foreground_center_stance_to_fraction(foreground, target_y)

            shadow_layer = Image.new("RGBA", background.size, (0, 0, 0, 0))
            if kwargs.get("draw_shadow", True):
                alpha = np.array(foreground.split()[-1], dtype=np.float32)
                shadow_mask = np.zeros_like(alpha)
                max_drop = max(10, int(background.height * 0.09))
                for x in range(alpha.shape[1]):
                    col = alpha[:, x]
                    nz = np.where(col > 12)[0]
                    if nz.size > 0:
                        y_contact = int(nz[-1])
                        # Tight contact occlusion (first rows) + softer falloff
                        for dy in range(1, max_drop + 1):
                            y_shadow = y_contact + dy
                            if y_shadow >= alpha.shape[0]:
                                break
                            t = dy / float(max_drop)
                            falloff = (1.0 - t) ** 2.05
                            if dy <= 2:
                                val = min(255, int(245 * falloff + 35))
                            elif dy <= 5:
                                val = min(255, int(210 * falloff + 25))
                            else:
                                val = int(175 * falloff)
                            shadow_mask[y_shadow, x] = max(shadow_mask[y_shadow, x], val)
                blur_r = max(2, background.width // 200)
                shadow_image = Image.fromarray(shadow_mask.astype(np.uint8), "L").filter(
                    ImageFilter.GaussianBlur(radius=blur_r)
                )
                shadow_layer = Image.merge(
                    "RGBA",
                    (
                        Image.new("L", background.size, 0),
                        Image.new("L", background.size, 0),
                        Image.new("L", background.size, 0),
                        shadow_image,
                    ),
                )

            background.paste(shadow_layer, (0, 0), shadow_layer)

            if kwargs.get("draw_reflection", True):
                alpha_arr = np.array(foreground.split()[-1], dtype=np.float32)
                nz_rows = np.where(alpha_arr.max(axis=1) > 12)[0]
                if nz_rows.size > 0:
                    subject_bottom_y = int(nz_rows[-1])
                    refl_height = max(12, (subject_bottom_y - int(nz_rows[0])) // 6)
                    refl_src = foreground.crop(
                        (0, subject_bottom_y - refl_height, foreground.width, subject_bottom_y)
                    )
                    refl_strip = refl_src.transpose(Image.FLIP_TOP_BOTTOM)
                    refl_arr = np.array(refl_strip, dtype=np.float32)
                    fade = np.linspace(0.35, 0.0, refl_height).reshape(refl_height, 1)
                    refl_arr[..., 3] = np.clip(refl_arr[..., 3] * fade, 0, 255)
                    refl_img = Image.fromarray(refl_arr.astype(np.uint8), "RGBA")
                    if subject_bottom_y + refl_height <= background.height:
                        background.paste(refl_img, (0, subject_bottom_y), refl_img)

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
            if kwargs.get("polish_preserved_composite", True):
                final_image = _polish_preserved_composite(
                    final_image,
                    foreground,
                    is_fire_scene,
                    warm_bounce_strength=float(kwargs.get("warm_bounce_strength", 0.07)),
                )
            img_byte_arr = io.BytesIO()
            final_image.save(img_byte_arr, format="JPEG", quality=95)
            raw_bytes = img_byte_arr.getvalue()
            blend_hint = (kwargs.get("user_prompt") or prompt or "").strip() or prompt
            blended = await self._blend_composite_with_flux(raw_bytes, blend_hint, **kwargs)
            return blended if blended else raw_bytes

        except Exception as e:
            logger.exception(f"[{self.name}] Composite pipeline sub-pass failed: {e}")
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
