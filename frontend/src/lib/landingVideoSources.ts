/**
 * Video stacks: self-hosted clips. The kids/toy B‑roll file is used in **one** place only (promo strip);
 * hero + dark sections use city, ocean, flower, abstract, and forest — no repeat of the same “pet” clip everywhere.
 */
import { gradientPoster } from '@/lib/gradientMedia';

const u1920 = 'auto=format&fit=crop&w=1920&q=85';

/** Distinct stills for the two “Explore the stack” cards (not matching gradient rectangles). */
export const DARK_CARD_FLUX_POSTER =
    `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?${u1920}`;
export const DARK_CARD_DEPTH_POSTER =
    `https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?${u1920}`;

/** CC0 sample from MDN (flower). */
export const LOCAL_CLIP_FLOWER = '/videos/cc0-flower.mp4';

/**
 * Toy / retail‑style B‑roll (studio product motion — **not** pet footage).
 * Single placement on the homepage: promo strip lead. File: `toy-shelf-broll.mp4`.
 */
export const LOCAL_KIDS_TOY_CLIP = '/videos/toy-shelf-broll.mp4';

export const LOCAL_HERO_CLIP = '/videos/hero-city-uhd.mp4';
export const LOCAL_PROMO_CLIP = '/videos/promo-ocean-uhd.mp4';

/** Abstract particles / premium filler — distinct from toy and nature shots. */
export const LOCAL_CLIP_ABSTRACT = '/videos/abstract-dust.mp4';

/** Forest / aerial green B‑roll — distinct from city + ocean. */
export const LOCAL_CLIP_FOREST = '/videos/forest-aerial.mp4';

/**
 * Hero ambient + fallbacks: **no** kids/toy clip here (avoids repeating the same reel 3×).
 */
export const HERO_AMBIENT_CLIPS = [
    LOCAL_HERO_CLIP,
    LOCAL_PROMO_CLIP,
    LOCAL_CLIP_FLOWER,
    LOCAL_CLIP_ABSTRACT,
    LOCAL_CLIP_FOREST,
] as const;

export const REMOTE_VIDEO_FALLBACKS: string[] = [];

export const FREE_STOCK_MP4S: readonly string[] = [...HERO_AMBIENT_CLIPS, LOCAL_KIDS_TOY_CLIP];
export const CINEMATIC_REFERENCE_MP4S = FREE_STOCK_MP4S;

export const CINEMATIC_REFERENCE_POSTER = gradientPoster(275, 310);
export const PROMO_STRIP_POSTER = gradientPoster(305, 268);

export const LOCAL_COMPARE_CLIP = LOCAL_HERO_CLIP;
export const LOCAL_BAND_CLIP = LOCAL_PROMO_CLIP;

/** Full-bleed hero: city → ocean → flower → abstract → forest. */
export const FULL_HERO_VIDEO_CHAIN = [...HERO_AMBIENT_CLIPS, ...REMOTE_VIDEO_FALLBACKS];

/**
 * Mid-page strip: **only surface** that opens on the kids/toy clip, then other locals.
 * (One “catalog / toy aisle” moment — not duplicated in dark showcase.)
 */
export const PROMO_STRIP_VIDEO_CHAIN = [
    LOCAL_KIDS_TOY_CLIP,
    LOCAL_PROMO_CLIP,
    LOCAL_CLIP_ABSTRACT,
    LOCAL_HERO_CLIP,
    LOCAL_CLIP_FLOWER,
    LOCAL_CLIP_FOREST,
    ...REMOTE_VIDEO_FALLBACKS,
];

/**
 * Top-left “Flux” card: **city night first** (clearly different from forest/ocean opens).
 * Top-right “Depth” card: **forest first** — never the same opening frame as Flux.
 */
export const DARK_SHOWCASE_LEFT_CHAIN = [
    LOCAL_HERO_CLIP,
    LOCAL_CLIP_ABSTRACT,
    LOCAL_CLIP_FOREST,
    LOCAL_CLIP_FLOWER,
    LOCAL_PROMO_CLIP,
    ...REMOTE_VIDEO_FALLBACKS,
];

export const DARK_SHOWCASE_RIGHT_CHAIN = [
    LOCAL_CLIP_FOREST,
    LOCAL_PROMO_CLIP,
    LOCAL_HERO_CLIP,
    LOCAL_CLIP_FLOWER,
    LOCAL_CLIP_ABSTRACT,
    ...REMOTE_VIDEO_FALLBACKS,
];

export const DARK_SHOWCASE_CENTER_CHAIN = [
    LOCAL_PROMO_CLIP,
    LOCAL_CLIP_FOREST,
    LOCAL_CLIP_FLOWER,
    LOCAL_CLIP_ABSTRACT,
    LOCAL_HERO_CLIP,
    ...REMOTE_VIDEO_FALLBACKS,
];

/** Posters for “AI ads” landing tiles (product / retail stills). */
export const AI_ADS_VIDEO_PRODUCT_POSTER =
    `https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?${u1920}`;
export const AI_ADS_VIDEO_SOCIAL_POSTER =
    `https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?${u1920}`;
export const AI_ADS_VIDEO_CAMPAIGN_POSTER =
    `https://images.unsplash.com/photo-1578662996442-48f60103fc96?${u1920}`;

/**
 * AI ecommerce ads section — **three different video stacks** (product spots, social motion, brand hero).
 */
/** Lead with city + abstract so the first tile is not the same clip as `PROMO_STRIP_VIDEO_CHAIN` (toy B-roll). */
export const AI_ADS_PRODUCT_FILM_CHAIN = [
    LOCAL_HERO_CLIP,
    LOCAL_CLIP_ABSTRACT,
    LOCAL_KIDS_TOY_CLIP,
    LOCAL_PROMO_CLIP,
    LOCAL_CLIP_FLOWER,
    LOCAL_CLIP_FOREST,
    ...REMOTE_VIDEO_FALLBACKS,
];

/** Lead with forest/flower so the first tile is not the same as strip #2 (ocean). */
export const AI_ADS_SOCIAL_MOTION_CHAIN = [
    LOCAL_CLIP_FOREST,
    LOCAL_CLIP_FLOWER,
    LOCAL_PROMO_CLIP,
    LOCAL_KIDS_TOY_CLIP,
    LOCAL_CLIP_ABSTRACT,
    LOCAL_HERO_CLIP,
    ...REMOTE_VIDEO_FALLBACKS,
];

export const AI_ADS_CAMPAIGN_HERO_CHAIN = [
    LOCAL_CLIP_FLOWER,
    LOCAL_HERO_CLIP,
    LOCAL_PROMO_CLIP,
    LOCAL_CLIP_ABSTRACT,
    LOCAL_CLIP_FOREST,
    LOCAL_KIDS_TOY_CLIP,
    ...REMOTE_VIDEO_FALLBACKS,
];
