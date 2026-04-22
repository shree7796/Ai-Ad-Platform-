/**
 * Video stacks: self-hosted clips under `/videos/*`, plus Mixkit abstract loops for an “AI / creative tech” read.
 * The kids/toy B‑roll file is used in **one** place only (promo strip) in some chains; hero prefers futuristic loops first.
 */
import { gradientPoster } from '@/lib/gradientMedia';

const u1920 = 'auto=format&fit=crop&w=1920&q=85';

/**
 * Mixkit serves `-1080.mp4` for many (not all) clips. IDs verified against CDN; others stay 720p.
 */
const MIXKIT_HAS_1080 = new Set<number>([
    43120, 39714, 51612, 43535, 65, 3919, 31411, 3009, 3045,
]);

export function mixkitMp4(id: number): string {
    const q = MIXKIT_HAS_1080.has(id) ? '1080' : '720';
    return `https://assets.mixkit.co/videos/${id}/${id}-${q}.mp4`;
}

/**
 * Royalty-free abstract / neon / futuristic loops (Mixkit). 1080p where CDN allows.
 */
export const AI_CREATIVE_REMOTE_CLIPS = [
    mixkitMp4(30599),
    mixkitMp4(3919),
    mixkitMp4(31411),
    mixkitMp4(31619),
    mixkitMp4(30202),
    mixkitMp4(30197),
    mixkitMp4(30590),
    mixkitMp4(30584),
    mixkitMp4(3009),
    mixkitMp4(3045),
    mixkitMp4(30595),
] as const;

/**
 * Movie-style fighting — fencing / blades / period combat (Mixkit). **No boxing / ring footage.**
 */
export const MOVIE_FIGHT_REMOTE_CLIPS = [
    mixkitMp4(48783),
    mixkitMp4(13029),
    mixkitMp4(36754),
] as const;

/** @deprecated alias — slider “fight” tile uses movie combat, not boxing. */
export const CINEMATIC_FIGHT_REMOTE_CLIPS = MOVIE_FIGHT_REMOTE_CLIPS;

/** Slider / nature beat — aerial + landscape (no overlap with deep-ocean clips). */
export const CINEMATIC_NATURE_REMOTE_CLIPS = [mixkitMp4(43120), mixkitMp4(39714)] as const;

/** Bunny + cartoon-style B-roll (720p on Mixkit). */
export const PLAYFUL_BUNNY_CARTOON_CLIPS = [mixkitMp4(25187), mixkitMp4(14371), mixkitMp4(24323)] as const;

export const DEEP_OCEAN_REMOTE_CLIPS = [mixkitMp4(26312), mixkitMp4(9668)] as const;

export const GAMING_SHORT_REMOTE_CLIPS = [mixkitMp4(51612), mixkitMp4(43535)] as const;

/** Car / racing only — no fire VFX. */
export const CAR_ONLY_REMOTE_CLIPS = [mixkitMp4(35164), mixkitMp4(65), mixkitMp4(3175)] as const;

/** @deprecated use `CAR_ONLY_REMOTE_CLIPS` */
export const CAR_FIRE_REMOTE_CLIPS = CAR_ONLY_REMOTE_CLIPS;

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

/** Last-resort HTTPS clip when every other URL fails. */
export const REMOTE_VIDEO_FALLBACKS: string[] = ['https://samplelib.com/preview/mp4/sample-5s.mp4'];

/** Hero clip + on-screen label (movie fight → nature → bunny/cartoon → ocean → game → car — **no boxing, no fire**). */
export type HeroBackdropClip = { readonly src: string; readonly label: string };

export const LUMINA_HERO_PLAYABLE: readonly HeroBackdropClip[] = [
    { src: mixkitMp4(48783), label: 'Movie fight — fencing duel (stock)' },
    { src: mixkitMp4(13029), label: 'Movie fight — sword combat (stock)' },
    { src: mixkitMp4(36754), label: 'Movie fight — fencer training (stock)' },
    { src: mixkitMp4(43120), label: 'Nature — aerial mountains' },
    { src: mixkitMp4(39714), label: 'Nature — aerial landscape' },
    { src: mixkitMp4(25187), label: 'Bunny — playful (stock, not licensed anime)' },
    { src: mixkitMp4(14371), label: 'Bunny — meadow (stock)' },
    { src: mixkitMp4(24323), label: 'Cartoon animation — desk (stock)' },
    { src: mixkitMp4(26312), label: 'Deep ocean — open water' },
    { src: mixkitMp4(9668), label: 'Deep ocean — underwater' },
    { src: mixkitMp4(51612), label: 'Gaming — victory moment' },
    { src: mixkitMp4(43535), label: 'Gaming — squad session' },
    { src: mixkitMp4(35164), label: 'Car — race vs plane' },
    { src: mixkitMp4(65), label: 'Car — engine detail' },
    { src: mixkitMp4(3175), label: 'Car — on the road' },
    ...REMOTE_VIDEO_FALLBACKS.map((src) => ({ src, label: 'Fallback clip' })),
];

/** Flat URL list for components that only need `src[]`. */
export const LUMINA_HERO_PLAYABLE_CLIPS: string[] = LUMINA_HERO_PLAYABLE.map((c) => c.src);

/**
 * Single strip video: movie fight → nature → bunny/cartoon → deep ocean → gaming → car (**no boxing, no fire**).
 * Replaces separate fight + nature tiles so the slider isn’t dominated by duplicate or wrong clips.
 */
export const LUMINA_SLIDER_SHOWCASE_VIDEO_CHAIN = [
    ...MOVIE_FIGHT_REMOTE_CLIPS,
    ...CINEMATIC_NATURE_REMOTE_CLIPS,
    ...PLAYFUL_BUNNY_CARTOON_CLIPS,
    ...DEEP_OCEAN_REMOTE_CLIPS,
    ...GAMING_SHORT_REMOTE_CLIPS,
    ...CAR_ONLY_REMOTE_CLIPS,
    ...REMOTE_VIDEO_FALLBACKS,
];

/** @deprecated Prefer `LUMINA_SLIDER_SHOWCASE_VIDEO_CHAIN` on the homepage. */
export const LUMINA_SLIDER_FIGHT_VIDEO_CHAIN = [...CINEMATIC_FIGHT_REMOTE_CLIPS, ...REMOTE_VIDEO_FALLBACKS];

/** @deprecated Prefer `LUMINA_SLIDER_SHOWCASE_VIDEO_CHAIN` on the homepage. */
export const LUMINA_SLIDER_NATURE_VIDEO_CHAIN = [...CINEMATIC_NATURE_REMOTE_CLIPS, ...REMOTE_VIDEO_FALLBACKS];

/** Hero poster — neutral cinematic (not boxing gym, not bright park foliage). */
export const AI_HERO_VIDEO_POSTER =
    `https://images.unsplash.com/photo-1536440136628-849c177e76a1?${u1920}`;

/**
 * Homepage hero + “Lumina Vid 2” card: **AI-native motion first** (remote), then self-hosted B-roll, then fallback.
 */
export const LUMINA_HERO_VIDEO_CHAIN = [
    ...AI_CREATIVE_REMOTE_CLIPS,
    ...HERO_AMBIENT_CLIPS,
    LOCAL_KIDS_TOY_CLIP,
    ...REMOTE_VIDEO_FALLBACKS,
];

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
