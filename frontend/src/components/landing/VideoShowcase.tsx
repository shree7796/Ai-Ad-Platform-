'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Play, Pause, ArrowRight } from 'lucide-react';
import Link from 'next/link';

/*
 * VideoShowcase – the section immediately after the ComparisonHero.
 *
 * Two distinct parts:
 *   1. CINEMATIC BAND   – full-width autoplay muted video, text overlay, bottom-left copy
 *   2. BENTO GRID       – 3 smaller video cards (drag / hover to play), each with different footage
 *
 * All videos use Pexels CDN (primary) with mixkit as fallback.
 */

const VIDEOS = {
    // Cinematic band- aerial city / downtown night
    main: {
        primary: 'https://videos.pexels.com/video-files/3827282/3827282-uhd_2560_1440_30fps.mp4',
        fallback: 'https://assets.mixkit.co/videos/preview/mixkit-flying-over-a-large-city-at-night-1191-large.mp4',
    },
    cards: [
        {
            title: 'Real-time Rendering',
            tag: 'Dream Machine 1.5',
            primary: 'https://videos.pexels.com/video-files/855383/855383-hd_1920_1080_30fps.mp4',
            fallback: 'https://assets.mixkit.co/videos/preview/mixkit-forest-stream-in-the-sunlight-529-large.mp4',
        },
        {
            title: 'Photorealistic Faces',
            tag: 'Portrait AI',
            primary: 'https://videos.pexels.com/video-files/3889855/3889855-uhd_2560_1440_25fps.mp4',
            fallback: 'https://assets.mixkit.co/videos/preview/mixkit-girl-in-neon-sign-1232-large.mp4',
        },
        {
            title: 'Cinematic Motion',
            tag: 'Slow Motion 4K',
            primary: 'https://videos.pexels.com/video-files/4168982/4168982-uhd_2560_1440_30fps.mp4',
            fallback: 'https://assets.mixkit.co/videos/preview/mixkit-underwater-ocean-life-4122-large.mp4',
        },
    ],
};

// Ecommerce product ad clips- portrait 9:16 style (mobile ad format)
const PRODUCT_ADS = [
    {
        product: 'Noir Élite',
        category: 'Luxury Fragrance',
        cta: 'Shop Now',
        accent: '#c9a96e',  // gold
        // Perfume / close-up luxury product
        primary: 'https://videos.pexels.com/video-files/4051980/4051980-uhd_2560_1440_25fps.mp4',
        fallback: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-coffee-from-a-pot-to-a-cup-42402-large.mp4',
    },
    {
        product: 'AeroStep Pro',
        category: 'Athletic Footwear',
        cta: 'Explore',
        accent: '#60a5fa',  // blue
        // Sneaker / fashion close-up
        primary: 'https://videos.pexels.com/video-files/5705892/5705892-uhd_2560_1440_25fps.mp4',
        fallback: 'https://assets.mixkit.co/videos/preview/mixkit-hands-of-a-person-typing-on-a-laptop-1235-large.mp4',
    },
    {
        product: 'Lumière Skin',
        category: 'Skincare',
        cta: 'Discover',
        accent: '#f9a8d4',  // pink
        // Skincare / beauty product
        primary: 'https://videos.pexels.com/video-files/8327965/8327965-uhd_2560_1440_25fps.mp4',
        fallback: 'https://assets.mixkit.co/videos/preview/mixkit-woman-applying-cream-to-her-face-3747-large.mp4',
    },
    {
        product: 'Velvet Brew',
        category: 'Specialty Coffee',
        cta: 'Order Now',
        accent: '#d97706',  // amber
        // Coffee pour / cafe
        primary: 'https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4',
        fallback: 'https://assets.mixkit.co/videos/preview/mixkit-pouring-coffee-from-a-pot-to-a-cup-42402-large.mp4',
    },
];

// ────────────────────────────────────────────────────────────────
// Product Ad Card - portrait 9:16, mimics a mobile/reel ad
// ────────────────────────────────────────────────────────────────
function ProductAdCard({
    product, category, cta, accent, primary, fallback, index,
}: {
    product: string; category: string; cta: string; accent: string;
    primary: string; fallback: string; index: number;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: '-60px' });
    const [hovered, setHovered] = useState(false);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 50 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: index * 0.1 }}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            style={{
                position: 'relative',
                borderRadius: 20,
                overflow: 'hidden',
                aspectRatio: '9/16',
                flex: '1 1 0',
                minWidth: 0,
                background: '#0d0f13',
                border: `1px solid ${hovered ? accent + '40' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: hovered ? `0 20px 60px ${accent}20` : '0 10px 30px rgba(0,0,0,0.4)',
                cursor: 'pointer',
                transition: 'border-color 0.35s, box-shadow 0.35s',
            }}
        >
            {/* Video */}
            <video
                autoPlay loop muted playsInline
                crossOrigin="anonymous"
                style={{
                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                    transform: hovered ? 'scale(1.05)' : 'scale(1)',
                    transition: 'transform 0.7s cubic-bezier(0.16,1,0.3,1)',
                }}
            >
                <source src={primary} type="video/mp4" />
                <source src={fallback} type="video/mp4" />
            </video>

            {/* Dark gradient bottom */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(8,9,13,0.92) 0%, rgba(8,9,13,0.35) 45%, transparent 75%)',
                pointerEvents: 'none',
            }} />

            {/* AI badge top-right */}
            <div style={{
                position: 'absolute', top: 14, right: 14,
                padding: '4px 10px', borderRadius: 99,
                background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(10px)',
                border: `1px solid ${accent}55`,
                color: accent, fontSize: 9, fontWeight: 800,
                letterSpacing: '0.2em', textTransform: 'uppercase',
            }}>
                ✦ AI Ad
            </div>

            {/* Bottom content */}
            <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '20px 18px',
            }}>
                {/* Category */}
                <div style={{
                    fontSize: 9, fontWeight: 700, color: accent,
                    textTransform: 'uppercase', letterSpacing: '0.22em', marginBottom: 5,
                }}>
                    {category}
                </div>
                {/* Product name */}
                <div style={{
                    fontSize: 20, fontWeight: 900, color: '#e6e6e6',
                    letterSpacing: '-0.03em', marginBottom: 14, lineHeight: 1.1,
                }}>
                    {product}
                </div>
                {/* CTA button */}
                <motion.div
                    animate={{ opacity: hovered ? 1 : 0.7, y: hovered ? 0 : 4 }}
                    transition={{ duration: 0.25 }}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '8px 18px', borderRadius: 99,
                        background: accent,
                        color: '#0a0b0d', fontSize: 11, fontWeight: 800,
                        letterSpacing: '-0.01em',
                    }}
                >
                    {cta} →
                </motion.div>
            </div>
        </motion.div>
    );
}

// ────────────────────────────────────────────────────────────────
// Small card component with hover-to-unmute toggle
// ────────────────────────────────────────────────────────────────
function VideoCard({
    title, tag, primary, fallback, index,
}: {
    title: string; tag: string; primary: string; fallback: string; index: number;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const vRef = useRef<HTMLVideoElement>(null);
    const inView = useInView(ref, { once: true, margin: '-80px' });
    const [hovered, setHovered] = useState(false);

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: index * 0.12 }}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            style={{
                position: 'relative',
                borderRadius: 20,
                overflow: 'hidden',
                aspectRatio: '16/9',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                flex: '1 1 0',
                minWidth: 0,
                background: '#111315',
            }}
        >
            <video
                ref={vRef}
                autoPlay
                loop
                muted
                playsInline
                crossOrigin="anonymous"
                style={{
                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                    transform: hovered ? 'scale(1.04)' : 'scale(1)',
                    transition: 'transform 0.6s cubic-bezier(0.16,1,0.3,1)',
                }}
            >
                <source src={primary} type="video/mp4" />
                <source src={fallback} type="video/mp4" />
            </video>

            {/* Gradient overlay */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, rgba(10,12,16,0.80) 0%, transparent 55%)',
                pointerEvents: 'none',
            }} />

            {/* Tag pill */}
            <div style={{
                position: 'absolute', top: 16, left: 16,
                padding: '4px 12px', borderRadius: 99,
                background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: '#a1a1aa', fontSize: 9, fontWeight: 700,
                letterSpacing: '0.20em', textTransform: 'uppercase',
            }}>
                {tag}
            </div>

            {/* Title */}
            <div style={{
                position: 'absolute', bottom: 18, left: 18,
                color: '#e6e6e6', fontSize: 15, fontWeight: 800,
                letterSpacing: '-0.02em',
                transform: hovered ? 'translateY(0)' : 'translateY(4px)',
                opacity: hovered ? 1 : 0.85,
                transition: 'transform 0.3s ease, opacity 0.3s ease',
            }}>
                {title}
            </div>

            {/* Hover glow rim */}
            {hovered && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                        position: 'absolute', inset: 0,
                        border: '1px solid rgba(255,255,255,0.16)',
                        borderRadius: 20, pointerEvents: 'none',
                    }}
                />
            )}
        </motion.div>
    );
}

// ────────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────────
export default function VideoShowcase() {
    const bandRef = useRef<HTMLDivElement>(null);
    const inView = useInView(bandRef, { once: true, margin: '-60px' });

    return (
        <section
            style={{
                background: '#0f1115',
                paddingBottom: 120,
                position: 'relative',
                zIndex: 1,
            }}
        >
            {/* ── 1. CINEMATIC BAND ──────────────────────────────── */}
            <motion.div
                ref={bandRef}
                initial={{ opacity: 0, y: 60 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: 1280,
                    margin: '0 auto 56px',
                    padding: '0 28px',
                }}
            >
                <div style={{
                    position: 'relative',
                    borderRadius: 28,
                    overflow: 'hidden',
                    aspectRatio: '21/9',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 48px 100px rgba(0,0,0,0.55)',
                    background: '#0a0c10',
                }}>
                    {/* Autoplay video- full bleed, no slider */}
                    <video
                        autoPlay loop muted playsInline
                        crossOrigin="anonymous"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    >
                        <source src={VIDEOS.main.primary} type="video/mp4" />
                        <source src={VIDEOS.main.fallback} type="video/mp4" />
                    </video>

                    {/* Dark cinematic overlay */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(135deg, rgba(10,12,18,0.72) 0%, rgba(10,12,18,0.15) 60%, rgba(10,12,18,0.50) 100%)',
                        pointerEvents: 'none',
                    }} />

                    {/* Eye-catching top-right label */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={inView ? { opacity: 1, x: 0 } : {}}
                        transition={{ delay: 0.4, duration: 0.7 }}
                        style={{
                            position: 'absolute', top: 28, right: 28,
                            padding: '6px 16px', borderRadius: 99,
                            background: 'rgba(99,102,241,0.18)', backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(99,102,241,0.28)',
                            color: '#a5b4fc', fontSize: 10, fontWeight: 700,
                            letterSpacing: '0.20em', textTransform: 'uppercase',
                        }}
                    >
                        ✦ AI Generated
                    </motion.div>

                    {/* Bottom-left headline (different layout from hero) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ delay: 0.25, duration: 0.9 }}
                        style={{ position: 'absolute', bottom: 36, left: 36 }}
                    >
                        <div style={{
                            fontSize: 10, fontWeight: 700, color: '#a1a1aa',
                            textTransform: 'uppercase', letterSpacing: '0.35em', marginBottom: 10,
                        }}>
                            Cinematic Architecture
                        </div>
                        <div style={{
                            fontSize: 'clamp(22px, 3.2vw, 44px)',
                            fontWeight: 900, color: '#e6e6e6',
                            letterSpacing: '-0.04em', lineHeight: 1.0, marginBottom: 20,
                        }}>
                            Hyper-realistic<br />Urbanism
                        </div>
                        <Link href="/login" style={{ textDecoration: 'none' }}>
                            <motion.button
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.97 }}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 7,
                                    padding: '10px 22px', borderRadius: 99,
                                    background: 'rgba(255,255,255,0.10)', backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(255,255,255,0.16)',
                                    color: '#e6e6e6', fontSize: 12, fontWeight: 700,
                                    cursor: 'pointer', letterSpacing: '-0.01em',
                                }}
                            >
                                <Play size={11} fill="#e6e6e6" />
                                Watch Reel
                            </motion.button>
                        </Link>
                    </motion.div>

                    {/* Vertical right text (magazine-style) */}
                    <div style={{
                        position: 'absolute', right: 28, bottom: 36,
                        writingMode: 'vertical-rl', textOrientation: 'mixed',
                        color: 'rgba(230,230,230,0.25)', fontSize: 10, fontWeight: 700,
                        letterSpacing: '0.18em', textTransform: 'uppercase',
                    }}>
                        Lumina AI Studio- 2026
                    </div>
                </div>
            </motion.div>

            {/* ── 2. SECTION HEADER ──────────────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7 }}
                style={{
                    maxWidth: 1280, margin: '0 auto 32px', padding: '0 28px',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                    flexWrap: 'wrap', gap: 16,
                }}
            >
                <div>
                    <div style={{
                        fontSize: 10, fontWeight: 700, color: '#6366f1',
                        textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: 8,
                    }}>
                        State-of-the-art models
                    </div>
                    <h2 style={{
                        fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 900,
                        color: '#e6e6e6', letterSpacing: '-0.04em', margin: 0, lineHeight: 1.0,
                    }}>
                        See what's possible.
                    </h2>
                </div>
                <Link href="/login" style={{
                    textDecoration: 'none',
                    color: '#a1a1aa', fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 5,
                    transition: 'color 0.2s',
                }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e6e6e6')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#a1a1aa')}
                >
                    Explore gallery <ArrowRight size={14} />
                </Link>
            </motion.div>

            {/* ── 3. BENTO GRID ──────────────────────────────────── */}
            <div style={{
                maxWidth: 1280, margin: '0 auto', padding: '0 28px',
                display: 'flex', gap: 16, flexWrap: 'wrap',
            }}>
                {VIDEOS.cards.map((card, i) => (
                    <VideoCard key={card.title} {...card} index={i} />
                ))}
            </div>

            {/* ── 4. AI PRODUCT ADS SECTION ──────────────────────── */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.8, delay: 0.1 }}
                style={{
                    maxWidth: 1280, margin: '140px auto 32px', padding: '0 28px',
                }}
            >
                <div style={{
                    fontSize: 10, fontWeight: 700, color: '#f9a8d4',
                    textTransform: 'uppercase', letterSpacing: '0.25em', marginBottom: 10,
                }}>
                    High-converting product creative
                </div>
                <h2 style={{
                    fontSize: 'clamp(24px, 3.5vw, 44px)', fontWeight: 900,
                    color: '#e6e6e6', letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.0,
                }}>
                    Ads that sell themselves.
                </h2>
                <p style={{
                    fontSize: 17, color: '#a1a1aa', maxWidth: 540, lineHeight: 1.6, margin: 0
                }}>
                    Stop spending weeks on production. Generate museum-quality product ads from a single photo.
                </p>
            </motion.div>

            {/* Product Ads Grid */}
            <div style={{
                maxWidth: 1280, margin: '0 auto', padding: '0 28px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 20,
            }}>
                {PRODUCT_ADS.map((ad, i) => (
                    <ProductAdCard key={ad.product} {...ad} index={i} />
                ))}
            </div>
        </section>
    );
}
