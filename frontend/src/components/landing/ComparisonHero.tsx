'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { LOCAL_HERO_CLIP, REMOTE_VIDEO_FALLBACKS } from '@/lib/landingVideoSources';

/**
 * Hero: local MP4 first (reliable), animated CSS underlay so the fold is never flat black.
 */

const ALL_SOURCES = [LOCAL_HERO_CLIP, ...REMOTE_VIDEO_FALLBACKS];

export default function ComparisonHero() {
    const [vidReady, setVidReady] = useState(false);
    const [srcIndex, setSrcIndex] = useState(0);
    const [useMotionFallback, setUseMotionFallback] = useState(false);
    const bgRef = useRef<HTMLVideoElement>(null);

    const currentSrc = ALL_SOURCES[srcIndex];

    useEffect(() => {
        const tryPlay = () => {
            bgRef.current?.play().catch(() => {});
        };
        tryPlay();
        document.addEventListener('visibilitychange', tryPlay);
        return () => document.removeEventListener('visibilitychange', tryPlay);
    }, [srcIndex]);

    const onBgReady = () => {
        setVidReady(true);
        setUseMotionFallback(false);
        bgRef.current?.play().catch(() => {});
    };

    const onVideoError = () => {
        if (srcIndex + 1 < ALL_SOURCES.length) {
            setSrcIndex((i) => i + 1);
        } else {
            setUseMotionFallback(true);
            setVidReady(true);
        }
    };

    const videoProps = {
        autoPlay: true,
        loop: true,
        muted: true,
        playsInline: true,
        preload: 'auto' as const,
    };

    return (
        <section className="relative flex min-h-[100svh] w-full flex-col overflow-hidden bg-[#050508]">
            <div className="absolute inset-0 z-0 min-h-[100svh] w-full">
                {/* Always-visible motion if CDN fails or while loading */}
                <div
                    className={`luma-hero-aurora absolute inset-0 transition-opacity duration-700 ${useMotionFallback || !vidReady ? 'opacity-100' : 'opacity-0'}`}
                    aria-hidden
                />
                <div
                    className={`luma-hero-mesh absolute inset-0 opacity-50 transition-opacity duration-700 ${useMotionFallback || !vidReady ? 'opacity-50' : 'opacity-0'}`}
                    aria-hidden
                />

                {!useMotionFallback && (
                    <video
                        ref={bgRef}
                        key={currentSrc}
                        {...videoProps}
                        src={currentSrc}
                        className="absolute inset-0 z-[1] h-full min-h-[100svh] w-full object-cover brightness-[1.03] contrast-[1.06] saturate-[1.12]"
                        onLoadedData={onBgReady}
                        onCanPlay={onBgReady}
                        onError={onVideoError}
                    />
                )}

                <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-b from-black/30 via-black/5 to-black/45" />
                <div
                    className="pointer-events-none absolute inset-0 z-[2]"
                    style={{
                        background:
                            'radial-gradient(ellipse 95% 75% at 50% 30%, transparent 25%, rgba(0,0,0,0.3) 100%)',
                    }}
                />
                <div className="noise-bg pointer-events-none absolute inset-0 z-[2] opacity-[0.03] mix-blend-overlay" />
            </div>

            <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-center justify-center px-6 pb-24 pt-28 text-center md:pt-32">
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: vidReady ? 1 : 0.85, y: vidReady ? 0 : 12 }}
                    transition={{ duration: 0.75 }}
                    className="max-w-[920px] text-balance [font-family:var(--font-display)] text-[clamp(2.25rem,6.5vw,4.75rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.5)]"
                >
                    Creative agents that make you prolific
                </motion.h1>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: vidReady ? 1 : 0.85, y: vidReady ? 0 : 8 }}
                    transition={{ duration: 0.6, delay: 0.08 }}
                    className="mt-10 md:mt-12"
                >
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center rounded-full bg-white px-10 py-3.5 text-[15px] font-semibold text-neutral-950 no-underline transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Try Lumina
                    </Link>
                </motion.div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: vidReady ? 1 : 0.75 }}
                    transition={{ duration: 0.65, delay: 0.14 }}
                    className="mt-12 max-w-[640px] text-pretty text-base leading-relaxed text-white/75 md:text-[17px] md:leading-relaxed"
                >
                    Our Mission is to build unified general intelligence that can generate, understand, and operate
                    in the physical world.
                </motion.p>
            </div>

            <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[9] h-28 bg-gradient-to-t from-[#030303] to-transparent" />
        </section>
    );
}
