"""
Fal Adapter — Universal Product Identity Lock for fire/action/rich-env composite scenes.

ROOT CAUSE FIXES FOR BLACK BAND + GHOST CAR ISSUES:
  GHOST-FIX-1  _blend_composite_with_flux strength raised to 0.72 for fire scenes.
               0.52 was too low — it made the car semi-transparent/ghost-like.
               0.72 is the sweet spot: solid car + blended fire lighting.
  GHOST-FIX-2  guidance_scale raised to 3.2 for fire scenes.
               2.5 was too low — the prompt wasn't being followed, causing ghost artifacts.
  BAND-FIX-1   Background plate generation: fire scene now uses a focused prompt that
               guarantees full-frame fire from bottom to top — no dark sky/black band.
               Uses flux/dev with 28 steps for quality fire generation.
  BAND-FIX-2   _fire_scene_bg_prompt(): dedicated function for fire BG, completely
               rewrites the prompt to force full-bleed fire, NO dark sky at top.
  BAND-FIX-3   _PREMIUM_FIRE_PLATE_SUFFIX: rewritten to explicitly forbid dark bands.
  SOLID-FIX-1  _enhance_preserved_cutout: contrast/shadow boost for dark black products
               so they don't look washed out or transparent after fire light blending.
  SOLID-FIX-2  fire_uplight_strength reduced to 0.18 (was 0.34) — prevents over-brightening
               dark black surfaces into orange wash.
  SOLID-FIX-3  warm_bounce_strength reduced to 0.06 (was 0.11) for same reason.
  SEAM-FIX-1   neutralize_bg_under_subject: increased blur radius for fire scenes.
  ALL-FIX      Universal product support: cars, sneakers, bottles, watches, phones,
               bags, perfume, toys — ALL product types covered.
"""

import asyncio
import hashlib
import os
import logging
import traceback
import re
import io
import httpx
import numpy as np
from typing import Any, Dict, List, Optional, Tuple
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

import fal_client
from app.ai_models.base import BaseAIProvider, GenerationResult
from app.config import get_settings

logger = logging.getLogger(__name__)

_SCHNELL_MAX_INFERENCE_STEPS = 4

# BAND-FIX-3: Rewritten to forbid black sky bands at top of frame
_PREMIUM_FIRE_PLATE_SUFFIX = (
    "CRITICAL FRAME FILL: The ENTIRE image from bottom edge to top edge MUST be filled with fire and flames. "
    "NO dark sky. NO black empty areas at top. NO ceiling. "
    "Tall roaring organic flames reaching all the way to the very top edge of the image. "
    "Thick smoke filling the upper half. "
    "Dark gritty asphalt foreground glowing orange from firelight. "
    "Hollywood VFX quality, IMAX HDR, 8K. "
    "Pure environment plate — NO products, vehicles, people, or props."
)

_WM_PATTERNS = [
    re.compile(r'add\s+[^"\'\u201c\u201d]*?["\u201c]([^"\u201d]+)["\u201d]\s+watermark', re.I),
    re.compile(r"add\s+[^\"'\u201c\u201d]*?['\"]([^'\"]+)['\"]\s+watermark", re.I),
    re.compile(r"watermark\s*(?:text|say)?\s*[:=]\s*['\"]?([A-Za-z0-9 _\-]+)", re.I),
    re.compile(r'add\s+(?:bold\s+|metallic\s+|stylish\s+|neon\s+)?["\u201c]?([A-Z][A-Z0-9_\-]{2,})["\u201d]?\s+watermark', re.I),
]

_ACTION_FX_RE = re.compile(
    r"\b(flames?|smoke|smoky|fire\b|burnout|explosion|embers?|sparks?|"
    r"action style|aggressive sporty|sporty vibe)\b",
    re.I,
)
_FIRE_RE = re.compile(r"\b(flames?|fire\b|burnout|burning|embers?|inferno|combustion)\b", re.I)
_RICH_ENV_RE = re.compile(
    r"\b(cyberpunk|neon|luxury\s+garage|garage\s+setup|futuristic|"
    r"city\s+background|urban|rainy|wet\s+floor|ecommerce\s+banner|"
    r"colorful\s+background|vibrant\s+gradient|showroom|race\s+track|"
    r"night\s+city|stadium|mountain|forest|desert|beach|asphalt|colorful|"
    r"cinematic\s+dark|dark\s+background|moody|spotlight\s+from|"
    r"blurred\s+supercars|realistic\s+road|on\s+road)\b",
    re.I,
)

# ---------------------------------------------------------------------------
# Universal subject visual descriptor extraction
# ---------------------------------------------------------------------------
_COLOR_WORDS = (
    "black", "white", "red", "blue", "green", "yellow", "orange", "purple",
    "pink", "grey", "gray", "silver", "gold", "brown", "navy", "teal",
    "cyan", "magenta", "maroon", "beige", "cream", "dark", "matte", "glossy",
    "metallic", "carbon", "transparent", "clear", "rose", "olive", "burgundy",
    "champagne", "nude", "tan", "khaki", "cobalt", "crimson", "ivory",
)

_PRODUCT_CATEGORY_RE = re.compile(
    r"\b("
    r"diecast|scale model|alloy model|model car|toy car|miniature|collectible|"
    r"hot wheels|matchbox|figurine|action figure|funko|statuette|pvc figure|blind box|"
    r"sneaker|shoe|shoes|trainer|trainers|boot|boots|heel|heels|sandal|sandals|"
    r"loafer|loafers|slipper|slippers|footwear|kick|kicks|"
    r"watch|watches|timepiece|handbag|bag|purse|wallet|backpack|tote|clutch|"
    r"sunglasses|glasses|eyewear|hat|cap|belt|jewelry|necklace|bracelet|ring|earring|"
    r"phone|smartphone|iphone|android|laptop|tablet|ipad|headphone|headphones|"
    r"earbuds|airpods|camera|console|gamepad|controller|keyboard|mouse|monitor|"
    r"speaker|smartwatch|wearable|charger|cable|"
    r"perfume|fragrance|cologne|bottle|serum|cream|lotion|lipstick|makeup|"
    r"foundation|palette|skincare|moisturizer|sunscreen|shampoo|conditioner|"
    r"can|tin|jar|box|package|packaging|carton|pouch|sachet|wrapper|"
    r"beverage|drink|soda|juice|water bottle|energy drink|"
    r"chair|sofa|couch|table|lamp|vase|cushion|pillow|mug|cup|bowl|plate|"
    r"candle|diffuser|plant pot|"
    r"toy|ball|helmet|racket|bat|glove|jersey|uniform|equipment|gear|"
    r"product|item|object|gadget|device|accessory|merchandise"
    r")\b",
    re.I,
)

_VEHICLE_MODEL_RE = re.compile(
    r"\b(BMW\s+[A-Za-z0-9]+|Mercedes[\w\s-]*AMG|Ferrari\s+[A-Za-z0-9]+|Lamborghini\s+[A-Za-z0-9]+|"
    r"Porsche\s+[A-Za-z0-9]+|Ford\s+[A-Za-z0-9]+|Toyota\s+[A-Za-z0-9]+|Honda\s+[A-Za-z0-9]+|"
    r"Audi\s+[A-Za-z0-9]+|Nissan\s+[A-Za-z0-9]+|Dodge\s+[A-Za-z0-9]+|"
    r"Chevrolet\s+[A-Za-z0-9]+|Tesla\s+[A-Za-z0-9]+|"
    r"M4\s*Coup[eé]?|M3|M5|GT\d*|GTR|Supra|Mustang|Corvette|Camaro|"
    r"Cybertruck|Huracan|Urus|Aventador|488|SF90|F8|296|Giulia|RS\d[\w]*)\b",
    re.I,
)

_BRAND_RE = re.compile(
    r"\b(Nike|Adidas|Jordan|Yeezy|New Balance|Puma|Reebok|Vans|Converse|"
    r"Apple|Samsung|Sony|Google|OnePlus|Xiaomi|Oppo|Realme|"
    r"Rolex|Omega|Casio|Fossil|Seiko|Tag Heuer|"
    r"Louis Vuitton|Gucci|Prada|Chanel|Dior|Hermes|Versace|Fendi|"
    r"Coca.?Cola|Pepsi|Red Bull|Monster|Heineken|Jack Daniel|"
    r"iPhone\s*\d*|MacBook|AirPods|iPad|"
    r"PlayStation|Xbox|Nintendo|"
    r"Funko|LEGO|Hot Wheels|Matchbox)\b",
    re.I,
)

_SCALE_RE = re.compile(r"\b1\s*[/:]\s*(18|24|32|43|64)\b", re.I)

_FEATURE_PATTERNS: List[Tuple[re.Pattern, str]] = [
    (re.compile(r"\b(rear\s+wing|spoiler|wide\s*body|widebody|aero\s*kit)\b", re.I), "rear wing/spoiler"),
    (re.compile(r"\b(carbon\s+fi?ber|carbon\s+hood|carbon\s+roof)\b", re.I), "carbon fiber trim"),
    (re.compile(r"\b(open\s+hood|open\s+door|doors?\s+open|exploded)\b", re.I), "open panels"),
    (re.compile(r"\b(air\s+sole|boost\s+sole|chunky\s+sole|platform|high.?top|low.?top|mid.?top)\b", re.I), "distinctive sole"),
    (re.compile(r"\b(lace.?up|slip.?on|velcro|strap)\b", re.I), "closure type"),
    (re.compile(r"\b(chronograph|tourbillon|skeleton|digital|analog|smart)\b", re.I), "watch complication"),
    (re.compile(r"\b(leather\s+strap|rubber\s+strap|metal\s+bracelet|nato\s+strap)\b", re.I), "strap type"),
    (re.compile(r"\b(glass\s+bottle|plastic\s+bottle|spray\s+bottle|pump\s+bottle|dropper)\b", re.I), "bottle type"),
    (re.compile(r"\b(round\s+bottle|square\s+bottle|hexagonal|faceted)\b", re.I), "bottle shape"),
    (re.compile(r"\b(pro\s+max|ultra|plus\s+model|standard\s+model)\b", re.I), "model variant"),
    (re.compile(r"\b(limited\s+edition|special\s+edition|collaboration|collab)\b", re.I), "limited edition"),
    (re.compile(r"\b(logo|branding|lettering|text\s+on)\b", re.I), "branded logo/text"),
]

_MATERIAL_RE = re.compile(
    r"\b(leather|suede|canvas|mesh|knit|rubber|silicone|plastic|glass|ceramic|"
    r"stainless\s+steel|titanium|aluminum|aluminium|gold|silver|bronze|brass|"
    r"fabric|denim|nylon|polyester|cotton|wood|marble|concrete)\b",
    re.I,
)


def _extract_subject_visual_description(user_prompt: str) -> Dict[str, str]:
    """Universal product visual descriptor extraction for ANY product type."""
    desc: Dict[str, str] = {}
    low = user_prompt.lower()
    colors_found = []
    for color in _COLOR_WORDS:
        if re.search(rf"\b{color}\b", low):
            colors_found.append(color)
    if colors_found:
        desc["color"] = colors_found[0]
        if len(colors_found) > 1:
            desc["secondary_color"] = colors_found[1]
    m = _VEHICLE_MODEL_RE.search(user_prompt)
    if m:
        desc["model"] = m.group(0).strip()
    m_brand = _BRAND_RE.search(user_prompt)
    if m_brand:
        desc["brand"] = m_brand.group(0).strip()
    m2 = _PRODUCT_CATEGORY_RE.search(user_prompt)
    if m2:
        desc["product_type"] = m2.group(0).strip()
    m3 = _SCALE_RE.search(user_prompt)
    if m3:
        desc["scale"] = f"1:{m3.group(1)}"
    m_mat = _MATERIAL_RE.search(user_prompt)
    if m_mat:
        desc["material"] = m_mat.group(0).strip()
    features = []
    for pattern, label in _FEATURE_PATTERNS:
        if pattern.search(user_prompt):
            features.append(label)
    if features:
        desc["features"] = ", ".join(features[:3])
    return desc


def _build_subject_lock_clause(desc: Dict[str, str], is_fire: bool = False) -> str:
    """Universal positive+negative identity clause for ANY product."""
    color = desc.get("color", "")
    secondary_color = desc.get("secondary_color", "")
    model = desc.get("model", "")
    brand = desc.get("brand", "")
    product_type = desc.get("product_type", "")
    scale = desc.get("scale", "")
    material = desc.get("material", "")
    features = desc.get("features", "")

    parts = []
    if color:
        parts.append(color)
    if secondary_color:
        parts.append(f"and {secondary_color}")
    if brand and brand.lower() not in (model or "").lower():
        parts.append(brand)
    if model:
        parts.append(model)
    if product_type and product_type.lower() not in (model or "").lower():
        parts.append(product_type)
    if scale:
        parts.append(f"scale {scale}")
    if material:
        parts.append(f"in {material}")
    if features:
        parts.append(f"with {features}")

    subject_str = " ".join(parts) if parts else "the exact product shown in the input image"

    positive = (
        f"[SUBJECT IDENTITY LOCK — HIGHEST PRIORITY] "
        f"The subject is: {subject_str}. "
        f"PRESERVE EXACTLY: (1) silhouette and 3D shape, "
        f"(2) color {color or 'original'}{' and ' + secondary_color if secondary_color else ''}, "
        f"(3) surface finish and materials, (4) all logos/text/badges, "
        f"(5) proportions and every design detail. "
        f"The subject MUST appear SOLID, OPAQUE, and FULLY VISIBLE — never transparent or ghost-like. "
    )

    neg_parts = [
        "Do NOT make the product transparent, semi-transparent, or ghost-like.",
        "Do NOT redesign or replace the product.",
        "Do NOT change it to a different brand, model, or generation.",
    ]
    if color:
        neg_parts.append(f"Do NOT change the color from {color}.")
    if model:
        neg_parts.append(f"Do NOT replace the {model} with any other design.")
    if product_type and ("car" in product_type.lower() or model):
        neg_parts.append("Do NOT add spoilers or wings not in the original.")
        neg_parts.append("Do NOT change the car roofline or body variant.")
    if product_type and any(x in product_type.lower() for x in ["sneaker", "shoe", "trainer"]):
        neg_parts.append("Do NOT change the sole design, colorway, or silhouette.")
    if product_type and any(x in product_type.lower() for x in ["bottle", "perfume", "serum"]):
        neg_parts.append("Do NOT change the bottle shape, cap, or label.")
    if product_type and any(x in product_type.lower() for x in ["watch", "timepiece"]):
        neg_parts.append("Do NOT change the watch case, dial, or strap.")
    if product_type and any(x in product_type.lower() for x in ["phone", "smartphone", "iphone"]):
        neg_parts.append("Do NOT change the phone model or camera arrangement.")
    neg_parts.append(
        "ONLY modify: fire/smoke/lighting integration, ambient color cast, "
        "edge seam removal, shadow/reflection. Product must be 100% solid and identical to input."
    )
    return positive + " ".join(neg_parts)


# ---------------------------------------------------------------------------
# Prompt helpers
# ---------------------------------------------------------------------------

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
    t = re.sub(r",?\s*add\s+[^\"'\u201c\u201d]*?[\"'\u201c][^\"'\u201d]+[\"'\u201d]\s+watermark.*$",
               "", t, flags=re.I | re.DOTALL)
    t = re.sub(r",?\s*with\s+watermark[^.,]*", "", t, flags=re.I)
    t = re.sub(r",?\s*watermark\s+on\s+[\w\s]+", "", t, flags=re.I)
    t = re.sub(r"\s+,", ",", t)
    t = re.sub(r",\s*,+", ",", t)
    return t.strip(" ,\t\n").strip(",")


def _strip_watermark_instructions_for_generation(text: str) -> str:
    t = text
    t = re.sub(
        r",?\s*add\s+(?:bold\s+|metallic\s+|stylish\s+|neon\s+)?[^\"'\u201c\u201d]*?"
        r"[\"'\u201c][^\"'\u201d]+[\"'\u201d]\s+watermark[^,.\n]*(?:bottom\s+(?:right|left|center)[^,.\n]*)?",
        "", t, flags=re.I)
    t = re.sub(r",?\s*add\s+(?:bold\s+|metallic\s+|stylish\s+|neon\s+)?[\"']?[\w\s]+[\"']?\s+watermark[^,.\n]*", "", t, flags=re.I)
    t = re.sub(r",?\s*watermark\s+bottom\s+(?:right|left|center)[^,.\n]*", "", t, flags=re.I)
    t = re.sub(r",?\s*with\s+watermark[^,.\n]*", "", t, flags=re.I)
    t = re.sub(r",?\s*add\s+[^,\n]{0,120}\bwatermark\b[^,\n]{0,100}", "", t, flags=re.I)
    t = re.sub(r",?\s*watermark\s+on\s+(?:road|floor|surface|asphalt)[^,.\n]*", "", t, flags=re.I)
    t = re.sub(r"\s+,", ",", t)
    t = re.sub(r",\s*,+", ",", t)
    return t.strip(" ,\t\n").strip(",")


def _sanitize_watermark_draw_text(wm: Optional[str]) -> Optional[str]:
    if not wm:
        return None
    s = " ".join(wm.split())
    if re.search(r"www\.|https?://", s, re.I):
        return None
    if len(s) >= 8 and len(s) % 2 == 0:
        h = len(s) // 2
        if s[:h] == s[h:]:
            s = s[:h].strip()
    elif len(s) >= 16 and s[: len(s) // 2] == s[len(s) // 2:]:
        s = s[: len(s) // 2].strip()
    low = s.lower()
    if "countrylink" in low:
        return "COUNTRYLINK"
    return s[:48]


def _watermark_corner_from_prompt(user_prompt: str) -> str:
    low = user_prompt.lower()
    if re.search(r"watermark.*bottom\s+right|bottom\s+right.*watermark", low):
        return "right"
    return "center"


def _is_action_fx_scene(user_prompt: str) -> bool:
    return bool(_ACTION_FX_RE.search(user_prompt))


def _has_fire_or_burning(user_prompt: str) -> bool:
    return bool(_FIRE_RE.search(user_prompt))


def _is_rich_environment_scene(user_prompt: str) -> bool:
    return bool(_RICH_ENV_RE.search(user_prompt))


def _scene_fragment_from_prompt(user_prompt: str) -> str:
    if _is_action_fx_scene(user_prompt) or _has_fire_or_burning(user_prompt):
        work = _strip_watermark_phrases(user_prompt)
        work = re.sub(
            r"^[^,]{0,120}?\b(?:diecast|scale model|model car|toy car|miniature|"
            r"sneaker|shoe|bottle|watch|phone|product|item)\b[^,]*,\s*",
            "", work, flags=re.I)
        work = re.sub(r"^BMW\s+M\d[^,]{0,60},\s*", "", work, flags=re.I)
        work = re.sub(r"^[^,]{0,80}?\b(?:diecast|model|product)\b[^,]*,\s*", "", work, flags=re.I)
        return work.strip().rstrip(".")
    work = _strip_watermark_phrases(user_prompt)
    m = re.search(r"(?:placed on|sitting on|resting on|standing on|on a|on an)\s+(.+)", work, re.I | re.DOTALL)
    if m:
        return m.group(1).strip().rstrip(".")
    m = re.search(r"\b(?:surrounded by|surrounded with|engulfed in|wrapped in|amid|among)\s+(.+)", work, re.I | re.DOTALL)
    if m:
        return m.group(1).strip().rstrip(".")
    work = re.sub(r"^[\s\S]{0,220}?\b(?:diecast|scale model)\s+model\s+", "", work, count=1, flags=re.I)
    work = re.sub(r"^[^,]{0,120}?\b(?:diecast|scale model|model car|sneaker|shoe|bottle|watch|phone)\b[^,]*,\s*", "", work, flags=re.I)
    work = re.sub(r"^[\d:/\s]+(?:scale\s+)?[^\n,]+?\s+", "", work, count=1, flags=re.I)
    return work.strip().rstrip(".")


def _fire_scene_bg_prompt() -> str:
    """
    BAND-FIX-2: Dedicated full-frame fire BG prompt.
    Guarantees NO black band at top — entire frame is fire.
    """
    return (
        "A massive roaring wall of organic fire filling the ENTIRE image frame from bottom to top. "
        "Tall dramatic flames REACHING the very top edge of the image — absolutely NO dark sky, "
        "NO black areas at top, NO empty space. "
        "Dense billowing smoke in the upper half of the frame. "
        "Thousands of glowing orange and red embers floating upward through the smoke. "
        "Dark gritty wet asphalt ground in the foreground lit by bright orange fire glow. "
        "Low camera angle looking slightly upward at the fire wall. "
        "The ENTIRE background is fire, smoke, and flames from edge to edge, top to bottom. "
        "Photorealistic practical fire VFX, IMAX quality, 8K. "
        "STRICT: No products, no vehicles, no people, no props in frame."
    )


def _anti_phantom_subject_hint() -> str:
    return (
        "No ghost or duplicate product shapes. No fire concentrated in one spot at frame center bottom."
    )


def _wants_composite_plate(prompt: str, kwargs: Dict[str, Any]) -> bool:
    if kwargs.get("force_direct"):
        return False
    if kwargs.get("force_composite") or kwargs.get("use_composite"):
        return True
    low = prompt.lower()
    phrases = (
        "replace background", "remove background", "isolated on white",
        "pure white background", "on white background", "catalog shot",
        "marketplace listing", "ecommerce product on white", "cut out and place",
        "cyberpunk environment", "luxury garage", "garage setup", "ecommerce banner",
        "neon background", "futuristic background", "colorful background",
        "vibrant gradient", "colorful toy-style background", "banner look",
        "flames", "flame", "fire", "smoke effect", "burnout", "explosion",
        "action style", "aggressive sporty", "sporty vibe",
        "surrounded by flames", "surrounded by smoke",
    )
    if any(p in low for p in phrases):
        return True
    if re.search(r"\b(flipkart|amazon)\b", low):
        return True
    if _is_rich_environment_scene(prompt):
        return True
    return False


def _wants_preserve_exact_product(prompt: str) -> bool:
    """Expanded to detect ANY product type."""
    low = prompt.lower()
    markers_groups = [
        ("diecast", "scale model", "model car", "toy car", "miniature", "alloy model",
         "collectible car", "hot wheels", "matchbox", "figurine", "action figure",
         "funko", "statuette", "pvc figure", "blind box"),
        ("sneaker", "shoe", "shoes", "trainer", "trainers", "boot", "boots", "heel",
         "heels", "sandal", "sandals", "loafer", "footwear", "kick", "kicks",
         "nike", "adidas", "jordan", "yeezy", "new balance", "puma", "reebok", "vans", "converse"),
        ("phone", "smartphone", "iphone", "android", "laptop", "tablet", "ipad",
         "headphone", "earbuds", "airpods", "camera", "console", "gamepad", "smartwatch", "wearable"),
        ("perfume", "fragrance", "cologne", "bottle", "serum", "cream", "lotion",
         "lipstick", "makeup", "foundation", "palette", "skincare"),
        ("watch", "watches", "timepiece", "rolex", "omega", "casio", "fossil",
         "seiko", "jewelry", "necklace", "bracelet", "ring"),
        ("handbag", "bag", "purse", "wallet", "backpack", "tote", "clutch", "sunglasses", "glasses"),
        ("can", "tin", "jar", "carton", "pouch", "beverage", "drink", "energy drink",
         "coca-cola", "pepsi", "red bull"),
    ]
    for group in markers_groups:
        if any(m in low for m in group):
            return True
    if re.search(r"\b1\s*[/:]\s*(18|24|32|43|64)\b", low):
        return True
    return False


def _wants_cinematic_redraw(prompt: str) -> bool:
    low = prompt.lower()
    phrases = (
        "cinematic redraw", "full cgi redesign", "completely different car",
        "different vehicle", "not the same car", "redesign the car", "concept car",
        "change the car", "swap the car", "completely different product", "different product",
        "replace the product", "swap the product", "redesign the product",
        "ignore the upload", "new hero product",
    )
    return any(p in low for p in phrases)


def _wants_structural_showcase_redraw(prompt: str) -> bool:
    low = prompt.lower()
    markers = (
        "exploded view", "exploded-view", "doors open", "door open", "hood open",
        "bonnet open", "trunk open", "boot open", "interior visible", "show interior",
        "open interior", "dashboard visible", "cutaway", "cut-away", "cross section",
        "cross-section", "engineering showcase", "engineering look",
        "engineering visualization", "floating parts", "parts separated",
        "components separated", "suspended parts", "disassembled", "assembly diagram",
    )
    if any(m in low for m in markers):
        return True
    if "engineering" in low and any(x in low for x in ("showcase", "high detail", "high-detail", "diagram")):
        return True
    return False


_STRUCTURAL_SHOWCASE_DIECAST = (
    "Diecast/scale-model ENGINEERING exploded diagram: open hood and doors, show interior. "
    "Separate parts from THIS model only, with air gaps between them. "
)
_STRUCTURAL_EXPLODED_NEGATIVE = "No random tools or accessories. No watermarks in image. "
_STRUCTURAL_SHOWCASE_GENERIC = "Product visualization: open panels, exploded parts, clean studio background. "
_STRUCTURAL_SHOWCASE_TAIL = (
    "Bright white cyclorama, soft product lighting, subtle floor shadow, photorealistic. "
    "Keep the same product identity as the source. "
)


def _coerce_bool_opt(value: Any, default: bool) -> bool:
    if value is None:
        return default
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return bool(value)


_DIRECT_SUBJECT_IDENTITY_GUARD = (
    "Keep the exact same product as the source image: identical silhouette, proportions, "
    "materials, surface colors, logos, and geometry — do not substitute a different item."
)
_TEXT_INTEGRITY_GUARD = (
    "Do not add, replace, or hallucinate any text, license plate, sticker, decal, or badge. "
    "Keep existing lettering exactly as in source; if unreadable, leave soft/blurred."
)


def _hero_cinematic_environment_clause(user_prompt: str) -> str:
    if _has_fire_or_burning(user_prompt) or _is_action_fx_scene(user_prompt):
        return (
            "Premium fire-poster look: intense volumetric flames and smoke, dark gritty wet surface "
            "with sharp fire reflections, orange rim light on product surfaces, "
            "shallow depth of field bokeh on background, high contrast. "
        )
    return (
        "Premium product hero framing: cohesive dramatic lighting, believable ground plane, "
        "shallow depth of field, high-end magazine quality. "
    )


def _miniature_subject_style_lock(prompt: str) -> str:
    if not _wants_preserve_exact_product(prompt):
        return ""
    if _is_action_fx_scene(prompt) or _has_fire_or_burning(prompt):
        # Fire/action used to skip this — caused wrong wheels/spoiler vs user's photo.
        return (
            "Diecast / scale model: keep the EXACT same vehicle as the source photo — same wheels, "
            "same rear wing, same stance and body kit; do not swap for a generic showroom BMW."
        )
    return (
        "This is a small-scale collectible or product — preserve its exact proportions, "
        "molded detail, surface finish, and scale. Only add scene lighting around it."
    )


def _wants_dark_background(creative: str) -> bool:
    low = creative.lower()
    if "dark bg" in low or "dark background" in low or "dark backdrop" in low:
        return True
    if "dark" in low and (
        "background" in low or "backdrop" in low or "scene" in low or "environment" in low
    ):
        return True
    return any(
        x in low
        for x in (
            "black background",
            "night scene",
            "moody lighting",
            "low key",
            "cinematic dark",
        )
    )


def _fire_direct_scene_constraints(creative: str) -> str:
    """Tighten environment so runs don't drift to light grey studio (same prompt, wild variance)."""
    low = creative.lower()
    parts = [
        "Environment must match the brief — NOT a white or light-grey seamless studio backdrop.",
        "NOT a bright cyclorama; NOT soft flat catalog lighting unless the brief asks for it.",
        # Avoid flat empty gradient voids (common failure mode vs reference “street fire” shots).
        "Foreground MUST be a real ground plane: wet dark asphalt or road with visible texture "
        "(grain, cracks, tire sheen, pebbles) and a believable contact shadow — NOT a uniform "
        "empty color field or blank gradient backdrop.",
        "Fire and smoke are practical light sources: warm orange-red rim light and bounce on the "
        "product, hot highlights on edges, underbody glow on the ground, faint reflections — "
        "NOT thin sticker flames with zero illumination interaction.",
        "Atmospheric depth: volumetric smoke/haze, embers, layers receding into darker haze — "
        "NOT a single flat wall of color behind the subject.",
    ]
    if "dark" in low or "night" in low or "moody" in low:
        parts.append(
            "Dark environment: charcoal to black background, deep shadows, dramatic contrast."
        )
    if "smoke" in low:
        parts.append("Visible volumetric smoke and haze in the scene, not only fire.")
    if "high contrast" in low or "contrast" in low:
        parts.append("High-contrast cinematic lighting: strong key, deep blacks, hot highlights.")
    if "action" in low or "sporty" in low or "aggressive" in low:
        parts.append("Aggressive action photography — energy and motion, not a static packshot.")
    return " ".join(parts)


_FIRE_DIRECT_INTEGRATED_ENV = (
    "Night burnout / street-fire scene: lower frame is wet gritty asphalt with road texture; "
    "mid and upper frame filled with roaring flames, thick smoke, and floating embers. "
    "Single coherent camera; fire lights the scene — orange spill on paint, ground glow, heat shimmer. "
    "Hollywood practical VFX look, not a collage."
)


def _build_dark_fire_plate_rgba(w: int, h: int) -> Image.Image:
    """
    Dark plate for img2img: asphalt-like noise, gradient, bottom fire glow, vignette.
    Gives Flux structure beyond a flat gradient so backgrounds can match fire-street references.
    """
    rng = np.random.default_rng(42)
    t = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, np.newaxis]
    r = 8.0 + t * 28.0
    gch = 6.0 + t * 20.0
    b = 10.0 + t * 22.0
    arr = np.stack(
        [np.broadcast_to(r, (h, w)), np.broadcast_to(gch, (h, w)), np.broadcast_to(b, (h, w))],
        axis=-1,
    ).astype(np.float32)
    arr += rng.normal(0, 5.5, (h, w, 3))
    row = rng.normal(0, 3.2, (h, 1, 3))
    xw = np.linspace(0.45, 1.0, w, dtype=np.float32)[None, :, None]
    arr += row * xw
    yy = np.linspace(1.0, 0.0, h, dtype=np.float32)[:, np.newaxis]
    bottom_glow = (yy**1.85) * np.array([[[44.0, 22.0, 10.0]]], dtype=np.float32)
    arr += bottom_glow * np.ones((1, w, 3))
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    plate = Image.fromarray(arr, mode="RGB")
    plate = plate.filter(ImageFilter.GaussianBlur(radius=0.85))
    px = np.asarray(plate, dtype=np.float32)
    cx = (np.arange(w, dtype=np.float32) - (w - 1) * 0.5) / max(w * 0.5, 1.0)
    cy = (np.arange(h, dtype=np.float32)[:, None] - (h - 1) * 0.5) / max(h * 0.5, 1.0)
    rr = cx[None, :] ** 2 + cy**2
    vig = np.clip(1.0 - 0.22 * rr, 0.58, 1.0)
    px *= vig[..., None]
    px = np.clip(px, 0, 255).astype(np.uint8)
    return Image.fromarray(px, mode="RGB").convert("RGBA")


def _build_garage_env_plate_rgba(w: int, h: int) -> Image.Image:
    """
    Neutral dark garage / showroom floor plate for img2img when the user brief is garage/road/cyberpunk
    but the upload is a bright white catalog shot — gives Flux a non-white starting frame.
    """
    rng = np.random.default_rng(43)
    t = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, np.newaxis]
    base_r = 26.0 + t * 20.0
    gch = 26.0 + t * 18.0
    b = 30.0 + t * 16.0
    arr = np.stack(
        [np.broadcast_to(base_r, (h, w)), np.broadcast_to(gch, (h, w)), np.broadcast_to(b, (h, w))],
        axis=-1,
    ).astype(np.float32)
    arr += rng.normal(0, 4.2, (h, w, 3))
    row = rng.normal(0, 2.4, (h, 1, 3))
    xw = np.linspace(0.5, 1.0, w, dtype=np.float32)[None, :, None]
    arr += row * xw
    yy = np.linspace(1.0, 0.0, h, dtype=np.float32)[:, np.newaxis]
    warm = (yy**2.0) * np.array([[[10.0, 8.0, 6.0]]], dtype=np.float32)
    arr += warm * np.ones((1, w, 3))
    arr = np.clip(arr, 0, 255).astype(np.uint8)
    plate = Image.fromarray(arr, mode="RGB")
    plate = plate.filter(ImageFilter.GaussianBlur(radius=0.7))
    px = np.asarray(plate, dtype=np.float32)
    cx = (np.arange(w, dtype=np.float32) - (w - 1) * 0.5) / max(w * 0.5, 1.0)
    cy = (np.arange(h, dtype=np.float32)[:, None] - (h - 1) * 0.5) / max(h * 0.5, 1.0)
    rr = cx[None, :] ** 2 + cy**2
    vig = np.clip(1.0 - 0.16 * rr, 0.64, 1.0)
    px *= vig[..., None]
    px = np.clip(px, 0, 255).astype(np.uint8)
    return Image.fromarray(px, mode="RGB").convert("RGBA")


def _wants_luxury_garage_scene(creative: str) -> bool:
    low = creative.lower()
    if "garage" not in low and "showroom" not in low:
        return False
    return any(
        x in low
        for x in (
            "supercar",
            "supercars",
            "blurred",
            "luxury garage",
            "garage setup",
            "collector",
            "showroom",
            "parked",
            "exotic",
        )
    ) or ("garage" in low and "background" in low)


_LUXURY_GARAGE_HERO_LOCK = (
    "[HERO PRODUCT — MUST MATCH INPUT IMAGE] Foreground vehicle = the SAME diecast as the upload: same paint color, "
    "wheels, wing/spoiler, bumpers, stance, and proportions. Do NOT replace with a different car, real full-size "
    "vehicle, or another trim/generation. You may change ONLY lighting, reflections, and the garage around it."
)

_LUXURY_GARAGE_DIRECT = (
    "ENVIRONMENT (required): luxury automotive garage / showroom interior — NOT a plain product sweep. "
    "Visible architecture: ceiling, beams or panels, side walls with depth; polished floor with reflections. "
    "BACKGROUND: multiple heavily blurred exotic sports-car shapes (bokeh) deeper in the space — NOT empty void, "
    "NOT flat grey card, NOT seamless white. "
    "FORBIDDEN: empty black backdrop, featureless wall, solo table with no architecture. "
    "Lighting: mixed garage ambient + rim + practical LEDs; avoid single frontal catalog softbox. "
    "Depth of field: hero product sharp; background cars and walls out of focus."
)


def _stable_seed_from_prompt(creative: str) -> int:
    """Same prompt string → same seed for direct img2img when stable_seed is on (less car/body drift between runs)."""
    h = hashlib.sha256(creative.strip().encode("utf-8")).digest()
    return int.from_bytes(h[:4], "big") % (2**31)


def _rich_env_direct_scene_constraints(creative: str) -> str:
    """Rich-environment unified img2img: stop white-studio inputs from winning over garage/road/neon briefs."""
    base = (
        "Environmental scene must match the user's brief — NOT a white seamless paper cyclorama or bright "
        "ecommerce catalog backdrop unless the brief explicitly demands pure white. "
        "Replace the studio with the described location (garage interior, asphalt, city bokeh, neon, etc.). "
        "Unified lighting: environment must light the product with believable reflections, contact shadow, "
        "and depth of field; one coherent photograph, not a pasted cutout on a void."
    )
    if _wants_luxury_garage_scene(creative):
        return f"{base} {_LUXURY_GARAGE_DIRECT}"
    return base


def _build_full_background_prompt(user_prompt: str) -> Tuple[str, Optional[str], bool]:
    watermark = _extract_watermark_text(user_prompt)
    metallic_wm = bool(
        re.search(r"\bmetallic\b", user_prompt, re.I)
        and (watermark is not None or re.search(r"\bwatermark\b", user_prompt, re.I))
    )
    # BAND-FIX-2: For fire scenes, always use the dedicated fire BG prompt
    if _has_fire_or_burning(user_prompt):
        full = f"{_fire_scene_bg_prompt()} {_anti_phantom_subject_hint()}"
        return full, watermark, metallic_wm

    scene = _scene_fragment_from_prompt(user_prompt)
    if not scene:
        scene = "photorealistic environment with soft natural light, shallow depth of field"

    action_fx = _is_action_fx_scene(user_prompt)
    scale_hint = ""
    if not action_fx and (
        re.search(r"\b1\s*:\s*\d{1,2}\b", user_prompt, re.I)
        or (re.search(r"\b(diecast|miniature)\b", user_prompt, re.I) and re.search(r"\bmacro\b", user_prompt, re.I))
    ):
        scale_hint = "Macro product-photography scale: sharp ground texture, strong depth of field. "

    anti_phantom = _anti_phantom_subject_hint() if action_fx else ""
    if action_fx:
        guard = (
            "Photorealistic atmospheric plate. "
            "No products, items, people, vehicles, or props. "
            "Show only environment: lighting, flames, smoke, sparks, haze, ground."
        )
    else:
        guard = (
            "Photorealistic scene plate only. "
            "No products, items, toys, props, people, or text. "
            "Leave clear ground plane in lower/middle area for compositing one subject."
        )
    full = f"{scene.rstrip('.')}. {scale_hint} {anti_phantom} {guard}".strip()
    return full, watermark, metallic_wm


def _detect_watermark_style(user_prompt: str) -> str:
    low = user_prompt.lower()
    if re.search(r"\b(stylish neon|neon watermark|cyberpunk|neon)\b", low):
        return "neon"
    if re.search(r"\bmetallic\b", low) and re.search(r"\bwatermark\b", low):
        return "metallic"
    if re.search(r"add\s+metallic\s+['\"]?\w", low):
        return "metallic"
    if re.search(r"\bwatermark\s+on\s+(road|floor|surface|asphalt)\b", low):
        return "road"
    return "standard"


# ---------------------------------------------------------------------------
# Image processing helpers
# ---------------------------------------------------------------------------

def _feather_rgba_edges(img: Image.Image, radius: float = 1.15) -> Image.Image:
    arr = np.array(img.convert("RGBA"), dtype=np.float32)
    a = arr[:, :, 3]
    pil_a = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "L")
    blurred = np.asarray(pil_a.filter(ImageFilter.GaussianBlur(radius=radius)), dtype=np.float32)
    arr[:, :, 3] = np.clip(blurred, 0, 255)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def _defringe_rgba_edges(img: Image.Image, pull: float = 0.74, bottom_extra: float = 1.32) -> Image.Image:
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
    img_rgb: Image.Image, fg_rgba: Image.Image, fire_scene: bool,
    warm_bounce_strength: float = 0.06,
) -> Image.Image:
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
            bump[upper] = warm_side * float(np.clip(warm_bounce_strength * 0.65, 0.02, 0.05))
            post = np.clip(post + bump, 0.0, 255.0)
            out = Image.fromarray(post.astype(np.uint8), "RGB")
    return out


def _enhance_preserved_cutout(fg_rgba: Image.Image, is_fire: bool) -> Image.Image:
    """
    SOLID-FIX-1: Contrast boost for dark products (black diecast cars).
    Deepens shadows so they appear solid and opaque, not washed out or ghost-like.
    """
    arr = np.array(fg_rgba.convert("RGBA"), dtype=np.float32)
    a = arr[:, :, 3]
    m = a > 12.0
    if not np.any(m):
        return fg_rgba
    h, w = a.shape
    rgb = arr[:, :, :3].copy()
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]

    # Deepen very dark areas to prevent ghost appearance
    dark_mask = m & (lum < 55.0)
    rgb[dark_mask] = np.clip(rgb[dark_mask] * 0.82, 0, 255)

    hl = np.clip((lum - 95.0) / 160.0, 0.0, 1.0) ** 1.55
    gain = 1.0 + 0.11 * hl
    rgb = rgb * gain[..., None]

    # Only add orange fire tint to visible highlights, not dark areas
    if is_fire:
        highlight_mask = m & (lum > 75.0)
        rgb[..., 0] = np.where(highlight_mask, np.clip(rgb[..., 0] + hl * 16.0, 0, 255), rgb[..., 0])
        rgb[..., 1] = np.where(highlight_mask, np.clip(rgb[..., 1] + hl * 6.0, 0, 255), rgb[..., 1])

    ys, xs = np.where(m)
    y0, y1 = int(ys.min()), int(ys.max())
    top_cut = int(y0 + (y1 - y0) * 0.44)
    yy = np.arange(h, dtype=np.float32)[:, np.newaxis]
    lum2 = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    bright = m & (yy <= top_cut) & (lum2 > 118.0)
    rgb[..., 0] = np.where(bright, np.clip(rgb[..., 0] + 20.0, 0, 255), rgb[..., 0])
    rgb[..., 1] = np.where(bright, np.clip(rgb[..., 1] + 11.0, 0, 255), rgb[..., 1])
    rgb[..., 2] = np.where(bright, np.clip(rgb[..., 2] + 3.0, 0, 255), rgb[..., 2])
    arr[:, :, :3] = np.where(m[..., None], np.clip(rgb, 0, 255), arr[:, :, :3])
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def _sample_bg_edge_color(background: Image.Image) -> Tuple[float, float, float]:
    arr = np.array(background.convert("RGB"), dtype=np.float32)
    h, w, _ = arr.shape
    thickness = max(20, h // 8)
    combined = np.concatenate([
        arr[:thickness, :, :].reshape(-1, 3), arr[-thickness:, :, :].reshape(-1, 3),
        arr[:, :thickness, :].reshape(-1, 3), arr[:, -thickness:, :].reshape(-1, 3),
    ], axis=0)
    return tuple(combined.mean(axis=0).tolist())


def _apply_environment_edge_glow(
    foreground: Image.Image, background: Image.Image,
    intensity: float = 0.45, glow_spread: int = 12, fire_override: bool = False,
) -> Image.Image:
    alpha = np.array(foreground.split()[-1], dtype=np.float32)
    h, w = alpha.shape
    mask = (alpha > 12).astype(np.float32)
    pil_mask = Image.fromarray((mask * 255).astype(np.uint8), "L")
    expanded = pil_mask.filter(ImageFilter.MaxFilter(glow_spread * 2 + 1))
    softened = expanded.filter(ImageFilter.GaussianBlur(radius=glow_spread))
    glow_arr = np.array(softened, dtype=np.float32) / 255.0
    glow_arr = glow_arr * (1.0 - mask)
    y_positions = np.linspace(0.2, 1.0, h).reshape(h, 1)
    glow_arr = glow_arr * y_positions
    glow_arr = np.clip(glow_arr * intensity, 0, 1)
    if fire_override:
        r, g, b = 240.0, 80.0, 15.0
    else:
        raw = _sample_bg_edge_color(background)
        r, g, b = float(raw[0]), float(raw[1]), float(raw[2])
        gray = 0.299 * r + 0.587 * g + 0.114 * b
        r = float(np.clip(gray + (r - gray) * 1.3, 0, 255))
        g = float(np.clip(gray + (g - gray) * 1.3, 0, 255))
        b = float(np.clip(gray + (b - gray) * 1.3, 0, 255))
    r_ch = np.clip(glow_arr * r, 0, 255).astype(np.uint8)
    g_ch = np.clip(glow_arr * g, 0, 255).astype(np.uint8)
    b_ch = np.clip(glow_arr * b, 0, 255).astype(np.uint8)
    a_ch = np.clip(glow_arr * 180.0, 0, 180).astype(np.uint8)
    return Image.merge("RGBA", (
        Image.fromarray(r_ch, "L"), Image.fromarray(g_ch, "L"),
        Image.fromarray(b_ch, "L"), Image.fromarray(a_ch, "L"),
    ))


def _apply_fire_uplight_to_foreground(foreground: Image.Image, strength: float) -> Image.Image:
    """SOLID-FIX-2: Uses luminance weighting to preserve dark/black product areas."""
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
    y_norm = np.clip((row - y_min) / span, 0.0, 1.0)
    lum = 0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]
    # Weight by luminance — black areas get minimal uplight
    lum_weight = np.clip((lum - 20.0) / 80.0, 0.0, 1.0)
    uplight = np.clip((y_norm - 0.32) / 0.68, 0.0, 1.0) ** 1.75 * opaque.astype(np.float32) * lum_weight
    rim = np.clip((y_norm - 0.5) / 0.5, 0.0, 1.0) * 0.25 * opaque.astype(np.float32) * lum_weight
    rgb = arr[:, :, :3]
    rgb = rgb + uplight[:, :, np.newaxis] * np.array([255.0, 82.0, 28.0]) * strength
    rgb = rgb + rim[:, :, np.newaxis] * np.array([255.0, 160.0, 90.0]) * strength
    arr[:, :, :3] = np.clip(rgb, 0.0, 255.0)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def _translate_rgba_down(fg: Image.Image, dy: int) -> Image.Image:
    if dy <= 0:
        return fg
    arr = np.array(fg.convert("RGBA"), dtype=np.uint8)
    h, _, _ = arr.shape
    dy = min(dy, h - 1)
    out = np.zeros_like(arr)
    out[dy:, :] = arr[:-dy, :]
    return Image.fromarray(out, "RGBA")


def _align_foreground_center_stance_to_fraction(
    fg: Image.Image, y_fraction: float,
    max_shift_frac: float = 0.40, center_frac: float = 0.46,
) -> Image.Image:
    y_fraction = float(np.clip(y_fraction, 0.55, 0.98))
    a = np.array(fg.split()[-1])
    h, w = a.shape
    half = center_frac / 2.0
    c0, c1 = int(w * (0.5 - half)), int(w * (0.5 + half))
    sub = a[:, c0:c1]
    row_has = np.any(sub > 12, axis=1)
    if not row_has.any():
        return fg
    bottom = int(np.where(row_has)[0].max())
    target = int(h * y_fraction)
    dy = target - bottom
    if dy <= 0:
        return fg
    return _translate_rgba_down(fg, min(dy, max(1, int(h * max_shift_frac))))


def _neutralize_background_under_subject(
    background: Image.Image, foreground: Image.Image,
    blur_radius: Optional[int] = None,
) -> Image.Image:
    """SEAM-FIX-1: Increased padding and blur to better erase fire under subject."""
    fg_a = np.array(foreground.split()[-1])
    h, w = fg_a.shape
    if not np.any(fg_a > 12):
        return background
    rows = np.any(fg_a > 12, axis=1)
    cols = np.any(fg_a > 12, axis=0)
    y0, y1 = int(np.where(rows)[0][0]), int(np.where(rows)[0][-1])
    x0, x1 = int(np.where(cols)[0][0]), int(np.where(cols)[0][-1])
    bw, bh = x1 - x0, y1 - y0
    pad_x = max(int(bw * 0.18), int(w * 0.04))
    pad_top = max(int(bh * 0.10), 14)
    pad_bot = max(int(bh * 0.30), int(h * 0.06))
    r0, r1 = max(0, y0 - pad_top), min(h, y1 + pad_bot)
    c0, c1 = max(0, x0 - pad_x), min(w, x1 + pad_x)
    bg = background.convert("RGBA")
    arr = np.asarray(bg, dtype=np.float32)
    roi = arr[r0:r1, c0:c1].copy()
    if roi.size == 0:
        return background
    rh, rw = roi.shape[:2]
    br = blur_radius if blur_radius is not None else max(48, min(130, max(rw, rh) // 2))
    smooth = np.asarray(
        Image.fromarray(np.clip(roi, 0, 255).astype(np.uint8), "RGBA").filter(ImageFilter.GaussianBlur(br)),
        dtype=np.float32,
    )
    gray = 0.299 * smooth[..., 0] + 0.587 * smooth[..., 1] + 0.114 * smooth[..., 2]
    desat = np.stack([gray, gray, gray], axis=-1)
    smooth[..., :3] = (smooth[..., :3] * 0.35 + desat * 0.65) * 0.75
    arr[r0:r1, c0:c1] = smooth
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGBA")


def _resolve_fg_auto_ground(prompt: str, kwargs: Dict[str, Any]) -> bool:
    low = prompt.lower()
    ground_contact = any(ph in low for ph in (
        "on road", "on asphalt", "on the road", "on floor", "on ground",
        "placed on", "sitting on", "resting on", "standing on",
    ))
    v = kwargs.get("fg_auto_ground")
    if v is False:
        return False
    if v is True:
        return True
    if ground_contact:
        return True
    if _has_fire_or_burning(prompt) or _is_action_fx_scene(prompt):
        return bool(kwargs.get("fg_auto_ground_fire", True))
    return False


# ---------------------------------------------------------------------------
# Watermark drawing
# ---------------------------------------------------------------------------

def _get_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
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


def _draw_watermark_road_surface(img: Image.Image, text: str, align: str = "center") -> None:
    if img.mode != "RGB":
        img = img.convert("RGB")
    w, h = img.size
    draw = ImageDraw.Draw(img)
    font_size = max(16, int(min(w, h) * 0.042))
    font = _get_font(font_size, bold=True)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    margin = max(12, int(w * 0.028))
    x = w - tw - margin if align == "right" else (w - tw) // 2
    y = min(int(h * 0.90), h - th - 8)
    for dx, dy in ((2, 2), (1, 1)):
        draw.text((x + dx, y + dy), text, font=font, fill=(15, 15, 20))
    draw.text((x, y), text, font=font, fill=(230, 232, 238))


def _draw_watermark_metallic(
    img: Image.Image, text: str, on_road: bool = True,
    warm_glow: bool = False, align: str = "center",
) -> None:
    base = img.convert("RGBA")
    w, h = base.size
    font_size = max(48, int(min(w, h) * 0.09))
    font = _get_font(font_size, bold=True)
    tmp_draw = ImageDraw.Draw(Image.new("L", (1, 1)))
    bbox = tmp_draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    margin = max(12, int(w * 0.028))
    x = w - tw - margin if align == "right" else (w - tw) // 2
    y = min(int(h * 0.91), h - th - 6)
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    if on_road:
        pad_x = int(max(tw * 0.65, 24))
        pad_y = max(10, int(th * 0.45))
        ey0 = y + th - 2
        draw.ellipse([x - pad_x, ey0, x + tw + pad_x, ey0 + pad_y * 2], fill=(0, 0, 0, 140))
        if warm_glow:
            draw.ellipse([x - pad_x // 2, ey0 - 4, x + tw + pad_x // 2, ey0 + pad_y + 12], fill=(255, 100, 45, 60))
        layer = layer.filter(ImageFilter.GaussianBlur(max(6, min(18, w // 80))))
    dt = ImageDraw.Draw(layer)
    for dx, dy in ((8, 8), (6, 6), (5, 5), (4, 4)):
        dt.text((x + dx, y + dy), text, font=font, fill=(0, 0, 0, 200))
    dt.text((x + 2, y + 3), text, font=font, fill=(30, 32, 38, 255))
    dt.text((x + 1, y + 2), text, font=font, fill=(70, 73, 82, 255))
    dt.text((x, y + 1), text, font=font, fill=(120, 125, 138, 255))
    dt.text((x, y), text, font=font, fill=(200, 205, 215, 255))
    dt.text((x - 1, y - 1), text, font=font, fill=(255, 255, 255, 245))
    blended = Image.alpha_composite(base, layer)
    img.paste(blended.convert("RGB"), (0, 0))


def _draw_watermark_neon(
    img: Image.Image, text: str, align: str = "center",
    color: Tuple[int, int, int] = (255, 20, 220),
) -> None:
    base = img.convert("RGBA")
    w, h = base.size
    font_size = max(20, int(min(w, h) * 0.050))
    font = _get_font(font_size, bold=True)
    tmp_draw = ImageDraw.Draw(Image.new("L", (1, 1)))
    bbox = tmp_draw.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    margin = max(12, int(w * 0.028))
    x = w - tw - margin if align == "right" else (w - tw) // 2
    y = min(int(h * 0.88), h - th - 10)
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for radius, alpha_mult in [(8, 0.25), (5, 0.45), (3, 0.65), (1, 0.85)]:
        glow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow_layer)
        gd.text((x, y), text, font=font, fill=(*color, int(255 * alpha_mult)))
        glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=radius))
        layer = Image.alpha_composite(layer, glow_layer)
    dt = ImageDraw.Draw(layer)
    dt.text((x, y), text, font=font, fill=(255, 255, 255, 255))
    img.paste(Image.alpha_composite(base, layer).convert("RGB"), (0, 0))


# ---------------------------------------------------------------------------
# FalAdapter
# ---------------------------------------------------------------------------

class FalAdapter(BaseAIProvider):
    def __init__(self, name: str):
        super().__init__(name)
        settings = get_settings()
        if settings.fal_key:
            os.environ["FAL_KEY"] = settings.fal_key
        else:
            logger.warning(f"[{self.name}] FAL_KEY is not set in settings!")

    def _get_client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=httpx.Timeout(60.0), follow_redirects=True, verify=False)

    async def _ensure_public_url(self, url: str) -> str:
        if not url:
            return ""
        is_internal = any(x in url for x in ["localhost", "127.0.0.1", "172.", "10."]) or url.startswith("/")
        if is_internal:
            logger.info(f"[{self.name}] Internal URL detected: {url}. Promoting to Fal storage...")
            settings = get_settings()
            try:
                from urllib.parse import urlparse, urlunparse
                parsed_src = urlparse(url)
                parsed_ep = urlparse(settings.storage_endpoint)
                fetch_url = urlunparse((parsed_ep.scheme, parsed_ep.netloc, parsed_src.path,
                                        parsed_src.params, parsed_src.query, parsed_src.fragment))
                async with self._get_client() as client:
                    resp = await client.get(fetch_url)
                    resp.raise_for_status()
                    data = resp.content
                path_lower = parsed_src.path.lower()
                ct = "image/jpeg" if path_lower.endswith((".jpg", ".jpeg")) else "image/png"
                public_url = await asyncio.to_thread(fal_client.upload, data, ct)
                logger.info(f"[{self.name}] Promoted to Fal CDN: {public_url}")
                return public_url
            except Exception as e:
                logger.error(f"[{self.name}] Failed to promote internal URL: {str(e)}")
                return url
        return url

    async def _refine_candidate(self, image_data: bytes, prompt: str, **kwargs) -> Optional[bytes]:
        try:
            public_url = await asyncio.to_thread(fal_client.upload, image_data, "image/jpeg")
            refine_prompt = (
                f"High-quality product advertisement. {prompt}. "
                "Improve realism, lighting consistency, reflections, and grounding. "
                "Preserve exact shape and details. Do not redesign."
            )
            handler = await asyncio.to_thread(
                fal_client.submit, "fal-ai/flux/schnell/image-to-image",
                arguments={
                    "image_url": public_url, "prompt": refine_prompt,
                    "strength": float(kwargs.get("refine_strength", 0.15)),
                    "num_inference_steps": 4, "guidance_scale": 3.5, "enable_safety_checker": False,
                }
            )
            result = await asyncio.to_thread(handler.get)
            if result and "images" in result:
                async with self._get_client() as client:
                    return (await client.get(result["images"][0]["url"])).content
            return None
        except Exception as e:
            logger.warning(f"[{self.name}] Refinement pass failed: {e}")
            return None

    async def _generate_fire_foreground_overlay(self, bg_size: Tuple[int, int], **kwargs) -> Optional[Image.Image]:
        """Fire/smoke foreground layer to wrap in FRONT of subject."""
        try:
            fire_fg_prompt = (
                "Cinematic fire foreground VFX plate: tall flames rising from bottom, "
                "dense rolling smoke, flying orange embers and sparks, "
                "dramatic orange-red glow, dark background. "
                "No product visible — pure fire, smoke, embers only. VFX plate, 8K."
            )
            handler = await asyncio.to_thread(
                fal_client.submit, "fal-ai/flux/schnell",
                arguments={
                    "prompt": fire_fg_prompt, "image_size": "square_hd",
                    "num_inference_steps": 4, "guidance_scale": 3.5, "enable_safety_checker": False,
                }
            )
            result = await asyncio.to_thread(handler.get)
            if not result or "images" not in result:
                return None
            async with self._get_client() as client:
                data = (await client.get(result["images"][0]["url"])).content
            fire_img = Image.open(io.BytesIO(data)).convert("RGBA").resize(bg_size, Image.LANCZOS)
            arr = np.array(fire_img, dtype=np.float32)
            lum = 0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]
            fire_mask = np.clip((lum - 55.0) / 145.0, 0.0, 1.0) ** 1.3
            arr[..., 3] = np.clip(fire_mask * 215.0, 0.0, 255.0)
            return Image.fromarray(arr.astype(np.uint8), "RGBA")
        except Exception as e:
            logger.warning(f"[{self.name}] Fire foreground overlay failed: {e}")
            return None

    _T2I_MODELS: Dict[str, str] = {
        # ── FLUX series ───────────────────────────────────────────────────────
        "flux-schnell":        "fal-ai/flux/schnell",
        "flux_schnell":        "fal-ai/flux/schnell",
        "flux-dev":            "fal-ai/flux/dev",
        "flux_dev":            "fal-ai/flux/dev",
        "flux-pro":            "fal-ai/flux-pro/v1.1",
        "flux_pro":            "fal-ai/flux-pro/v1.1",
        "flux-2-pro":          "fal-ai/flux-2-pro",
        "flux_2_pro":          "fal-ai/flux-2-pro",
        # ── Nano Banana series ────────────────────────────────────────────────
        "nano-banana":         "fal-ai/nano-banana",
        "nano_banana":         "fal-ai/nano-banana",
        "nano-banana-2":       "fal-ai/nano-banana-2",
        "nano_banana_2":       "fal-ai/nano-banana-2",
        "nano-banana-pro":     "fal-ai/nano-banana-pro",
        "nano_banana_pro":     "fal-ai/nano-banana-pro",
        # ── ByteDance Seedream ────────────────────────────────────────────────
        "seedream-45":         "fal-ai/bytedance/seedream/v4.5",
        "seedream_45":         "fal-ai/bytedance/seedream/v4.5",
        "seedream-50":         "fal-ai/bytedance/seedream/v5",
        "seedream_50":         "fal-ai/bytedance/seedream/v5",
        # ── Ideogram ──────────────────────────────────────────────────────────
        "ideogram-v3":         "fal-ai/ideogram/v3",
        "ideogram_v3":         "fal-ai/ideogram/v3",
    }

    async def text_to_image(self, prompt: str, **kwargs) -> GenerationResult:
        model_hint = str(kwargs.get("model", "flux-dev")).lower()
        endpoint = self._T2I_MODELS.get(model_hint, "fal-ai/flux/dev")
        logger.info(f"[{self.name}] text_to_image → {endpoint}  prompt={prompt[:80]}…")
        try:
            image_size = kwargs.get("image_size", "square_hd")
            aspect_ratio = kwargs.get("aspect_ratio", "1:1")

            if endpoint == "fal-ai/flux/schnell":
                args: Dict[str, Any] = {
                    "prompt": prompt,
                    "image_size": image_size,
                    "num_inference_steps": max(1, min(int(kwargs.get("steps", 4)), _SCHNELL_MAX_INFERENCE_STEPS)),
                    "enable_safety_checker": False,
                    "guidance_scale": float(kwargs.get("guidance_scale", 3.5)),
                }
            elif endpoint == "fal-ai/flux/dev":
                args = {
                    "prompt": prompt,
                    "image_size": image_size,
                    "num_inference_steps": int(kwargs.get("steps", 28)),
                    "enable_safety_checker": False,
                    "guidance_scale": float(kwargs.get("guidance_scale", 3.5)),
                }
            elif endpoint in ("fal-ai/flux-pro/v1.1", "fal-ai/flux-2-pro"):
                args = {
                    "prompt": prompt,
                    "image_size": image_size,
                    "enable_safety_checker": False,
                }
            elif endpoint in ("fal-ai/nano-banana", "fal-ai/nano-banana-2", "fal-ai/nano-banana-pro"):
                args = {
                    "prompt": prompt,
                    "image_size": image_size,
                    "safety_tolerance": "4",
                }
            elif endpoint in ("fal-ai/bytedance/seedream/v4.5", "fal-ai/bytedance/seedream/v5"):
                args = {
                    "prompt": prompt,
                    "image_size": image_size,
                    "enable_safety_checker": False,
                }
            elif endpoint == "fal-ai/ideogram/v3":
                # Ideogram uses different aspect ratio format
                _ratio_map = {
                    "1:1": "ASPECT_1_1", "16:9": "ASPECT_16_9", "9:16": "ASPECT_9_16",
                    "4:3": "ASPECT_4_3", "3:4": "ASPECT_3_4",
                }
                args = {
                    "prompt": prompt,
                    "aspect_ratio": _ratio_map.get(aspect_ratio, "ASPECT_1_1"),
                    "rendering_quality": "QUALITY",
                }
            else:
                args = {
                    "prompt": prompt,
                    "image_size": image_size,
                    "enable_safety_checker": False,
                }

            handler = await asyncio.to_thread(fal_client.submit, endpoint, arguments=args)
            result = await asyncio.to_thread(handler.get)
            if result and "images" in result and len(result["images"]) > 0:
                return GenerationResult(success=True, media_url=result["images"][0]["url"], model_name=f"{self.name}/{model_hint}")
            return GenerationResult(success=False, error_message="No images in result", model_name=self.name)
        except Exception as e:
            logger.error(f"[{self.name}] text_to_image failed (model={model_hint}): {str(e)}")
            return GenerationResult(success=False, error_message=str(e), model_name=self.name)

    async def image_to_image(self, image_url: str, prompt: str, **kwargs) -> GenerationResult:
        logger.info(f"[{self.name}] Starting Hybrid Pipeline for prompt: {prompt[:100]}...")
        try:
            current_image_url = await self._ensure_public_url(image_url)

            _model_hint = str(kwargs.get("model", "")).lower()

            # --- FLUX Kontext / FLUX 2 Pro Edit fast-path ----------------------
            _flux_edit_models = {
                "flux-kontext":    "fal-ai/flux-pro/kontext",
                "flux_kontext":    "fal-ai/flux-pro/kontext",
                "flux-2-pro-edit": "fal-ai/flux-2-pro/edit",
                "flux_2_pro_edit": "fal-ai/flux-2-pro/edit",
            }
            if _model_hint in _flux_edit_models or "kontext" in _model_hint:
                _endpoint = _flux_edit_models.get(_model_hint, "fal-ai/flux-pro/kontext")
                logger.info(f"[{self.name}] Routing to {_endpoint} img2img (model={_model_hint})")
                try:
                    handler = await asyncio.to_thread(
                        fal_client.submit,
                        _endpoint,
                        arguments={
                            "prompt": prompt,
                            "image_url": current_image_url,
                            "guidance_scale": float(kwargs.get("guidance_scale", 3.5)),
                            "num_inference_steps": int(kwargs.get("steps", 28)),
                            "safety_tolerance": "4",
                        },
                    )
                    result = await asyncio.to_thread(handler.get)
                    if result and "images" in result and len(result["images"]) > 0:
                        return GenerationResult(
                            success=True,
                            media_url=result["images"][0]["url"],
                            model_name=f"{self.name}/{_model_hint}",
                        )
                    return GenerationResult(
                        success=False,
                        error_message=f"{_endpoint} returned no images",
                        model_name=self.name,
                    )
                except Exception as e:
                    logger.exception(f"[{self.name}] {_endpoint} img2img failed: {e}")
                    return GenerationResult(success=False, error_message=str(e), model_name=self.name)

            # --- Seedream 4.5 Edit fast-path ------------------------------------
            _seedream_edit_models = {
                "seedream-45-edit": "fal-ai/bytedance/seedream/v4.5/edit",
                "seedream_45_edit": "fal-ai/bytedance/seedream/v4.5/edit",
            }
            if _model_hint in _seedream_edit_models:
                _endpoint = _seedream_edit_models[_model_hint]
                logger.info(f"[{self.name}] Routing to {_endpoint} img2img")
                try:
                    handler = await asyncio.to_thread(
                        fal_client.submit,
                        _endpoint,
                        arguments={
                            "prompt": prompt,
                            "image_url": current_image_url,
                        },
                    )
                    result = await asyncio.to_thread(handler.get)
                    if result and "images" in result and len(result["images"]) > 0:
                        return GenerationResult(
                            success=True,
                            media_url=result["images"][0]["url"],
                            model_name=f"{self.name}/{_model_hint}",
                        )
                    return GenerationResult(
                        success=False, error_message="Seedream edit returned no images", model_name=self.name,
                    )
                except Exception as e:
                    logger.exception(f"[{self.name}] Seedream edit failed: {e}")
                    return GenerationResult(success=False, error_message=str(e), model_name=self.name)

            # --- Nano Banana fast-path (Google Imagen instruction-based edit) ---
            if "nano-banana" in _model_hint or _model_hint in ("nano-banana-2", "nano-banana-pro", "nano_banana_pro"):
                logger.info(f"[{self.name}] Routing to nano-banana img2img (model={_model_hint})")
                nb_bytes = await self._img2img_nano_banana(current_image_url, prompt, **kwargs)
                if not nb_bytes:
                    return GenerationResult(
                        success=False,
                        error_message="nano-banana img2img returned no result",
                        model_name=self.name,
                    )
                # Apply watermark (same logic as Flux path — must run BEFORE returning)
                nb_image = Image.open(io.BytesIO(nb_bytes)).convert("RGB")
                wm_source = (kwargs.get("user_prompt") or prompt) or ""
                _, wm_text, wm_metallic = _build_full_background_prompt(wm_source)
                wm = _sanitize_watermark_draw_text(kwargs.get("watermark_text", wm_text))
                wm_align = _watermark_corner_from_prompt(wm_source)
                wm_style = kwargs.get("watermark_style") or _detect_watermark_style(wm_source)
                if wm:
                    logger.info(f"[{self.name}] nano-banana watermark '{wm}' style={wm_style} align={wm_align}")
                    if wm_style == "neon":
                        _draw_watermark_neon(nb_image, str(wm), align=wm_align)
                    elif wm_style == "metallic" or kwargs.get("watermark_metallic", wm_metallic):
                        _draw_watermark_metallic(nb_image, str(wm), warm_glow=_has_fire_or_burning(wm_source), align=wm_align)
                    else:
                        _draw_watermark_road_surface(nb_image, str(wm), align=wm_align)
                buf = io.BytesIO()
                nb_image.save(buf, format="JPEG", quality=92)
                return GenerationResult(
                    success=True,
                    media_data=buf.getvalue(),
                    model_name=self.name,
                )

            routing_prompt = (kwargs.get("user_prompt") or prompt or "").strip() or prompt
            preserve_pixels = _wants_preserve_exact_product(routing_prompt)
            preserve_subject = _coerce_bool_opt(kwargs.get("preserve_subject"), True)
            cinematic = _coerce_bool_opt(kwargs.get("cinematic_redraw"), False) or _wants_cinematic_redraw(routing_prompt)
            structural = _wants_structural_showcase_redraw(routing_prompt)
            if structural:
                kwargs["structural_showcase_redraw"] = True
            hero_reframe = (
                _coerce_bool_opt(kwargs.get("hero_cinematic_reframe"), False)
                and not cinematic and not structural
            )

            is_fire_or_action = _has_fire_or_burning(routing_prompt) or _is_action_fx_scene(routing_prompt)
            is_rich_env = _is_rich_environment_scene(routing_prompt)

            # Default for fire / rich env: ONE unified scene via full-frame img2img (matches reference-style
            # photography). Legacy "background plate + sticker" is opt-in: kwargs force_composite / use_composite.
            if kwargs.get("force_composite") or kwargs.get("use_composite"):
                use_composite = True
                logger.info(f"[{self.name}] COMPOSITE route (force_composite / use_composite)")
            elif kwargs.get("force_direct") or cinematic or hero_reframe or structural:
                use_composite = False
            elif is_fire_or_action or is_rich_env:
                use_composite = False
                logger.info(
                    f"[{self.name}] Fire/rich-env: DIRECT unified-scene (flux/dev img2img on full frame)"
                )
            else:
                use_composite = (
                    _wants_composite_plate(routing_prompt, kwargs)
                    or preserve_pixels or preserve_subject
                )
            use_direct = not use_composite

            mode_name = (
                "DIRECT structural showcase" if structural
                else "DIRECT hero reframe" if hero_reframe
                else "DIRECT img2img (unified scene)" if use_direct
                else "COMPOSITE (rembg + plate + fire-wrap)"
            )
            logger.info(f"[{self.name}] Stage 1: {mode_name}")

            if use_composite and (preserve_pixels or preserve_subject):
                kwargs["tight_subject_blend"] = True
                dramatic = _has_fire_or_burning(routing_prompt) or _is_action_fx_scene(routing_prompt)
                rich_env = _is_rich_environment_scene(routing_prompt)

                if kwargs.get("composite_flux_blend") is None:
                    kwargs["composite_flux_blend"] = bool(dramatic or rich_env)

                # GHOST-FIX-1: 0.72 for fire — solid car, blended fire lighting
                if kwargs.get("composite_blend_strength") is None:
                    if dramatic:
                        kwargs["composite_blend_strength"] = 0.72
                    elif rich_env:
                        kwargs["composite_blend_strength"] = 0.65 if preserve_pixels else 0.72
                    else:
                        kwargs["composite_blend_strength"] = 0.78

                if kwargs.get("composite_blend_steps") is None:
                    kwargs["composite_blend_steps"] = 32 if dramatic else 28

                # GHOST-FIX-2: guidance 3.2 for fire
                if kwargs.get("composite_blend_guidance") is None and dramatic:
                    kwargs["composite_blend_guidance"] = 3.2

                if _has_fire_or_burning(routing_prompt) and kwargs.get("fire_uplight") is None:
                    kwargs["fire_uplight"] = True

                # SOLID-FIX-2: lower uplight for dark products
                if dramatic and kwargs.get("fire_uplight_strength") is None:
                    kwargs["fire_uplight_strength"] = 0.18

                # SOLID-FIX-3: lower warm bounce for dark products
                if dramatic and kwargs.get("warm_bounce_strength") is None:
                    kwargs["warm_bounce_strength"] = 0.06

                if dramatic and kwargs.get("feather_radius") is None:
                    kwargs["feather_radius"] = 1.38

            logger.info(f"[{self.name}] Stage 2: Generating...")
            candidate_bytes = (
                await self._img2img_direct(current_image_url, prompt, **kwargs)
                if use_direct
                else await self._img2img_composite(current_image_url, prompt, **kwargs)
            )

            if not candidate_bytes and use_direct and (is_fire_or_action or is_rich_env) and not kwargs.get(
                "no_composite_fallback", False
            ):
                logger.warning(f"[{self.name}] Direct img2img returned nothing; falling back to COMPOSITE")
                candidate_bytes = await self._img2img_composite(current_image_url, prompt, **kwargs)

            if not candidate_bytes:
                return GenerationResult(success=False, error_message="Failed to generate candidate", model_name=self.name)

            if use_composite and kwargs.get("enable_refine", False):
                refined = await self._refine_candidate(candidate_bytes, prompt, **kwargs)
                chosen_data = refined if refined else candidate_bytes
            else:
                chosen_data = candidate_bytes

            final_image = Image.open(io.BytesIO(chosen_data)).convert("RGB")

            wm_source = (kwargs.get("user_prompt") or prompt) or ""
            _, wm_text, wm_metallic = _build_full_background_prompt(wm_source)
            wm = _sanitize_watermark_draw_text(kwargs.get("watermark_text", wm_text))
            wm_align = _watermark_corner_from_prompt(wm_source)
            wm_style = kwargs.get("watermark_style") or _detect_watermark_style(wm_source)

            if wm:
                logger.info(f"[{self.name}] Watermark '{wm}' style={wm_style} align={wm_align}")
                if wm_style == "neon":
                    _draw_watermark_neon(final_image, str(wm), align=wm_align)
                elif wm_style == "metallic" or kwargs.get("watermark_metallic", wm_metallic):
                    _draw_watermark_metallic(final_image, str(wm), warm_glow=_has_fire_or_burning(wm_source), align=wm_align)
                else:
                    _draw_watermark_road_surface(final_image, str(wm), align=wm_align)

            out = io.BytesIO()
            final_image.save(out, format="JPEG", quality=95)
            logger.info(f"[{self.name}] Hybrid Pipeline complete.")
            return GenerationResult(success=True, media_data=out.getvalue(), model_name=self.name)

        except Exception as e:
            logger.error(f"[{self.name}] Hybrid Pipeline failed: {str(e)}\n{traceback.format_exc()}")
            return GenerationResult(success=False, error_message=str(e), model_name=self.name)

    async def _maybe_environment_plate_preprocess(
        self, image_url: str, creative: str, **kwargs
    ) -> Tuple[str, str]:
        """
        Bright catalog uploads fight environment briefs in img2img. For fire+dark: dark fire plate.
        For garage/road/neon/etc. (rich env, not fire-only): neutral garage floor plate.
        Returns (possibly_new_url, plate_kind) with plate_kind in 'none'|'fire'|'rich_env'.
        """
        if kwargs.get("skip_dark_plate_preprocess", False) or kwargs.get(
            "skip_environment_plate_preprocess", False
        ):
            return image_url, "none"
        is_fire = _has_fire_or_burning(creative) or _is_action_fx_scene(creative)
        is_rich = _is_rich_environment_scene(creative)
        if not is_fire and not is_rich:
            return image_url, "none"
        try:
            async with self._get_client() as client:
                raw = (await client.get(image_url)).content
            rgb = np.array(Image.open(io.BytesIO(raw)).convert("RGB"), dtype=np.float32)
            mean_lum = float(np.mean(rgb))
            # Dark grey "tabletop" (mean ~90–115) still reads as studio — luxury garage needs plate too.
            _lux_g = _wants_luxury_garage_scene(creative)
            if mean_lum < 88.0:
                return image_url, "none"
            if mean_lum < 118.0:
                if (is_fire and _wants_dark_background(creative)) or (
                    is_rich and not is_fire and _lux_g
                ):
                    pass
                else:
                    return image_url, "none"

            async def _rembg_upload_plate(plate_builder) -> Optional[str]:
                rembg_handler = await asyncio.to_thread(
                    fal_client.submit, "fal-ai/rembg", arguments={"image_url": image_url}
                )
                rembg_result = await asyncio.to_thread(rembg_handler.get)
                if not rembg_result or "image" not in rembg_result:
                    return None
                async with self._get_client() as client:
                    fg_bytes = (await client.get(rembg_result["image"]["url"])).content
                fg = Image.open(io.BytesIO(fg_bytes)).convert("RGBA")
                w, h = fg.size
                base = plate_builder(w, h)
                out = Image.alpha_composite(base, fg)
                buf = io.BytesIO()
                out.save(buf, format="PNG")
                return await asyncio.to_thread(fal_client.upload, buf.getvalue(), "image/png")

            if is_fire and _wants_dark_background(creative):
                logger.info(
                    f"[{self.name}] Light input (mean RGB {mean_lum:.0f}) + fire+dark brief → fire-plate preprocess"
                )
                new_url = await _rembg_upload_plate(_build_dark_fire_plate_rgba)
                if new_url:
                    logger.info(f"[{self.name}] Fire-plate URL ready for img2img")
                    return new_url, "fire"

            if is_rich and not is_fire:
                logger.info(
                    f"[{self.name}] Light input (mean RGB {mean_lum:.0f}) + rich-env brief → garage-plate preprocess"
                )
                new_url = await _rembg_upload_plate(_build_garage_env_plate_rgba)
                if new_url:
                    logger.info(f"[{self.name}] Garage-plate URL ready for img2img")
                    return new_url, "rich_env"

        except Exception as e:
            logger.warning(f"[{self.name}] environment_plate_preprocess failed, using original: {e}")
        return image_url, "none"

    async def _img2img_direct(self, image_url: str, prompt: str, **kwargs) -> Optional[bytes]:
        try:
            creative = (kwargs.get("user_prompt") or prompt or "").strip() or prompt
            image_url, plate_kind = await self._maybe_environment_plate_preprocess(
                image_url, creative, **kwargs
            )
            structural = _coerce_bool_opt(kwargs.get("structural_showcase_redraw"), False) or _wants_structural_showcase_redraw(creative)
            hero = _coerce_bool_opt(kwargs.get("hero_cinematic_reframe"), False) and not structural
            creative_clean = _strip_watermark_instructions_for_generation(creative)
            is_fire_scene = _has_fire_or_burning(creative) or _is_action_fx_scene(creative)
            is_rich_env_scene = _is_rich_environment_scene(creative)
            lux_garage = _wants_luxury_garage_scene(creative)
            subj_desc = _extract_subject_visual_description(creative)
            subj_lock = _build_subject_lock_clause(subj_desc, is_fire=is_fire_scene)

            if structural:
                struct_body = _STRUCTURAL_SHOWCASE_DIECAST if _wants_preserve_exact_product(creative) else _STRUCTURAL_SHOWCASE_GENERIC
                core = (f"{subj_lock} {creative_clean}. {_DIRECT_SUBJECT_IDENTITY_GUARD} {_TEXT_INTEGRITY_GUARD} "
                        f"{struct_body}{_STRUCTURAL_EXPLODED_NEGATIVE}{_STRUCTURAL_SHOWCASE_TAIL}")
                strength = float(kwargs.get("img2img_strength", 0.94))
                steps = int(kwargs.get("img2img_steps", 48))
                full_prompt = f"{core} Photorealistic, ultra sharp, studio catalog resolution."
            else:
                mini_lock = _miniature_subject_style_lock(creative)
                core = f"{subj_lock} {creative_clean}. {_DIRECT_SUBJECT_IDENTITY_GUARD} {_TEXT_INTEGRITY_GUARD}"
                if mini_lock:
                    core = f"{core} {mini_lock}"
                if hero:
                    env_clause = _hero_cinematic_environment_clause(creative)
                    d_strength = 0.82 if _wants_preserve_exact_product(creative) else 0.88
                    strength = float(kwargs.get("img2img_strength", d_strength))
                    steps = int(kwargs.get("img2img_steps", 44))
                    full_prompt = f"{core} {env_clause}Photorealistic, ultra detailed."
                elif is_fire_scene:
                    # Unified scene + strong env/identity: lower strength keeps user's car closer to input.
                    # Dark-plate preprocess already removed white studio; small strength bump helps fire/smoke read.
                    base_fire = 0.76 if _wants_preserve_exact_product(creative) else 0.82
                    if plate_kind == "fire":
                        base_fire += 0.06
                    strength = float(kwargs.get("img2img_strength", base_fire))
                    steps = int(kwargs.get("img2img_steps", 44))
                    scene_must = _fire_direct_scene_constraints(creative)
                    unified = (
                        "ONE single photograph — not a collage. Same camera, same ground plane, coherent "
                        "fire/smoke/lighting and contact shadows; product naturally in the environment."
                    )
                    full_prompt = (
                        f"{core} {scene_must} {_FIRE_DIRECT_INTEGRATED_ENV} {unified} {_anti_phantom_subject_hint()} "
                        f"Photorealistic, HDR, 8K."
                    )
                elif is_rich_env_scene:
                    # Luxury garage: lower strength + subject before scene — high strength was swapping the car.
                    if lux_garage:
                        base_rich = 0.72 if _wants_preserve_exact_product(creative) else 0.78
                    else:
                        base_rich = 0.78 if _wants_preserve_exact_product(creative) else 0.84
                    if plate_kind == "rich_env":
                        base_rich += 0.03
                    strength = float(kwargs.get("img2img_strength", base_rich))
                    steps = int(kwargs.get("img2img_steps", 48 if lux_garage else 44))
                    scene_rm = _rich_env_direct_scene_constraints(creative)
                    unified = (
                        "ONE single photograph — not a collage. Same environment and camera; depth of field, "
                        "realistic reflections on paint and glass, natural contact shadow; product integrated in scene."
                    )
                    if lux_garage:
                        full_prompt = (
                            f"{core} {_LUXURY_GARAGE_HERO_LOCK} {scene_rm} {unified} "
                            f"Photorealistic, HDR, 8K, cinematic wide-angle photograph."
                        )
                    else:
                        full_prompt = (
                            f"{core} {scene_rm} {unified} Photorealistic, HDR, 8K, environmental cinematic photography."
                        )
                else:
                    strength = float(kwargs.get("img2img_strength", 0.95))
                    steps = int(kwargs.get("img2img_steps", 40))
                    full_prompt = f"{core} Cinematic product photography, photorealistic, ultra detailed."

            if structural:
                gc_default = 3.65
            elif is_fire_scene:
                gc_default = 4.0
            elif is_rich_env_scene and lux_garage:
                gc_default = 4.0
            elif is_rich_env_scene:
                gc_default = 4.0
            else:
                gc_default = 3.5
            fal_args: Dict[str, Any] = {
                "image_url": image_url,
                "prompt": full_prompt,
                "strength": strength,
                "num_inference_steps": steps,
                "guidance_scale": float(kwargs.get("guidance_scale", gc_default)),
            }
            if kwargs.get("seed") is not None:
                try:
                    fal_args["seed"] = int(kwargs["seed"])
                except (TypeError, ValueError):
                    pass
            elif kwargs.get("stable_seed", True):
                # Same prompt → same seed: reduces car/body drift between runs (diffusion is still stochastic on GPU).
                fal_args["seed"] = _stable_seed_from_prompt(creative)
                logger.info(
                    f"[{self.name}] direct img2img: stable seed {fal_args['seed']} from prompt hash "
                    f"(pass seed=int or stable_seed=false for new variation)"
                )
            handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/flux/dev/image-to-image",
                arguments=fal_args,
            )
            result = await asyncio.to_thread(handler.get)
            if not result or "images" not in result:
                return None
            async with self._get_client() as client:
                return (await client.get(result["images"][0]["url"])).content
        except Exception as e:
            logger.warning(f"[{self.name}] Direct img2img failed: {e}")
            return None

    async def _img2img_nano_banana(self, image_url: str, prompt: str, **kwargs) -> Optional[bytes]:
        """
        Image-to-image using Google's Nano Banana (Imagen) via fal.ai.
        Supports both fal-ai/nano-banana/edit (v1) and fal-ai/nano-banana-2/edit (v2).
        Unlike Flux, this is a pure instruction-based edit model — no strength/steps/guidance params.
        Pass model="nano-banana-2" in kwargs to use the newer v2 model.
        """
        try:
            creative = (kwargs.get("user_prompt") or prompt or "").strip() or prompt
            creative_clean = _strip_watermark_instructions_for_generation(creative)

            model_version = str(kwargs.get("model", "nano-banana")).lower()
            if "pro" in model_version or model_version in ("nano-banana-pro", "nano_banana_pro"):
                endpoint = "fal-ai/nano-banana-pro/edit"
            elif "2" in model_version or model_version == "nano-banana-2":
                endpoint = "fal-ai/nano-banana-2/edit"
            else:
                endpoint = "fal-ai/nano-banana/edit"

            # Build a focused edit prompt (no negative prompt needed — model is instruction-tuned)
            is_fire_scene = _has_fire_or_burning(creative) or _is_action_fx_scene(creative)
            is_rich_env = _is_rich_environment_scene(creative)
            subj_desc = _extract_subject_visual_description(creative)
            subj_lock = _build_subject_lock_clause(subj_desc, is_fire=is_fire_scene)

            if is_fire_scene:
                scene_must = _fire_direct_scene_constraints(creative)
                edit_prompt = (
                    f"{subj_lock} {creative_clean}. {scene_must} "
                    f"Photorealistic product advertising photograph, HDR, 8K."
                )
            elif is_rich_env:
                scene_rm = _rich_env_direct_scene_constraints(creative)
                edit_prompt = (
                    f"{subj_lock} {creative_clean}. {scene_rm} "
                    f"Photorealistic cinematic product photograph, HDR, 8K."
                )
            else:
                edit_prompt = (
                    f"{subj_lock} {creative_clean}. "
                    f"Cinematic product photography, photorealistic, ultra detailed."
                )

            # nano-banana accepts safety_tolerance 1–6 (4 = default, 6 = least strict)
            safety = str(kwargs.get("nano_banana_safety", kwargs.get("safety_tolerance", "4")))

            fal_args: Dict[str, Any] = {
                "prompt": edit_prompt,
                "image_urls": [image_url],
                "num_images": 1,
                "output_format": kwargs.get("output_format", "jpeg"),
                "safety_tolerance": safety,
            }

            aspect_ratio = kwargs.get("aspect_ratio")
            if aspect_ratio:
                fal_args["aspect_ratio"] = aspect_ratio

            if kwargs.get("seed") is not None:
                try:
                    fal_args["seed"] = int(kwargs["seed"])
                except (TypeError, ValueError):
                    pass
            elif kwargs.get("stable_seed", True):
                fal_args["seed"] = _stable_seed_from_prompt(creative)

            logger.info(
                f"[{self.name}] nano-banana img2img: endpoint={endpoint} "
                f"safety={safety} prompt_len={len(edit_prompt)}"
            )
            handler = await asyncio.to_thread(
                fal_client.submit,
                endpoint,
                arguments=fal_args,
            )
            result = await asyncio.to_thread(handler.get)
            if not result or "images" not in result or not result["images"]:
                logger.warning(f"[{self.name}] nano-banana returned no images")
                return None
            async with self._get_client() as client:
                return (await client.get(result["images"][0]["url"])).content
        except Exception as e:
            logger.warning(f"[{self.name}] nano-banana img2img failed: {e}")
            return None

    async def _blend_composite_with_flux(self, image_jpeg: bytes, routing_prompt: str, **kwargs) -> Optional[bytes]:
        if not kwargs.get("composite_flux_blend", True):
            return None
        try:
            public_url = await asyncio.to_thread(fal_client.upload, image_jpeg, "image/jpeg")
            routing_prompt_clean = _strip_watermark_instructions_for_generation(routing_prompt)
            dramatic_bg = _has_fire_or_burning(routing_prompt) or _is_action_fx_scene(routing_prompt)
            rich_env = _is_rich_environment_scene(routing_prompt)
            tight = bool(kwargs.get("tight_subject_blend"))
            mini_lock = _miniature_subject_style_lock(routing_prompt)

            subject_desc = _extract_subject_visual_description(routing_prompt)
            subject_lock = _build_subject_lock_clause(subject_desc, is_fire=dramatic_bg)
            logger.info(f"[{self.name}] Subject lock: {subject_lock[:120]}...")

            if dramatic_bg:
                hero_integrate = (
                    "Cinematic fire poster: intense orange firelight illuminating the product, "
                    "coherent specular highlights from fire, dark wet ground with fire reflections, "
                    "background fire and smoke in soft bokeh, scattered embers. "
                    "The product MUST appear SOLID and FULLY OPAQUE — not transparent, not ghostly. "
                )
                light_line = (
                    "Orange/red fire color cast on product surfaces. Deep shadows at ground contact. "
                    "Atmospheric fire haze. Remove any hard compositing seams or cutout edges. "
                )
                fire_permission = (
                    "Flames may bleed slightly over the OUTER EDGES of the product silhouette. "
                    "Product body, paint, and shape must remain 100% solid and unchanged. "
                )
            elif tight:
                hero_integrate = (
                    "Photoreal integration: match environment lighting, coherent reflections, depth of field. "
                    "Product must appear SOLID and OPAQUE. "
                )
                light_line = "Natural color bounce, tight contact shadows, remove cutout fringes. "
                fire_permission = ""
            else:
                hero_integrate = "Photoreal integration: match environment lighting, reflections, depth of field. "
                light_line = "Remove colored fringes and compositing halos. "
                fire_permission = ""

            if rich_env and not dramatic_bg:
                hero_integrate = (
                    "Seamlessly integrate the product: match color cast, reflections, rim lighting. "
                    "Product must appear SOLID and OPAQUE. "
                )
                light_line = "Blend ambient light naturally, soft contact shadows, remove hard seams. "

            blend_prompt = (
                f"{subject_lock} "
                f"{routing_prompt_clean[:400]}. {hero_integrate}"
                f"One seamless photoreal photograph — not a collage or cutout. "
                f"{light_line}{fire_permission}{_TEXT_INTEGRITY_GUARD}"
            )
            if mini_lock:
                blend_prompt = f"{blend_prompt} {mini_lock}"

            # GHOST-FIX-1+2: strength=0.72, guidance=3.2 → solid car + fire blending
            handler = await asyncio.to_thread(
                fal_client.submit, "fal-ai/flux/dev/image-to-image",
                arguments={
                    "image_url": public_url,
                    "prompt": blend_prompt,
                    "strength": float(kwargs.get("composite_blend_strength", 0.72)),
                    "num_inference_steps": int(kwargs.get("composite_blend_steps", 32)),
                    "guidance_scale": float(kwargs.get("composite_blend_guidance", 3.2)),
                },
            )
            result = await asyncio.to_thread(handler.get)
            if not result or "images" not in result:
                return None
            async with self._get_client() as client:
                return (await client.get(result["images"][0]["url"])).content
        except Exception as e:
            logger.warning(f"[{self.name}] Composite flux blend failed: {e}")
            return None

    async def _img2img_composite(self, image_url: str, prompt: str, **kwargs) -> Optional[bytes]:
        try:
            rembg_handler = await asyncio.to_thread(fal_client.submit, "fal-ai/rembg", arguments={"image_url": image_url})
            rembg_result = await asyncio.to_thread(rembg_handler.get)
            if not rembg_result or "image" not in rembg_result:
                logger.warning(f"[{self.name}] rembg missing image: {str(rembg_result)[:400]}")
                return None

            async with self._get_client() as client:
                fg_bytes = (await client.get(rembg_result["image"]["url"])).content
            foreground = Image.open(io.BytesIO(fg_bytes)).convert("RGBA")
            is_fire_scene = _has_fire_or_burning(prompt) or _is_action_fx_scene(prompt)
            is_rich_env = _is_rich_environment_scene(prompt)

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

            # BAND-FIX-1: Fire scenes get dedicated full-frame fire prompt + flux/dev
            if is_fire_scene:
                bg_prompt = f"{_fire_scene_bg_prompt()} {_PREMIUM_FIRE_PLATE_SUFFIX}"
                bg_model = "fal-ai/flux/dev"
                bg_steps = int(kwargs.get("bg_steps", 28))
                bg_guidance = 3.8
                bg_image_size = {"width":512, "height": 512}
            elif is_rich_env:
                bg_base_prompt = (kwargs.get("user_prompt") or prompt or "").strip() or prompt
                bg_prompt, _, _ = _build_full_background_prompt(bg_base_prompt)
                bg_model = "fal-ai/flux/dev"
                bg_steps = int(kwargs.get("bg_steps", 30))
                bg_guidance = float(kwargs.get("bg_guidance", 3.8))
                bg_image_size = {"width": 512, "height": 512}
            else:
                bg_base_prompt = (kwargs.get("user_prompt") or prompt or "").strip() or prompt
                bg_prompt, _, _ = _build_full_background_prompt(bg_base_prompt)
                bg_model = "fal-ai/flux/schnell"
                bg_steps = max(1, min(int(kwargs.get("bg_steps", 4)), _SCHNELL_MAX_INFERENCE_STEPS))
                bg_guidance = 3.5
                bg_image_size = {"width": 512, "height": 512}

            if kwargs.get("bg_width") is not None or kwargs.get("bg_height") is not None:
                bg_image_size = {"width": int(kwargs.get("bg_width", 512)), "height": int(kwargs.get("bg_height", 512))}

            bg_handler = await asyncio.to_thread(
                fal_client.submit, bg_model,
                arguments={
                    "prompt": bg_prompt[:8000], "image_size": bg_image_size,
                    "num_inference_steps": bg_steps, "guidance_scale": bg_guidance,
                    "enable_safety_checker": False,
                }
            )
            bg_result = await asyncio.to_thread(bg_handler.get)
            if not bg_result or "images" not in bg_result or not bg_result["images"]:
                logger.warning(f"[{self.name}] bg gen missing images: {str(bg_result)[:400]}")
                return None

            async with self._get_client() as client:
                bg_bytes = (await client.get(bg_result["images"][0]["url"])).content
            background = Image.open(io.BytesIO(bg_bytes)).convert("RGBA").resize(foreground.size, Image.LANCZOS)

            if kwargs.get("neutralize_bg_under_subject", True):
                background = _neutralize_background_under_subject(background, foreground)

            fg_arr = np.array(foreground, dtype=np.float32)
            bg_arr = np.array(background, dtype=np.float32)
            a = fg_arr[:, :, 3]
            opaque = a > 12.0

            if opaque.any() and kwargs.get("exposure_match", True):
                bg_lum = (0.299 * bg_arr[..., 0] + 0.587 * bg_arr[..., 1] + 0.114 * bg_arr[..., 2]).mean()
                fg_lum = (0.299 * fg_arr[..., 0] + 0.587 * fg_arr[..., 1] + 0.114 * fg_arr[..., 2])[opaque].mean()
                lo, hi = (0.88, 1.12) if is_fire_scene else (0.95, 1.05)
                ratio = np.clip(bg_lum / (fg_lum + 1e-5), lo, hi)
                fg_arr[..., :3] = np.clip(fg_arr[..., :3] * ratio, 0, 255)

            if opaque.any() and kwargs.get("ambient_spill_enabled", False):
                strip = bg_arr[int(background.height * 0.7):, :, :3].reshape(-1, 3)
                if strip.size > 0:
                    ambient = strip.mean(axis=0)
                    # Reduced spill for dark products
                    spill = float(kwargs.get("ambient_spill", 0.08 if is_fire_scene else 0.07))
                    fg_arr[..., :3] = np.where(opaque[..., None],
                                                fg_arr[..., :3] * (1 - spill) + ambient * spill,
                                                fg_arr[..., :3])
                    fg_arr[..., :3] = np.clip(fg_arr[..., :3], 0, 255)

            foreground = Image.fromarray(fg_arr.astype(np.uint8), "RGBA")

            if _has_fire_or_burning(prompt) and kwargs.get("fire_uplight", True):
                foreground = _apply_fire_uplight_to_foreground(
                    foreground, float(kwargs.get("fire_uplight_strength", 0.18 if is_fire_scene else 0.12))
                )
            if kwargs.get("enhance_preserved_cutout", True):
                foreground = _enhance_preserved_cutout(foreground, is_fire_scene)

            if _resolve_fg_auto_ground(prompt, kwargs):
                foreground = _align_foreground_center_stance_to_fraction(
                    foreground, float(kwargs.get("fg_ground_target", 0.90))
                )

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
                        for dy in range(1, max_drop + 1):
                            y_shadow = y_contact + dy
                            if y_shadow >= alpha.shape[0]:
                                break
                            t = dy / float(max_drop)
                            falloff = (1.0 - t) ** 2.05
                            val = (min(255, int(245 * falloff + 35)) if dy <= 2
                                   else min(255, int(210 * falloff + 25)) if dy <= 5
                                   else int(175 * falloff))
                            shadow_mask[y_shadow, x] = max(shadow_mask[y_shadow, x], val)
                shadow_image = Image.fromarray(shadow_mask.astype(np.uint8), "L").filter(
                    ImageFilter.GaussianBlur(radius=max(2, background.width // 200))
                )
                shadow_layer = Image.merge("RGBA", (
                    Image.new("L", background.size, 0), Image.new("L", background.size, 0),
                    Image.new("L", background.size, 0), shadow_image,
                ))
            background.paste(shadow_layer, (0, 0), shadow_layer)

            if kwargs.get("draw_reflection", True):
                alpha_arr = np.array(foreground.split()[-1], dtype=np.float32)
                nz_rows = np.where(alpha_arr.max(axis=1) > 12)[0]
                if nz_rows.size > 0:
                    subject_bottom_y = int(nz_rows[-1])
                    refl_height = max(12, (subject_bottom_y - int(nz_rows[0])) // 6)
                    refl_src = foreground.crop((0, subject_bottom_y - refl_height, foreground.width, subject_bottom_y))
                    refl_arr = np.array(refl_src.transpose(Image.FLIP_TOP_BOTTOM), dtype=np.float32)
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

            if is_fire_scene and kwargs.get("fire_wrap_overlay", True):
                logger.info(f"[{self.name}] Generating fire foreground wrap overlay...")
                fire_overlay = await self._generate_fire_foreground_overlay(background.size, **kwargs)
                if fire_overlay:
                    h_bg = background.size[1]
                    overlay_arr = np.array(fire_overlay, dtype=np.float32)
                    crop_top = int(h_bg * 0.38)
                    fade_band = 100
                    fade_start = max(0, crop_top - fade_band)
                    for row in range(fade_start, crop_top):
                        t = (crop_top - row) / float(fade_band)
                        overlay_arr[row, :, 3] *= (1.0 - t)
                    overlay_arr[:fade_start, :, 3] = 0
                    fire_overlay_cropped = Image.fromarray(overlay_arr.astype(np.uint8), "RGBA")
                    mid = Image.alpha_composite(background, foreground)
                    final_image = Image.alpha_composite(mid.convert("RGBA"), fire_overlay_cropped).convert("RGB")
                    logger.info(f"[{self.name}] Fire wrap overlay composited.")
                else:
                    final_image = Image.alpha_composite(background, foreground).convert("RGB")
            else:
                final_image = Image.alpha_composite(background, foreground).convert("RGB")

            if kwargs.get("polish_preserved_composite", True):
                final_image = _polish_preserved_composite(
                    final_image, foreground, is_fire_scene,
                    warm_bounce_strength=float(kwargs.get("warm_bounce_strength", 0.06)),
                )

            img_byte_arr = io.BytesIO()
            final_image.save(img_byte_arr, format="JPEG", quality=95)
            raw_bytes = img_byte_arr.getvalue()

            blend_hint = (kwargs.get("user_prompt") or prompt or "").strip() or prompt
            blended = await self._blend_composite_with_flux(raw_bytes, blend_hint, **kwargs)
            return blended if blended else raw_bytes

        except Exception as e:
            logger.exception(f"[{self.name}] Composite pipeline failed: {e}")
            return None

    # -----------------------------------------------------------------------
    # Video generation — model registry
    # -----------------------------------------------------------------------
    #
    # Cost reference (fal.ai, per video):
    #   kling_standard  ~$0.028/s  → 5 s ≈ $0.14   ← cheapest Kling
    #   wan             ~$0.10/s   → 5 s ≈ $0.50
    #   luma            ~$0.14/video fixed
    #   minimax         ~$0.50/video fixed
    #   kling_pro       ~$0.14/s   → 5 s ≈ $0.70  (v1.6)
    #   kling_21_pro    ~$0.098/s  → 5 s ≈ $0.49  (v2.1 — newer & cheaper than v1.6)
    #   kling_master    ~$0.28/s   → 5 s ≈ $1.40  (was wrongly the default → $2.80!)
    #   seedance_fast   ~$0.2419/s → 5 s ≈ $1.21  (ByteDance, native audio included)
    #
    # Default tiers:
    #   basic  → kling_standard  (~$0.14 / 5 s)
    #   pro    → kling_pro       (~$0.70 / 5 s)
    #   premium→ kling_master    (~$1.40 / 5 s)

    _I2V_MODELS: Dict[str, str] = {
        # ── Kling series ──────────────────────────────────────────────────────
        "kling_standard":    "fal-ai/kling-video/v1/standard/image-to-video",  # ~$0.028/s
        "kling_pro":         "fal-ai/kling-video/v1.6/pro/image-to-video",     # ~$0.14/s
        "kling_21_pro":      "fal-ai/kling-video/v2.1/pro/image-to-video",     # ~$0.098/s
        "kling_26_pro":      "fal-ai/kling-video/v2.6/pro/image-to-video",     # ~$0.098/s, audio
        "kling_30_pro":      "fal-ai/kling-video/v3/pro/image-to-video",       # ~$0.14/s, newest, audio
        "kling_master":      "fal-ai/kling-video/v2/master/image-to-video",    # ~$0.28/s
        # ── ByteDance Seedance 2.0 ─────────────────────────────────────────
        "seedance_fast":          "bytedance/seedance-2.0/fast/image-to-video",          # ~$0.2419/s, audio
        "seedance_standard":      "bytedance/seedance-2.0/image-to-video",               # ~$0.16/s, audio
        # ── ByteDance Seedance 2.0 Reference-to-Video ──────────────────────
        "seedance_ref":           "bytedance/seedance-2.0/reference-to-video",           # ~$0.16/s, ref-guided, audio
        "seedance_fast_ref":      "bytedance/seedance-2.0/fast/reference-to-video",      # ~$0.2419/s, ref-guided, audio
        # ── PixVerse ──────────────────────────────────────────────────────
        "pixverse_v6":            "fal-ai/pixverse/v6/image-to-video",                   # ~$0.04/s, 1080p, audio
        "pixverse_c1":            "fal-ai/pixverse/c1/image-to-video",                   # ~$0.04/s, 1080p, audio
        # ── PixVerse C1 Transition (start→end morph) ──────────────────────
        "pixverse_c1_transition": "fal-ai/pixverse/c1/transition",                       # ~$0.04/s, start+end frames
        # ── Others ────────────────────────────────────────────────────────
        "wan":               "wan/v2.6/image-to-video",                        # $0.10/s, up to 15s
        "luma":              "fal-ai/luma-dream-machine/image-to-video",       # ~$0.14 fixed
        "minimax":           "fal-ai/minimax/video-01/image-to-video",         # ~$0.50 fixed
        # ── Legacy alias ──────────────────────────────────────────────────
        "kling":             "fal-ai/kling-video/v1/standard/image-to-video",
    }

    # Per-tier defaults — basic users get cheap standard, premium get master
    _I2V_TIER_DEFAULT: Dict[str, str] = {
        "free":    "kling_standard",
        "basic":   "kling_standard",
        "pro":     "kling_pro",
        "premium": "kling_standard",   # master ($2.80/5s) makes premium loss-making at $59/mo
    }
    _I2V_DEFAULT = "kling_standard"

    _T2V_MODELS: Dict[str, str] = {
        # ── Kling series ──────────────────────────────────────────────────────
        "kling_standard":    "fal-ai/kling-video/v1/standard/text-to-video",
        "kling_pro":         "fal-ai/kling-video/v1.6/pro/text-to-video",
        "kling_21_pro":      "fal-ai/kling-video/v2.1/pro/text-to-video",
        "kling_26_pro":      "fal-ai/kling-video/v2.6/pro/text-to-video",    # audio
        "kling_30_pro":      "fal-ai/kling-video/v3/pro/text-to-video",      # newest, audio
        "kling_master":      "fal-ai/kling-video/v2/master/text-to-video",
        "kling":             "fal-ai/kling-video/v1/standard/text-to-video",
        # ── ByteDance Seedance 2.0 ─────────────────────────────────────────
        "seedance_fast":     "bytedance/seedance-2.0/fast/text-to-video",    # audio
        "seedance_standard": "bytedance/seedance-2.0/text-to-video",         # audio
        # ── PixVerse ──────────────────────────────────────────────────────
        "pixverse_v6":       "fal-ai/pixverse/v6/text-to-video",             # 1080p, audio
        "pixverse_c1":       "fal-ai/pixverse/c1/text-to-video",             # 1080p, audio
        # ── Others ────────────────────────────────────────────────────────
        "minimax":           "fal-ai/minimax/video-01",
        "wan":               "wan/v2.6/text-to-video",
        "luma":              "fal-ai/luma-dream-machine",
    }
    _T2V_TIER_DEFAULT: Dict[str, str] = {
        "free":    "kling_standard",
        "basic":   "kling_standard",
        "pro":     "kling_pro",
        "premium": "kling_standard",   # master is loss-making at scale
    }
    _T2V_DEFAULT = "kling_standard"

    # -----------------------------------------------------------------------
    # text_to_video
    # -----------------------------------------------------------------------
    async def text_to_video(self, prompt: str, duration_seconds: int = 5, **kwargs) -> GenerationResult:
        """
        Generate a video from a text prompt.

        kwargs
        ------
        model        : "kling_standard"|"kling_pro"|"kling_master"|"wan"|"minimax"|"luma"
        tier         : "free"|"basic"|"pro"|"premium"  — used to auto-pick model if model not set
        aspect_ratio : "16:9" | "9:16" | "1:1"               (default: 16:9)
        negative_prompt : str
        """
        tier = str(kwargs.get("tier", "basic")).lower()
        tier_default = self._T2V_TIER_DEFAULT.get(tier, self._T2V_DEFAULT)
        model_key = str(kwargs.get("model", tier_default)).lower()
        endpoint = self._T2V_MODELS.get(model_key, self._T2V_MODELS[self._T2V_DEFAULT])
        aspect_ratio = kwargs.get("aspect_ratio", "16:9")
        negative_prompt = kwargs.get("negative_prompt", "blurry, low quality, distorted")

        # Duration — each model has its own param name / allowed values
        duration_str = str(min(max(int(duration_seconds), 5), 10))  # clamp 5-10

        try:
            _kling_models = (
                "kling", "kling_standard", "kling_pro", "kling_master",
                "kling_21_pro", "kling_26_pro", "kling_30_pro",
            )
            _seedance_models = ("seedance_fast", "seedance_standard")
            if model_key in _kling_models:
                args: Dict[str, Any] = {
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "duration": duration_str,
                    "aspect_ratio": aspect_ratio,
                }
            elif model_key in _seedance_models:
                dur_sd = min(max(int(duration_seconds), 4), 15)
                args = {
                    "prompt": prompt,
                    "duration": str(dur_sd),
                    "aspect_ratio": kwargs.get("aspect_ratio", "16:9"),
                    "resolution": kwargs.get("resolution", "720p"),
                    "generate_audio": kwargs.get("generate_audio", True),
                }
            elif model_key in ("pixverse_c1", "pixverse_v6"):
                dur_pv = min(max(int(duration_seconds), 5), 8)
                args = {
                    "prompt": prompt,
                    "duration": dur_pv,
                    "aspect_ratio": aspect_ratio,
                    "quality_mode": kwargs.get("quality_mode", "quality"),
                    "motion_mode": kwargs.get("motion_mode", "normal"),
                }
            elif model_key == "minimax":
                args = {
                    "prompt": prompt,
                    "prompt_optimizer": True,
                }
            elif model_key == "wan":
                dur_t2v = min(max(int(duration_seconds), 5), 15)
                dur_t2v = str(min([5, 10, 15], key=lambda x: abs(x - dur_t2v)))
                args = {
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "duration": dur_t2v,
                    "resolution": kwargs.get("resolution", "1080p"),
                    "enable_prompt_expansion": kwargs.get("enable_prompt_expansion", False),
                }
                if kwargs.get("audio_url"):
                    args["audio_url"] = kwargs["audio_url"]
            else:  # luma
                args = {
                    "prompt": prompt,
                    "aspect_ratio": aspect_ratio,
                    "loop": False,
                }

            logger.info(f"[{self.name}] text_to_video → {endpoint}  duration={duration_seconds}s")
            handler = await asyncio.to_thread(fal_client.submit, endpoint, arguments=args)
            result = await asyncio.to_thread(handler.get)

            video_url = (result or {}).get("video", {}).get("url") or (result or {}).get("video_url")
            if video_url:
                return GenerationResult(success=True, media_url=video_url, model_name=f"{self.name}/{model_key}")
            return GenerationResult(success=False, error_message="No video URL in result", model_name=self.name)
        except Exception as e:
            logger.exception(f"[{self.name}] text_to_video failed: {e}")
            return GenerationResult(success=False, error_message=str(e), model_name=self.name)

    # -----------------------------------------------------------------------
    # image_to_video  — full multi-model implementation
    # -----------------------------------------------------------------------
    async def image_to_video(
        self,
        image_url: str,
        prompt: str,
        duration_seconds: int = 5,
        **kwargs,
    ) -> GenerationResult:
        """
        Animate a static image into a video clip.

        kwargs
        ------
        model           : "kling_standard"|"kling_pro"|"kling_master"|"wan"|"minimax"|"luma"
        tier            : "free"|"basic"|"pro"|"premium"  — auto-picks model if model not set
        aspect_ratio    : "16:9" | "9:16" | "1:1"               (default: 16:9)
        negative_prompt : str
        resolution      : "720p" | "1080p"                       (wan only)
        end_image_url   : str                                    (kling only — end frame)
        """
        tier = str(kwargs.get("tier", "basic")).lower()
        tier_default = self._I2V_TIER_DEFAULT.get(tier, self._I2V_DEFAULT)
        model_key = str(kwargs.get("model", tier_default)).lower()
        endpoint = self._I2V_MODELS.get(model_key, self._I2V_MODELS[self._I2V_DEFAULT])
        aspect_ratio = kwargs.get("aspect_ratio", "16:9")
        negative_prompt = kwargs.get("negative_prompt", "blurry, low quality, distorted, watermark")

        try:
            public_image_url = await self._ensure_public_url(image_url)
            logger.info(f"[{self.name}] image_to_video → {endpoint}  duration={duration_seconds}s  image={public_image_url[:60]}…")

            # Build model-specific argument dict
            _kling_models = (
                "kling", "kling_standard", "kling_pro", "kling_master",
                "kling_21_pro", "kling_26_pro", "kling_30_pro",
            )
            _seedance_models = ("seedance_fast", "seedance_standard")
            _seedance_ref_models = ("seedance_ref", "seedance_fast_ref")
            if model_key in _kling_models:
                # All Kling variants share the same params; duration is "5" or "10"
                dur = "10" if int(duration_seconds) >= 8 else "5"
                args: Dict[str, Any] = {
                    "image_url": public_image_url,
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "duration": dur,
                    "aspect_ratio": aspect_ratio,
                }
                if kwargs.get("end_image_url"):
                    args["tail_image_url"] = await self._ensure_public_url(kwargs["end_image_url"])

            elif model_key in _seedance_models:
                dur_sd = min(max(int(duration_seconds), 4), 15)
                args = {
                    "image_url": public_image_url,
                    "prompt": prompt,
                    "duration": str(dur_sd),
                    "aspect_ratio": kwargs.get("aspect_ratio", "auto"),
                    "resolution": kwargs.get("resolution", "720p"),
                    "generate_audio": kwargs.get("generate_audio", True),
                }
                if kwargs.get("end_image_url"):
                    args["end_image_url"] = await self._ensure_public_url(kwargs["end_image_url"])

            elif model_key in _seedance_ref_models:
                # Seedance reference-to-video: image_url is the reference image guiding the output.
                # The main project image IS the reference; an optional second reference can be added.
                ref_url = kwargs.get("reference_image_url")
                primary = await self._ensure_public_url(ref_url if ref_url else image_url)
                dur_sd = min(max(int(duration_seconds), 4), 15)
                args = {
                    "image_url": primary,
                    "prompt": prompt,
                    "duration": str(dur_sd),
                    "aspect_ratio": kwargs.get("aspect_ratio", "auto"),
                    "resolution": kwargs.get("resolution", "720p"),
                    "generate_audio": kwargs.get("generate_audio", True),
                }

            elif model_key == "pixverse_c1_transition":
                # PixVerse C1 Transition: morphs from start_image to end_image.
                # main project image = start; reference_image_url = end frame (required).
                end_url = kwargs.get("reference_image_url") or kwargs.get("end_image_url")
                if not end_url:
                    raise ValueError(
                        "PixVerse C1 Transition requires an end frame image. "
                        "Please upload a reference / end-frame image."
                    )
                dur_pv = min(max(int(duration_seconds), 5), 8)
                args = {
                    "start_image_url": public_image_url,
                    "end_image_url": await self._ensure_public_url(end_url),
                    "prompt": prompt,
                    "duration": dur_pv,
                    "aspect_ratio": aspect_ratio,
                    "quality_mode": kwargs.get("quality_mode", "quality"),
                }

            elif model_key in ("pixverse_c1", "pixverse_v6"):
                dur_pv = min(max(int(duration_seconds), 5), 8)
                args = {
                    "image_url": public_image_url,
                    "prompt": prompt,
                    "duration": dur_pv,
                    "quality_mode": kwargs.get("quality_mode", "quality"),
                    "motion_mode": kwargs.get("motion_mode", "normal"),
                }

            elif model_key == "minimax":
                # MiniMax Video-01: prompt + image_url; prompt optimizer optional
                args = {
                    "image_url": public_image_url,
                    "prompt": prompt,
                    "prompt_optimizer": kwargs.get("prompt_optimizer", True),
                }

            elif model_key == "wan":
                # Wan v2.6: duration "5"/"10"/"15" (string), 720p or 1080p (default 1080p)
                dur_wan = min(max(int(duration_seconds), 5), 15)
                dur_wan = str(min([5, 10, 15], key=lambda x: abs(x - dur_wan)))
                args = {
                    "image_url": public_image_url,
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "duration": dur_wan,
                    "resolution": kwargs.get("resolution", "1080p"),
                    "enable_prompt_expansion": kwargs.get("enable_prompt_expansion", False),
                }
                # audio_url: attach background music/sound (WAV or MP3, 3–30s, ≤15 MB)
                if kwargs.get("audio_url"):
                    args["audio_url"] = kwargs["audio_url"]

            else:  # luma — fast fallback
                args = {
                    "image_url": public_image_url,
                    "prompt": prompt,
                    "aspect_ratio": aspect_ratio,
                }

            handler = await asyncio.to_thread(fal_client.submit, endpoint, arguments=args)
            result = await asyncio.to_thread(handler.get)

            # Normalise across response shapes: {video: {url:...}} or {video_url:...}
            video_url = (result or {}).get("video", {}).get("url") or (result or {}).get("video_url")
            if video_url:
                logger.info(f"[{self.name}] image_to_video success → {video_url[:80]}…")
                return GenerationResult(success=True, media_url=video_url, model_name=f"{self.name}/{model_key}")

            logger.error(f"[{self.name}] image_to_video: no video URL in result: {result}")
            return GenerationResult(success=False, error_message="No video URL in result", model_name=self.name)

        except Exception as e:
            logger.exception(f"[{self.name}] image_to_video failed: {e}")
            return GenerationResult(success=False, error_message=str(e), model_name=self.name)

    # -----------------------------------------------------------------------
    # video_to_video
    # -----------------------------------------------------------------------
    async def video_to_video(self, video_url: str, prompt: str, duration_seconds: int = 5, **kwargs) -> GenerationResult:
        """
        Restyle / enhance an existing video clip.

        kwargs
        ------
        model : "kling"  (only model currently supported for v2v)
        """
        try:
            public_video_url = await self._ensure_public_url(video_url)
            logger.info(f"[{self.name}] video_to_video → kling  video={public_video_url[:60]}…")
            handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/kling-video/v1/standard/video-to-video",
                arguments={
                    "video_url": public_video_url,
                    "prompt": prompt,
                    "negative_prompt": kwargs.get("negative_prompt", "blurry, low quality"),
                },
            )
            result = await asyncio.to_thread(handler.get)
            video_url_out = (result or {}).get("video", {}).get("url") or (result or {}).get("video_url")
            if video_url_out:
                return GenerationResult(success=True, media_url=video_url_out, model_name=self.name)
            return GenerationResult(success=False, error_message="No video URL in result", model_name=self.name)
        except Exception as e:
            logger.exception(f"[{self.name}] video_to_video failed: {e}")
            return GenerationResult(success=False, error_message=str(e), model_name=self.name)

    # -----------------------------------------------------------------------
    # Audio generation — Beatoven AI (sound effects + music)
    # -----------------------------------------------------------------------

    async def text_to_audio(
        self,
        prompt: str,
        duration_seconds: float = 5.0,
        audio_type: str = "sfx",
        **kwargs,
    ) -> GenerationResult:
        """
        Generate audio from a text description using Beatoven AI.

        Parameters
        ----------
        prompt        : describe the sound — e.g. "engine roar, tire screech, dramatic bass"
        duration_seconds : 1–35 for sfx, 5–90 for music
        audio_type    : "sfx"   → beatoven/sound-effect-generation  ($0.10/req)
                        "music" → beatoven/music-generation          ($0.10/req)

        Returns GenerationResult with media_url pointing to a public WAV file.
        """
        if audio_type == "music":
            endpoint = "beatoven/music-generation"
            dur = min(max(float(duration_seconds), 5.0), 90.0)
        else:
            endpoint = "beatoven/sound-effect-generation"
            dur = min(max(float(duration_seconds), 1.0), 35.0)

        try:
            logger.info(f"[{self.name}] text_to_audio → {endpoint}  duration={dur}s  prompt={prompt[:60]}…")
            handler = await asyncio.to_thread(
                fal_client.submit,
                endpoint,
                arguments={
                    "prompt": prompt,
                    "duration": dur,
                    "negative_prompt": kwargs.get("negative_prompt", ""),
                    "refinement": kwargs.get("refinement", 40),
                    "creativity": kwargs.get("creativity", 16),
                },
            )
            result = await asyncio.to_thread(handler.get)

            # Response shape: { "audio": { "url": "..." } }
            audio_url = (result or {}).get("audio", {}).get("url") or (result or {}).get("audio_url")
            if audio_url:
                logger.info(f"[{self.name}] text_to_audio success → {audio_url[:80]}…")
                return GenerationResult(success=True, media_url=audio_url, model_name=f"{self.name}/beatoven-{audio_type}")

            logger.error(f"[{self.name}] text_to_audio: no audio URL in result: {result}")
            return GenerationResult(success=False, error_message="No audio URL in result", model_name=self.name)

        except Exception as e:
            logger.exception(f"[{self.name}] text_to_audio failed: {e}")
            return GenerationResult(success=False, error_message=str(e), model_name=self.name)

    async def check_status(self, job_id: str) -> Dict[str, Any]:
        return {"status": "completed"}

    async def health_check(self) -> bool:
        settings = get_settings()
        is_ok = bool(settings.fal_key)
        if not is_ok:
            logger.error(f"[{self.name}] Health check failed: FAL_KEY missing")
        return is_ok
