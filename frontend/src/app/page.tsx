'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import LandingNav from '@/components/landing/LandingNav';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import {
    HOMEPAGE_HERO_PLAYABLE,
    HOMEPAGE_HERO_CLIPS,
    HOMEPAGE_HERO_POSTER,
    HOMEPAGE_SLIDER_VIDEO_CHAIN,
    HOMEPAGE_SLIDER_VIDEO_POSTERS,
    HOMEPAGE_USE_CASE_VIDEO_CHAIN,
    HOMEPAGE_USE_CASE_VIDEO_POSTERS,
    STOCK_FOOTAGE_BROWSE_TILES,
    STOCK_FOOTAGE_LICENSE,
    MIXKIT_FREE_VIDEO_HUB,
    type StockBrowseTile,
} from '@/lib/landingVideoSources';

// ─── Unsplash helpers ─────────────────────────────────────────────────────────
const UQ = 'auto=format&fit=crop&q=88';
const US = (id: string, w = 600, h = 480) =>
    `https://images.unsplash.com/${id}?${UQ}&w=${w}&h=${h}`;

// ─── Hero prompt cards data (cinematic stills + fight / nature video tiles) ──
const PROMPT_CARDS = [
    {
        type: 'image' as const,
        modelTag: 'Lumina 1',
        prompt: 'Cold open- city lost in slate fog, anamorphic haze',
        src: US('photo-1534438327276-14e5300c3a48', 960, 1080),
        href: '/studio?tab=text-to-image',
    },
    {
        type: 'video' as const,
        modelTag: 'Lumina Vid 2',
        prompt: 'Cinematic motion from your prompts- carousel uses eight Mixkit clips not used in the hero (Mixkit License)',
        srcs: HOMEPAGE_SLIDER_VIDEO_CHAIN,
        posters: HOMEPAGE_SLIDER_VIDEO_POSTERS,
        href: '/studio?tab=text-to-video',
    },
    {
        type: 'image' as const,
        modelTag: 'FLUX Pro',
        prompt: 'Wide glass- pine forest, volumetric sun, 2.39:1 still',
        src: US('photo-1441974231531-c6227db76b6e', 960, 1080),
        href: '/studio?tab=text-to-image',
    },
    {
        type: 'upscale' as const,
        modelTag: 'Topaz Upscaler',
        prompt: 'Film grain resolve- 16mm scan to clean 8K plate',
        src: US('photo-1620712943543-bcc4688e7485', 960, 1080),
        href: '/studio',
    },
    {
        type: 'image' as const,
        modelTag: 'Hailuo',
        prompt: 'Macro product splash- citrus burst, studio strobes',
        src: US('photo-1620916566398-39f1143ab7be', 960, 1080),
        href: '/studio?tab=text-to-image',
    },
    {
        type: 'image' as const,
        modelTag: 'Runway Gen-4',
        prompt: 'Alpine ridge silhouette- teal shadows, storm light',
        src: US('photo-1464822759023-fed622ff2c3b', 960, 1080),
        href: '/studio?tab=text-to-image',
    },
    {
        type: 'image' as const,
        modelTag: 'Ideogram v3',
        prompt: 'Sprint silhouette- sodium flare, motion blur trail',
        src: US('photo-1544367567-0f2fcb009e0b', 960, 1080),
        href: '/studio?tab=text-to-image',
    },
    {
        type: 'image' as const,
        modelTag: 'Gemini 2.0',
        prompt: 'Glass atrium at blue hour- reflections, long exposure',
        src: US('photo-1480714378408-67cf0d13bc1b', 960, 1080),
        href: '/studio?tab=text-to-image',
    },
    {
        type: 'image' as const,
        modelTag: 'Lumina 1',
        prompt: 'Mist river valley- dawn palette, ultra-wide composition',
        src: US('photo-1469474968028-56623f02e42e', 960, 1080),
        href: '/studio?tab=text-to-image',
    },
    {
        type: 'image' as const,
        modelTag: 'Stable Diffusion 3',
        prompt: 'Golden-hour meadow- long lens compression, film halation',
        src: US('photo-1472214103451-9374bd1c798e', 960, 1080),
        href: '/studio?tab=text-to-image',
    },
    {
        type: 'image' as const,
        modelTag: 'Sora',
        prompt: 'Summit push- last light on snow, IMAX-scale scope',
        src: US('photo-1506905925346-21bda4d32df4', 960, 1080),
        href: '/studio?tab=text-to-image',
    },
];

// ─── Cycling headline words ───────────────────────────────────────────────────
const CYCLE_WORDS = ['Image', 'Video', '3D', 'Ad', 'Creative'];

// ─── Model logos ticker ───────────────────────────────────────────────────────
const MODELS = [
    'FLUX Pro', 'Runway Gen-4', 'Luma Dream', 'Kling 2.0',
    'Ideogram v3', 'GPT-4o', 'Gemini 2.0', 'Sora',
    'Hailuo', 'Wan 2.1', 'DALL·E 3', 'Stable Diffusion 3',
];

// ─── Feature badges ───────────────────────────────────────────────────────────
const FEATURE_BADGES = [
    { text: 'Industry-leading inference speed', icon: '⚡' },
    { text: '4K Native image generation', icon: '🖼' },
    { text: 'Train on your own brand data', icon: '🧠' },
    { text: '22K Pixel upscaling', icon: '✨' },
    { text: 'Minimalist UI', icon: '◻' },
    { text: 'Full-fledged asset manager', icon: '📁' },
    { text: 'Bleeding Edge models', icon: '🔬' },
    { text: '64+ Models', icon: '🌐' },
    { text: 'Do not train- safe for brands', icon: '🛡' },
    { text: '1,000+ styles', icon: '🎨' },
    { text: 'Realtime Canvas', icon: '⚡' },
    { text: 'Text to 3D', icon: '🧊' },
];

// ─── Tool cards ───────────────────────────────────────────────────────────────
const TOOLS = [
    { name: 'Image Generator', icon: '🖼', href: '/studio' },
    { name: 'Video Generator', icon: '🎬', href: '/studio' },
    { name: 'Realtime Canvas', icon: '⚡', href: '/vstudio' },
    { name: 'AI Upscaler', icon: '✨', href: '/studio' },
    { name: 'Image Editor', icon: '✏️', href: '/studio' },
    { name: 'Brand Fine-tuning', icon: '🧠', href: '/studio' },
    { name: 'Asset Manager', icon: '📁', href: '/studio' },
    { name: 'Text to 3D', icon: '🧊', href: '/studio' },
];

// ─── Logo cloud ───────────────────────────────────────────────────────────────
const CLIENT_LOGOS = ['Nike', 'Samsung', "L'Oréal", 'Shopify', 'Microsoft', 'LEGO', 'Spotify', 'Airbnb'];

// ─── Use cases ────────────────────────────────────────────────────────────────
const USE_CASES = [
    {
        title: 'AI Image Generation',
        desc: 'Generate campaign-ready images from any prompt. Control style, lighting, and composition with over 1,000 aesthetics, 20+ models, and native 4K output. Industry-fastest generation at under 3 seconds.',
        cta: 'Try AI Image Generation',
        href: '/studio',
        src: US('photo-1523275335684-37898b6baf30', 900, 600),
    },
    {
        title: 'Image Upscaling',
        desc: 'Upscale and enhance images up to 4K resolution. Razor-sharp product shots, ultra-fine textures, and photo-realistic output from 7 different upscaling models.',
        cta: 'Try Image Upscaling',
        href: '/studio',
        src: US('photo-1595950653106-6c9ebd614d3a', 900, 600),
    },
    {
        title: 'Real-time Rendering',
        desc: 'See your ad take shape as you type. Sub-50ms realtime generation lets you iterate instantly- the fastest creative feedback loop in the industry.',
        cta: 'Try Real-time Rendering',
        href: '/vstudio',
        src: US('photo-1460925895917-afdab827c52f', 900, 600),
    },
    {
        title: 'AI Video Generation',
        desc: 'Access Runway Gen-4, Kling 2.0, Hailuo, Wan, and Luma in one interface. Generate viral video ads, animate stills, or add motion to existing creatives.',
        cta: 'Try AI Video Generation',
        href: '/studio',
        srcs: HOMEPAGE_USE_CASE_VIDEO_CHAIN,
        videoPosters: HOMEPAGE_USE_CASE_VIDEO_POSTERS,
    },
    {
        title: 'Brand Fine-tuning',
        desc: 'Train your own model on your brand assets. Upload a few images of your logo, product, or visual style and generate it on demand- every time, perfectly on-brand.',
        cta: 'Try Brand Fine-tuning',
        href: '/studio',
        src: US('photo-1612817288484-6f916006741a', 900, 600),
    },
    {
        title: 'Video Upscaling',
        desc: 'Upscale videos up to 4K and interpolate frames for smoother motion. Turn phone footage into broadcast-quality ad material.',
        cta: 'Try Video Upscaling',
        href: '/studio',
        srcs: HOMEPAGE_USE_CASE_VIDEO_CHAIN,
        videoPosters: HOMEPAGE_USE_CASE_VIDEO_POSTERS,
    },
    {
        title: 'Generative Editing',
        desc: 'Edit images with AI- inpaint, outpaint, change backgrounds, swap products, or adjust lighting. 10+ editing models in an exceptionally simple interface.',
        cta: 'Try Generative Editing',
        href: '/studio',
        src: US('photo-1584917865442-de89df76afd3', 900, 600),
    },
];

// ─── Plans (from plans.yaml) ──────────────────────────────────────────────────
const PLANS = [
    {
        key: 'free',
        name: 'Free',
        tagline: 'Get free daily credits to try basic features.',
        price: '$0',
        per: '/month',
        credit: null as string | null,
        features: [
            '8 image generations / month',
            '2 video generations / month',
            'Basic AI models only',
            'Image to 3D- not included',
            'Story Studio- not included',
            'Lumina watermark on output',
        ],
        cta: 'Start for Free',
        href: '/register',
        highlight: false,
    },
    {
        key: 'basic',
        name: 'Basic',
        tagline: 'Access our most popular features.',
        price: '$15',
        per: '/month',
        credit: '1,200',
        features: [
            '1,200 credits / month',
            '90 image generations',
            '12 video units (15s each)',
            'Image to 3D  ·  28–40 ⚡ per run',
            'Story Studio  ·  340–540 ⚡ per story',
            'No watermark',
        ],
        cta: 'Get Basic',
        href: '/studio/billing',
        highlight: false,
    },
    {
        key: 'pro',
        name: 'Pro',
        tagline: 'Advanced features and priority queue.',
        price: '$30',
        per: '/month',
        credit: '3,200',
        features: [
            '3,200 credits / month',
            '240 image generations',
            '20 video units (15s each)',
            'Image to 3D  ·  28–40 ⚡ per run',
            'Story Studio  ·  340–540 ⚡ per story',
            'Pro & Basic AI models',
            'Priority generation queue',
        ],
        cta: 'Get Pro',
        href: '/studio/billing',
        highlight: true,
    },
    {
        key: 'studio',
        name: 'Studio',
        tagline: 'Full creative studio, all models unlocked.',
        price: '$59',
        per: '/month',
        credit: '7,000',
        features: [
            '7,000 credits / month',
            '520 image generations',
            '40 video units (15s each)',
            'Image to 3D  ·  28–40 ⚡ per run',
            'Story Studio  ·  340–830 ⚡ per story',
            'All AI models unlocked',
            'Up to 60s video length',
        ],
        cta: 'Get Studio',
        href: '/studio/billing',
        highlight: false,
    },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: '-50px' });
    return (
        <motion.div
            ref={ref}
            className={className}
            initial={{ opacity: 0, y: 22 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay, ease: [0.16, 1, 0.3, 1] }}
        >
            {children}
        </motion.div>
    );
}

/** Long enough to read each beat (incl. labeled fight / bunny / ocean / game / car / fire). */
const HERO_CLIP_HOLD_MS = 5200;
/** Film-style dissolve- both layers keep decoding through the blend. */
const HERO_CROSSFADE_MS = 1500;
const HERO_CROSSFADE_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
/** Let the incoming clip render a frame before opacity rises (reduces “pop”). */
const HERO_FADE_PREROLL_MS = 320;
/** If `canplay` never fires (same-URL reload quirk), unstick the crossfade. */
const HERO_VIDEO_READY_FALLBACK_MS = 2200;

/* Use % of the clipped hero box- `100vw` overflows horizontally on mobile (scrollbar / rounding). */
const heroVideoFrame: React.CSSProperties = {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: '100%',
    height: '100%',
    minWidth: '100%',
    minHeight: '100%',
    maxWidth: 'none',
    transform: 'translate3d(-50%, -50%, 0)',
    objectFit: 'cover',
    objectPosition: 'center',
    willChange: 'opacity',
    backfaceVisibility: 'hidden',
    WebkitBackfaceVisibility: 'hidden',
};

/** Muted loop; stable element- `onLoadedData` + `useEffect` so clip 2+ always kicks `play()` after src change. */
function AutoVideo({
    srcs,
    posters,
    style,
}: {
    srcs: readonly string[];
    /** Optional still per `srcs` slot (e.g. gradient poster)- avoids empty grey until MP4 decodes. */
    posters?: readonly string[];
    style?: React.CSSProperties;
}) {
    const [idx, setIdx] = useState(0);
    const vRef = useRef<HTMLVideoElement>(null);
    const src = srcs[idx] ?? srcs[0];
    const poster =
        posters && posters.length > 0 ? posters[Math.min(idx, posters.length - 1)] : undefined;

    useEffect(() => {
        const v = vRef.current;
        if (!v) return;
        void v.play().catch(() => {});
    }, [src]);

    return (
        <video
            ref={vRef}
            src={src}
            poster={poster}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onError={() => setIdx((i) => Math.min(i + 1, srcs.length - 1))}
            onLoadedData={() => void vRef.current?.play().catch(() => {})}
            style={{
                ...style,
                transform: 'translateZ(0)',
                WebkitTransform: 'translateZ(0)',
            }}
        />
    );
}

/**
 * Two stacked videos + opacity crossfade- Mixkit on homepage (see HOMEPAGE_* in landingVideoSources).
 */
function HeroVideoBackdrop() {
    const clips = HOMEPAGE_HERO_CLIPS;
    const n = clips.length;
    const [ia, setIa] = useState(0);
    const [ib, setIb] = useState(() => (n > 1 ? 1 % n : 0));
    const [aOnTop, setAOnTop] = useState(true);
    const rA = useRef<HTMLVideoElement>(null);
    const rB = useRef<HTMLVideoElement>(null);
    const busy = useRef(false);
    const iaR = useRef(0);
    const ibR = useRef(n > 1 ? 1 % n : 0);
    const aTopR = useRef(true);

    useEffect(() => {
        iaR.current = ia;
    }, [ia]);
    useEffect(() => {
        ibR.current = ib;
    }, [ib]);
    useEffect(() => {
        aTopR.current = aOnTop;
    }, [aOnTop]);

    useEffect(() => {
        void rA.current?.play().catch(() => {});
        void rB.current?.play().catch(() => {});
    }, []);

    useEffect(() => {
        void rA.current?.play().catch(() => {});
    }, [ia]);

    useEffect(() => {
        void rB.current?.play().catch(() => {});
    }, [ib]);

    useEffect(() => {
        if (n < 2) return undefined;
        const step = () => {
            if (busy.current) return;
            const showA = aTopR.current;
            const visIdx = showA ? iaR.current : ibR.current;
            const nextIdx = (visIdx + 1) % n;
            const el = (showA ? rB : rA).current;
            if (!el) return;
            busy.current = true;

            const hiddenIdx = showA ? ibR.current : iaR.current;
            const needsNewSrc = hiddenIdx !== nextIdx;

            if (needsNewSrc) {
                el.src = clips[nextIdx];
                if (showA) {
                    ibR.current = nextIdx;
                    setIb(nextIdx);
                } else {
                    iaR.current = nextIdx;
                    setIa(nextIdx);
                }
                el.load();
            } else {
                try {
                    el.currentTime = 0;
                } catch {
                    /* ignore */
                }
            }

            const runCrossfade = () => {
                try {
                    el.currentTime = 0;
                } catch {
                    /* ignore */
                }
                void el.play().catch(() => {});
                window.setTimeout(() => {
                    aTopR.current = !showA;
                    setAOnTop(!showA);
                }, HERO_FADE_PREROLL_MS);
                window.setTimeout(() => {
                    const preloadIdx = (nextIdx + 1) % n;
                    const outgoing = (showA ? rA : rB).current;
                    if (outgoing) {
                        const outIdx = showA ? iaR.current : ibR.current;
                        if (outIdx !== preloadIdx) {
                            outgoing.src = clips[preloadIdx];
                            if (showA) {
                                iaR.current = preloadIdx;
                                setIa(preloadIdx);
                            } else {
                                ibR.current = preloadIdx;
                                setIb(preloadIdx);
                            }
                            outgoing.load();
                        }
                        try {
                            outgoing.pause();
                            outgoing.currentTime = 0;
                        } catch {
                            /* ignore */
                        }
                    }
                    busy.current = false;
                }, HERO_FADE_PREROLL_MS + HERO_CROSSFADE_MS);
            };

            let done = false;
            let failSafeId: number | null = null;
            const finish = () => {
                if (done) return;
                done = true;
                if (failSafeId !== null) window.clearTimeout(failSafeId);
                runCrossfade();
            };

            if (!needsNewSrc && el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
                finish();
                return;
            }
            if (el.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
                finish();
                return;
            }

            el.addEventListener('canplay', finish, { once: true });
            failSafeId = window.setTimeout(finish, HERO_VIDEO_READY_FALLBACK_MS) as unknown as number;
        };
        const id = window.setInterval(step, HERO_CLIP_HOLD_MS);
        return () => clearInterval(id);
    }, [clips, n]);

    if (n < 2) {
        return (
            <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#030305' }}>
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${HOMEPAGE_HERO_POSTER})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                <video
                    src={clips[0]}
                    poster={HOMEPAGE_HERO_POSTER}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    onLoadedData={(e) => void (e.target as HTMLVideoElement).play().catch(() => {})}
                    style={heroVideoFrame}
                />
            </div>
        );
    }

    const ease = `opacity ${HERO_CROSSFADE_MS}ms ${HERO_CROSSFADE_EASE}`;
    const heroLabel = HOMEPAGE_HERO_PLAYABLE[aOnTop ? ia : ib]?.label ?? '';

    return (
        <>
            <div aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#030305' }}>
                <div
                    style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `url(${HOMEPAGE_HERO_POSTER})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                <video
                    ref={rA}
                    src={clips[ia]}
                    poster={HOMEPAGE_HERO_POSTER}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    onLoadedData={() => void rA.current?.play().catch(() => {})}
                    onCanPlay={() => void rA.current?.play().catch(() => {})}
                    style={{
                        ...heroVideoFrame,
                        zIndex: aOnTop ? 2 : 1,
                        opacity: aOnTop ? 1 : 0,
                        transition: ease,
                    }}
                />
                <video
                    ref={rB}
                    src={clips[ib]}
                    poster={HOMEPAGE_HERO_POSTER}
                    autoPlay
                    muted
                    loop
                    playsInline
                    preload="auto"
                    onLoadedData={() => void rB.current?.play().catch(() => {})}
                    onCanPlay={() => void rB.current?.play().catch(() => {})}
                    style={{
                        ...heroVideoFrame,
                        zIndex: aOnTop ? 1 : 2,
                        opacity: aOnTop ? 0 : 1,
                        transition: ease,
                    }}
                />
            </div>
            <div
                aria-live="polite"
                style={{
                    position: 'absolute',
                    left: '50%',
                    bottom: 'max(28px, 5vh)',
                    transform: 'translateX(-50%)',
                    zIndex: 4,
                    pointerEvents: 'none',
                    maxWidth: 'min(92vw, 520px)',
                    textAlign: 'center',
                }}
            >
                <span
                    style={{
                        display: 'inline-block',
                        padding: '8px 16px',
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.92)',
                        background: 'rgba(0,0,0,0.42)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        lineHeight: 1.35,
                    }}
                >
                    {heroLabel}
                </span>
            </div>
        </>
    );
}

/** Hover-to-preview tile- Mixkit MP4 + poster; opens Mixkit free-video browse. */
function StockBrowseTileCard({ tile }: { tile: StockBrowseTile }) {
    const vRef = useRef<HTMLVideoElement>(null);
    const [hover, setHover] = useState(false);

    const onEnter = () => {
        setHover(true);
        const v = vRef.current;
        if (v) {
            v.preload = 'auto';
            v.load();
            void v.play().catch(() => {});
        }
    };
    const onLeave = () => {
        setHover(false);
        const v = vRef.current;
        if (!v) return;
        v.pause();
        try {
            v.currentTime = 0;
        } catch {
            /* ignore */
        }
    };

    return (
        <a
            href={tile.moreUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${tile.title}- browse royalty-free stock video (${tile.tag})`}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            style={{
                display: 'block',
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: 0,
                textDecoration: 'none',
                color: 'inherit',
            }}
        >
            <video
                ref={vRef}
                src={tile.mp4}
                poster={tile.poster}
                muted
                loop
                playsInline
                preload="none"
                aria-hidden
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: hover ? 1 : 0,
                    transition: 'opacity 0.35s ease',
                }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={tile.poster}
                alt=""
                aria-hidden
                loading="eager"
                decoding="async"
                style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: hover ? 0 : 1,
                    transition: 'opacity 0.35s ease',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.78) 100%)',
                    pointerEvents: 'none',
                }}
            />
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                    opacity: hover ? 0 : 1,
                    transition: 'opacity 0.28s ease',
                }}
                aria-hidden
            >
                <div
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                    }}
                >
                    <Play size={22} fill="rgba(255,255,255,0.95)" color="rgba(255,255,255,0.95)" style={{ marginLeft: 3 }} strokeWidth={0} />
                </div>
            </div>
            <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14, pointerEvents: 'none' }}>
                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.78)',
                        marginBottom: 6,
                    }}
                >
                    {tile.tag}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em', lineHeight: 1.25 }}>
                    {tile.title}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>
                    More free clips →
                </div>
            </div>
        </a>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
    const [cycleIdx, setCycleIdx] = useState(0);
    const [activeUC, setActiveUC] = useState(0);
    const galleryRef = useRef<HTMLDivElement>(null);

    const scrollGallery = (dir: number) => {
        const el = galleryRef.current;
        if (!el) return;
        el.scrollBy({ left: dir * 408, behavior: 'smooth' });
    };

    useEffect(() => {
        const t = setInterval(() => setCycleIdx((i) => (i + 1) % CYCLE_WORDS.length), 2200);
        return () => clearInterval(t);
    }, []);

    const uc = USE_CASES[activeUC];

    return (
        <main
            style={{
                background: '#ffffff',
                color: '#0a0a0a',
                minHeight: '100vh',
                fontFamily: 'Inter, system-ui, sans-serif',
                WebkitFontSmoothing: 'antialiased',
                overflowX: 'hidden',
            }}
        >
            <LandingNav />

            {/* Hero: full-bleed ambient video + copy (Runway-style) */}
            <section
                id="krea-hero"
                style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 'min(100svh, 1080px)',
                    overflow: 'hidden',
                }}
            >
                <HeroVideoBackdrop />
                <div
                    aria-hidden
                    style={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 1,
                        background: [
                            'linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 32%, rgba(0,0,0,0.5) 62%, rgba(250,250,250,0.88) 92%, #ffffff 100%)',
                            'radial-gradient(ellipse 90% 70% at 50% 20%, rgba(0,0,0,0.15) 0%, transparent 55%)',
                        ].join(', '),
                        pointerEvents: 'none',
                    }}
                />
                <div
                    style={{
                        position: 'relative',
                        zIndex: 2,
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: 'clamp(96px, 13vh, 128px) max(24px, 4vw) clamp(48px, 10vh, 88px)',
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                        style={{ maxWidth: 920, margin: '0 auto' }}
                    >
                        <h1
                            style={{
                                fontSize: 'clamp(2.2rem, 5.6vw, 3.75rem)',
                                fontWeight: 700,
                                lineHeight: 1.06,
                                letterSpacing: '-0.04em',
                                color: '#fafafa',
                                margin: '0 0 20px',
                            }}
                        >
                            Lumina is the world&apos;s most powerful creative AI suite.
                        </h1>
                        <p
                            style={{
                                fontSize: 'clamp(1.02rem, 2.1vw, 1.22rem)',
                                color: 'rgba(255,255,255,0.65)',
                                lineHeight: 1.62,
                                margin: '0 auto 36px',
                                maxWidth: 560,
                                fontWeight: 400,
                            }}
                        >
                            Generate, enhance, and edit images, videos, or 3D meshes for free with AI.
                        </p>
                        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link href="/register" style={{ textDecoration: 'none' }}>
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        padding: '13px 30px',
                                        borderRadius: 9999,
                                        background: '#ffffff',
                                        color: '#0a0a0a',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        border: 'none',
                                        cursor: 'pointer',
                                        letterSpacing: '-0.02em',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    Start for free
                                </motion.button>
                            </Link>
                            <Link href="/studio" style={{ textDecoration: 'none' }}>
                                <motion.button
                                    type="button"
                                    whileHover={{ background: 'rgba(255,255,255,0.1)' }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        padding: '13px 30px',
                                        borderRadius: 9999,
                                        background: 'transparent',
                                        color: '#ffffff',
                                        fontSize: 14,
                                        fontWeight: 600,
                                        border: '1px solid rgba(255,255,255,0.48)',
                                        cursor: 'pointer',
                                        letterSpacing: '-0.02em',
                                        transition: 'background 0.15s',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    Launch App
                                </motion.button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Gallery */}
            <section
                style={{
                    background: 'linear-gradient(180deg, #fafafa 0%, #ffffff 48px)',
                    paddingTop: 0,
                    paddingBottom: 40,
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div
                        ref={galleryRef}
                        style={{
                            overflowX: 'auto',
                            display: 'flex',
                            gap: 24,
                            padding: '32px max(24px, 4vw) 20px',
                            scrollbarWidth: 'none',
                            WebkitOverflowScrolling: 'touch',
                            scrollSnapType: 'x mandatory',
                            scrollBehavior: 'smooth',
                            scrollPaddingLeft: 'max(24px, 4vw)',
                            scrollPaddingRight: 'max(24px, 4vw)',
                        }}
                        className="prompt-strip"
                    >
                        {PROMPT_CARDS.map((card, i) => (
                            <Link
                                key={`${card.modelTag}-${i}`}
                                href={card.href}
                                style={{ textDecoration: 'none', flexShrink: 0, scrollSnapAlign: 'start' }}
                                data-card
                            >
                                <motion.div
                                    whileHover={{ y: -4 }}
                                    style={{
                                        width: 384,
                                        borderRadius: 24,
                                        border: '1px solid rgba(0,0,0,0.06)',
                                        background: '#f4f4f5',
                                        overflow: 'hidden',
                                        cursor: 'pointer',
                                        boxShadow: '0 12px 40px rgba(0,0,0,0.1)',
                                    }}
                                >
                                    <div style={{ position: 'relative', height: 400, background: '#e5e5e5', overflow: 'hidden' }}>
                                        {card.type === 'video' && 'srcs' in card ? (
                                            <AutoVideo
                                                srcs={card.srcs!}
                                                posters={'posters' in card ? (card as { posters?: readonly string[] }).posters : undefined}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                            />
                                        ) : (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={(card as { src: string }).src} alt={card.prompt} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} loading="eager" />
                                        )}
                                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, transparent 50%)', pointerEvents: 'none' }} />
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: 14,
                                                left: 14,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 7,
                                                background: 'rgba(0,0,0,0.52)',
                                                backdropFilter: 'blur(12px)',
                                                borderRadius: 9999,
                                                padding: '7px 14px',
                                                fontSize: 13,
                                                fontWeight: 600,
                                                color: 'rgba(255,255,255,0.96)',
                                                letterSpacing: '0.01em',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    width: 8,
                                                    height: 8,
                                                    borderRadius: 99,
                                                    flexShrink: 0,
                                                    background: 'rgba(255,255,255,0.9)',
                                                    boxShadow: '0 0 0 1px rgba(255,255,255,0.35)',
                                                }}
                                            />
                                            {card.modelTag}
                                        </div>
                                        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
                                            <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#ffffff', lineHeight: 1.38, letterSpacing: '-0.02em', textAlign: 'left' }}>
                                                {card.prompt}
                                            </p>
                                        </div>
                                        {card.type === 'video' && (
                                            <div style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', borderRadius: 99, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                                                <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#f87171' }} />
                                                <span style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.06em' }}>VIDEO</span>
                                            </div>
                                        )}
                                        {card.type === 'upscale' && (
                                            <div style={{ position: 'absolute', top: 52, left: 14, background: 'rgba(255,255,255,0.96)', borderRadius: 8, padding: '6px 11px', fontSize: 11, fontWeight: 700, color: '#0a0a0a' }}>
                                                512px → 8K
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: `0 max(24px, 4vw) 8px` }}>
                        <button
                            type="button"
                            aria-label="Previous examples"
                            onClick={() => scrollGallery(-1)}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 99,
                                border: '1px solid rgba(0,0,0,0.1)',
                                background: '#f4f4f5',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#525252',
                            }}
                        >
                            <ChevronLeft size={20} strokeWidth={1.75} />
                        </button>
                        <button
                            type="button"
                            aria-label="Next examples"
                            onClick={() => scrollGallery(1)}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 99,
                                border: '1px solid rgba(0,0,0,0.1)',
                                background: '#f4f4f5',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#525252',
                            }}
                        >
                            <ChevronRight size={20} strokeWidth={1.75} />
                        </button>
                    </div>
                </motion.div>
            </section>

            {/* Free stock video- Mixkit hover grid (disjoint from hero / carousel / use-case) */}
            <section
                style={{
                    background: 'linear-gradient(180deg, #ffffff 0%, #f4f4f5 100%)',
                    padding: '72px max(24px, 4vw) 64px',
                    borderTop: '1px solid rgba(0,0,0,0.06)',
                }}
            >
                <div style={{ maxWidth: 1160, margin: '0 auto' }}>
                    <p
                        style={{
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.18em',
                            color: '#9ca3af',
                            textTransform: 'uppercase',
                            margin: '0 0 12px',
                            textAlign: 'center',
                        }}
                    >
                        Free stock footage
                    </p>
                    <h2
                        style={{
                            fontSize: 'clamp(1.5rem, 3vw, 2.25rem)',
                            fontWeight: 700,
                            letterSpacing: '-0.03em',
                            margin: '0 0 12px',
                            textAlign: 'center',
                            color: '#0a0a0a',
                            lineHeight: 1.15,
                        }}
                    >
                        Royalty-free stock video
                    </h2>
                    <p
                        style={{
                            fontSize: 15,
                            color: '#6b7280',
                            margin: '0 auto 10px',
                            maxWidth: 640,
                            textAlign: 'center',
                            lineHeight: 1.6,
                        }}
                    >
                        Hover for a muted Mixkit loop; stills are preview photos (Unsplash) so tiles stay readable before video loads. Open a tile for{' '}
                        <a href={MIXKIT_FREE_VIDEO_HUB} target="_blank" rel="noopener noreferrer" style={{ color: '#0a0a0a', fontWeight: 600 }}>
                            Mixkit&apos;s free library
                        </a>
                        . Video files stream from Mixkit&apos;s CDN (720p/1080p MP4).{' '}
                        <a href={STOCK_FOOTAGE_LICENSE.mixkit} target="_blank" rel="noopener noreferrer" style={{ color: '#0a0a0a', fontWeight: 600 }}>
                            Mixkit License
                        </a>
                        ; preview stills{' '}
                        <a href={STOCK_FOOTAGE_LICENSE.unsplash} target="_blank" rel="noopener noreferrer" style={{ color: '#0a0a0a', fontWeight: 600 }}>
                            Unsplash
                        </a>
                        .
                    </p>
                    <p
                        style={{
                            fontSize: 13,
                            color: '#9ca3af',
                            margin: '0 auto 32px',
                            maxWidth: 640,
                            textAlign: 'center',
                            lineHeight: 1.55,
                        }}
                    >
                        These six files are only used here- the hero, carousel, and use-case blocks each use their own clips so nothing repeats across the page.
                    </p>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                            gap: 14,
                            marginBottom: 28,
                        }}
                    >
                        {STOCK_FOOTAGE_BROWSE_TILES.map((tile) => (
                            <div
                                key={tile.mp4}
                                style={{
                                    aspectRatio: '16 / 9',
                                    borderRadius: 18,
                                    overflow: 'hidden',
                                    border: '1px solid rgba(0,0,0,0.08)',
                                    background: '#e5e5e5',
                                    boxShadow: '0 8px 28px rgba(0,0,0,0.06)',
                                }}
                            >
                                <StockBrowseTileCard tile={tile} />
                            </div>
                        ))}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <a
                            href={MIXKIT_FREE_VIDEO_HUB}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 15,
                                fontWeight: 600,
                                color: '#0a0a0a',
                                textDecoration: 'none',
                                padding: '12px 22px',
                                borderRadius: 9999,
                                border: '1px solid rgba(0,0,0,0.12)',
                                background: '#ffffff',
                            }}
                        >
                            Browse free video on Mixkit
                        </a>
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════
                MODELS- cycling headline + ticker
            ════════════════════════════════════ */}
            <section style={{ padding: '88px 24px 64px', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', background: '#ffffff' }}>
                <div style={{ maxWidth: 920, margin: '0 auto 44px' }}>
                    <h2 style={{ fontSize: 'clamp(1.75rem, 3.8vw, 3rem)', fontWeight: 700, letterSpacing: '-0.035em', lineHeight: 1.12, margin: 0, color: '#0a0a0a' }}>
                        The industry&apos;s best{' '}
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={cycleIdx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.28 }}
                                style={{ display: 'inline-block', color: '#9ca3af' }}
                            >
                                {CYCLE_WORDS[cycleIdx]}
                            </motion.span>
                        </AnimatePresence>{' '}
                        models.
                        <br />
                        In one subscription.
                    </h2>
                </div>

                <div style={{ overflow: 'hidden', position: 'relative', marginBottom: 0 }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to right, #ffffff, transparent)', zIndex: 10, pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to left, #ffffff, transparent)', zIndex: 10, pointerEvents: 'none' }} />
                    <div className="lumina-ticker" style={{ display: 'flex', alignItems: 'center', gap: 0, width: 'max-content' }}>
                        {[...MODELS, ...MODELS].map((m, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                                <span style={{ fontSize: 14, fontWeight: 600, color: '#9ca3af', whiteSpace: 'nowrap', padding: '0 28px', letterSpacing: '0.02em' }}>{m}</span>
                                <div style={{ width: 1, height: 14, background: 'rgba(0,0,0,0.08)', flexShrink: 0 }} />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════
                FEATURE BADGES GRID
            ════════════════════════════════════ */}
            <section style={{ padding: '64px 40px 88px', maxWidth: 1100, margin: '0 auto', background: '#fafafa', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <FadeIn>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 48 }}>
                        {FEATURE_BADGES.map((b) => (
                            <div
                                key={b.text}
                                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 9999, background: '#ffffff', fontSize: 13, color: '#4b5563', fontWeight: 500, whiteSpace: 'nowrap' }}
                            >
                                <span style={{ fontSize: 14 }}>{b.icon}</span>
                                {b.text}
                            </div>
                        ))}
                    </div>
                </FadeIn>

                <FadeIn delay={0.1}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 24, overflow: 'hidden', background: 'rgba(0,0,0,0.08)' }} className="tools-grid">
                        {TOOLS.map((tool, i) => (
                            <Link key={tool.name} href={tool.href} style={{ textDecoration: 'none', background: '#ffffff' }}>
                                <motion.div
                                    whileHover={{ background: '#f9fafb' }}
                                    style={{
                                        padding: '28px 24px',
                                        borderRight: (i + 1) % 4 !== 0 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                                        borderBottom: i < 4 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                                        transition: 'background 0.15s',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 10,
                                        height: '100%',
                                    }}
                                >
                                    <span style={{ fontSize: 22 }}>{tool.icon}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', letterSpacing: '-0.01em' }}>{tool.name}</span>
                                </motion.div>
                            </Link>
                        ))}
                    </div>
                    <p style={{ textAlign: 'center', marginTop: 28, fontSize: 14, color: '#6b7280', fontWeight: 400 }}>
                        A tool suite for pros and beginners alike
                    </p>
                </FadeIn>
            </section>

            {/* ════════════════════════════════════
                SOCIAL PROOF
            ════════════════════════════════════ */}
            <section style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '88px 24px', textAlign: 'center', background: '#ffffff' }}>
                <FadeIn>
                    <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px', fontWeight: 500 }}>A tool suite for pros and beginners alike</p>
                    <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.35rem)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 20px', color: '#0a0a0a', lineHeight: 1.2 }}>
                        Lumina powers millions of creatives,
                        <br />
                        enterprises, and everyday people.
                    </h2>
                    <p style={{ fontSize: 15, color: '#6b7280', margin: '0 0 44px' }}>
                        Trusted by{' '}
                        <span style={{ color: '#0a0a0a', fontWeight: 600 }}>30,000,000+</span> users from{' '}
                        <span style={{ color: '#0a0a0a', fontWeight: 600 }}>191 countries</span>
                    </p>

                    <div style={{ overflow: 'hidden', position: 'relative', marginBottom: 44 }}>
                        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 60, background: 'linear-gradient(to right, #ffffff, transparent)', zIndex: 2 }} />
                        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 60, background: 'linear-gradient(to left, #ffffff, transparent)', zIndex: 2 }} />
                        <div className="lumina-ticker" style={{ display: 'flex', alignItems: 'center', gap: 0, width: 'max-content' }}>
                            {[...CLIENT_LOGOS, ...CLIENT_LOGOS].map((logo, i) => (
                                <span key={i} style={{ fontSize: 15, fontWeight: 700, color: '#d1d5db', padding: '0 40px', whiteSpace: 'nowrap', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                                    {logo}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
                        <Link href="/register" style={{ textDecoration: 'none', fontSize: 15, fontWeight: 600, color: '#0a0a0a' }}>
                            Sign up for free
                        </Link>
                        <Link href="/contact" style={{ textDecoration: 'none' }}>
                            <motion.button
                                type="button"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                style={{ padding: '11px 26px', borderRadius: 9999, background: '#0a0a0a', color: '#ffffff', fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                Contact Sales
                            </motion.button>
                        </Link>
                    </div>
                </FadeIn>
            </section>

            {/* ════════════════════════════════════
                USE CASES- accordion + preview
            ════════════════════════════════════ */}
            <section style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '80px 24px 100px', background: '#fafaf9' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <FadeIn>
                        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: '#9ca3af', textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>Use cases</p>
                        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.35rem)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 52px', textAlign: 'center', color: '#0a0a0a', lineHeight: 1.2 }}>
                            Generate or edit high quality images,
                            <br />
                            videos, and 3D objects with AI
                        </h2>
                    </FadeIn>

                    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 40, alignItems: 'start' }} className="use-cases-grid">
                        <div>
                            {USE_CASES.map((uc2, i) => (
                                <div
                                    key={uc2.title}
                                    style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', cursor: 'pointer' }}
                                    onClick={() => setActiveUC(i)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 0' }}>
                                        <h3
                                            style={{
                                                fontSize: 16,
                                                fontWeight: 600,
                                                color: activeUC === i ? '#0a0a0a' : '#9ca3af',
                                                margin: 0,
                                                letterSpacing: '-0.02em',
                                                transition: 'color 0.15s',
                                            }}
                                        >
                                            {uc2.title}
                                        </h3>
                                        <svg
                                            width="14" height="14" viewBox="0 0 14 14" fill="none"
                                            style={{ flexShrink: 0, transform: activeUC === i ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s', opacity: activeUC === i ? 1 : 0.3, color: '#0a0a0a' }}
                                        >
                                            <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <AnimatePresence initial={false}>
                                        {activeUC === i && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                                                style={{ overflow: 'hidden' }}
                                            >
                                                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, margin: '0 0 14px', paddingRight: 16 }}>{uc2.desc}</p>
                                                <Link href={uc2.href} style={{ textDecoration: 'none', display: 'inline-block', marginBottom: 18 }}>
                                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', borderBottom: '1px solid rgba(0,0,0,0.2)', paddingBottom: 2 }}>
                                                        {uc2.cta} →
                                                    </span>
                                                </Link>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>

                        {/* Right: preview */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeUC}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                                style={{ borderRadius: 24, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)', background: '#f3f4f6', aspectRatio: '4/3', position: 'sticky', top: 100, boxShadow: '0 8px 40px rgba(0,0,0,0.06)', minHeight: 280 }}
                            >
                                {'srcs' in uc && uc.srcs ? (
                                    <AutoVideo
                                        srcs={uc.srcs}
                                        posters={'videoPosters' in uc ? uc.videoPosters : undefined}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={(uc as { src?: string }).src}
                                        alt={uc.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                    />
                                )}
                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)', pointerEvents: 'none' }} />
                                <div style={{ position: 'absolute', bottom: 20, left: 20 }}>
                                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#fff' }}>{uc.title}</p>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════
                PRICING
            ════════════════════════════════════ */}
            <section style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '80px 24px 100px', background: '#ffffff' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <FadeIn>
                        <div style={{ textAlign: 'center', marginBottom: 52 }}>
                            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.35rem)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 12px', color: '#0a0a0a' }}>
                                We&apos;ve got a plan for everybody.
                            </h2>
                            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
                                Credits work across all generation types- images, video, 3D, and upscaling.
                            </p>
                        </div>
                    </FadeIn>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }} className="pricing-grid">
                        {PLANS.map((plan, i) => (
                            <FadeIn key={plan.key} delay={i * 0.07}>
                                <div
                                    style={{
                                        borderRadius: 16,
                                        border: plan.highlight ? '1px solid #0a0a0a' : '1px solid #e5e7eb',
                                        background: plan.highlight ? '#fafafa' : '#ffffff',
                                        padding: '28px 24px',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        position: 'relative',
                                    }}
                                >
                                    {plan.highlight && (
                                        <div style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: '#0a0a0a', color: '#ffffff', fontSize: 9, fontWeight: 800, padding: '3px 14px', borderRadius: 99, letterSpacing: '0.1em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                                            Most Popular
                                        </div>
                                    )}

                                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0a', marginBottom: 4 }}>{plan.name}</div>
                                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.45 }}>{plan.tagline}</div>

                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: plan.credit ? 8 : 20 }}>
                                        <span style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1, color: '#0a0a0a' }}>{plan.price}</span>
                                        <span style={{ fontSize: 13, color: '#9ca3af' }}>{plan.per}</span>
                                    </div>

                                    {plan.credit && (
                                        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, fontWeight: 500 }}>
                                            ⚡ <strong style={{ color: '#0a0a0a' }}>{plan.credit}</strong> credits / month
                                        </div>
                                    )}

                                    <div style={{ height: 1, background: '#e5e7eb', marginBottom: 20 }} />

                                    <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                                        {plan.features.map((f) => (
                                            <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: '#4b5563', lineHeight: 1.45 }}>
                                                <span style={{ color: '#9ca3af', fontSize: 13, flexShrink: 0, lineHeight: 1.45 }}>✓</span>
                                                {f}
                                            </li>
                                        ))}
                                    </ul>

                                    <Link href={plan.href} style={{ textDecoration: 'none', display: 'block' }}>
                                        <motion.button
                                            type="button"
                                            whileHover={{ opacity: 0.92 }}
                                            whileTap={{ scale: 0.98 }}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: 9999,
                                                background: plan.highlight ? '#0a0a0a' : '#ffffff',
                                                color: plan.highlight ? '#ffffff' : '#0a0a0a',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                border: plan.highlight ? 'none' : '1px solid #e5e7eb',
                                                cursor: 'pointer',
                                                letterSpacing: '-0.01em',
                                                fontFamily: 'inherit',
                                            }}
                                        >
                                            {plan.cta}
                                        </motion.button>
                                    </Link>
                                </div>
                            </FadeIn>
                        ))}
                    </div>

                    <FadeIn>
                        <div style={{ marginTop: 32, padding: '18px 24px', border: '1px solid #e5e7eb', borderRadius: 16, display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center', background: '#fafafa' }}>
                            <span style={{ fontSize: 12, color: '#9ca3af' }}>Credit costs:</span>
                            {[
                                { label: 'Text to Image', cost: '1–2 ⚡' },
                                { label: 'Image to Image', cost: '1–2 ⚡' },
                                { label: 'Image to Video', cost: '10–55 ⚡' },
                                { label: 'Text to Video', cost: '10–55 ⚡' },
                                { label: 'Image to 3D', cost: '28–40 ⚡' },
                                { label: 'Story Studio', cost: '340–830 ⚡' },
                            ].map((item) => (
                                <span key={item.label} style={{ fontSize: 12, color: '#6b7280' }}>
                                    {item.label} <span style={{ color: '#0a0a0a', fontWeight: 600 }}>· {item.cost}</span>
                                </span>
                            ))}
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ════════════════════════════════════
                SIMPLE UI SECTION
            ════════════════════════════════════ */}
            <section style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '88px 24px 100px', background: '#f5f5f5' }}>
                <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
                    <FadeIn>
                        <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.35rem)', fontWeight: 700, letterSpacing: '-0.03em', margin: '0 0 14px', color: '#0a0a0a' }}>
                            Dead simple UI.
                            <br />
                            <span style={{ color: '#9ca3af' }}>No tutorials needed.</span>
                        </h2>
                        <p style={{ fontSize: 15, color: '#6b7280', margin: '0 auto 44px', maxWidth: 520, lineHeight: 1.65 }}>
                            Lumina offers the simplest interfaces for ad creation. Skip the learning curve and get straight into your creative flow- even if you&apos;ve never used AI tools before.
                        </p>

                        <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 28, background: '#e8e8ea', padding: '24px 24px 20px', textAlign: 'left', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)' }}>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                                {['3:4', 'Style', '1K', 'Image prompt'].map((tag) => (
                                    <div key={tag} style={{ padding: '6px 14px', borderRadius: 9999, border: '1px solid rgba(0,0,0,0.1)', fontSize: 12, fontWeight: 600, color: '#0a0a0a', background: '#ffffff' }}>{tag}</div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '16px 20px', background: '#ffffff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.06)' }}>
                                <span style={{ fontSize: 14, color: '#9ca3af', flex: 1, lineHeight: 1.5 }}>
                                    Describe any visual you want to create. Lumina will generate an image for free. You can write in any language.
                                </span>
                                <div style={{ padding: '10px 22px', borderRadius: 9999, background: '#0a0a0a', color: '#ffffff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>Generate</div>
                            </div>
                        </div>
                    </FadeIn>
                </div>
            </section>

            {/* ════════════════════════════════════
                FOOTER
            ════════════════════════════════════ */}
            <footer style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '56px 40px 36px', background: '#f7f7f7' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 60, marginBottom: 44 }} className="footer-grid">
                        <div>
                            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                                <div style={{ width: 26, height: 26, borderRadius: 7, background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="12" height="12" viewBox="0 0 15 15" fill="none" aria-hidden><path d="M7.5 1.5L13.5 13H1.5L7.5 1.5Z" fill="#ffffff" /></svg>
                                </div>
                                <span style={{ fontSize: 15, fontWeight: 700, color: '#0a0a0a', letterSpacing: '-0.02em' }}>Lumina</span>
                            </Link>
                            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                {['Log In', 'Pricing', 'Enterprise'].map((l) => (
                                    <Link key={l} href={l === 'Log In' ? '/login' : l === 'Pricing' ? '/studio/billing' : '/contact'} style={{ textDecoration: 'none', fontSize: 13, color: '#6b7280', transition: 'color 0.15s' }}
                                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#0a0a0a')}
                                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}
                                    >{l}</Link>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }} className="footer-cols">
                            {[
                                { title: 'Products', links: [{ l: 'Image Generator', h: '/studio' }, { l: 'Video Generator', h: '/studio' }, { l: 'Upscaler', h: '/studio' }, { l: 'Realtime', h: '/vstudio' }, { l: 'Edit', h: '/studio' }] },
                                { title: 'Resources', links: [{ l: 'Pricing', h: '/studio/billing' }, { l: 'Careers', h: '#' }, { l: 'Terms of Service', h: '#' }, { l: 'Privacy Policy', h: '#' }, { l: 'API', h: '#' }] },
                                { title: 'About', links: [{ l: 'Blog', h: '#' }, { l: 'Contact', h: '/contact' }, { l: 'Discord', h: '#' }] },
                                { title: 'Models', links: [{ l: 'FLUX Pro', h: '#' }, { l: 'Runway Gen-4', h: '#' }, { l: 'Kling 2.0', h: '#' }, { l: 'Luma Dream', h: '#' }, { l: 'DALL·E 3', h: '#' }] },
                            ].map((col) => (
                                <div key={col.title}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: '#0a0a0a', marginBottom: 14 }}>{col.title}</div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {col.links.map(({ l, h }) => (
                                            <li key={l}>
                                                <Link href={h} style={{ textDecoration: 'none', fontSize: 13, color: '#6b7280', transition: 'color 0.15s' }}
                                                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#0a0a0a')}
                                                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#6b7280')}
                                                >{l}</Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: 22, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>© {new Date().getFullYear()} Lumina AI, Inc.</span>
                        <div style={{ display: 'flex', gap: 20 }}>
                            {['Documentation', 'Twitter', 'LinkedIn', 'Instagram'].map((s) => (
                                <Link key={s} href="#" style={{ textDecoration: 'none', fontSize: 12, color: '#9ca3af', transition: 'color 0.15s' }}
                                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#0a0a0a')}
                                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#9ca3af')}
                                >{s}</Link>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>

            {/* Responsive */}
            <style>{`
                .prompt-strip::-webkit-scrollbar { display: none; }
                .prompt-strip { -ms-overflow-style: none; scrollbar-width: none; }
                @media (max-width: 900px) {
                    .use-cases-grid { grid-template-columns: 1fr !important; }
                    .tools-grid { grid-template-columns: repeat(2, 1fr) !important; }
                    .footer-grid { grid-template-columns: 1fr !important; }
                    .footer-cols { grid-template-columns: 1fr 1fr !important; }
                }
                @media (max-width: 700px) {
                    .pricing-grid { grid-template-columns: 1fr 1fr !important; }
                }
                @media (max-width: 480px) {
                    .pricing-grid { grid-template-columns: 1fr !important; }
                    .footer-cols { grid-template-columns: 1fr 1fr !important; }
                }
            `}</style>
        </main>
    );
}
