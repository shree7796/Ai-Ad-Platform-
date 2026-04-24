'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { LOCAL_COMPARE_CLIP, REMOTE_VIDEO_FALLBACKS } from '@/lib/landingVideoSources';

const COMPARE_SOURCES = [LOCAL_COMPARE_CLIP, ...REMOTE_VIDEO_FALLBACKS];

/**
 * Drag compare- both sides use the same clip (color vs graded) so one local file is enough.
 */
export default function LandingVideoCompare() {
    const sliderRef = useRef<HTMLDivElement>(null);
    const beforeVRef = useRef<HTMLVideoElement>(null);
    const afterVRef = useRef<HTMLVideoElement>(null);
    const dragging = useRef(false);
    const [mounted, setMounted] = useState(false);
    const [srcIndex, setSrcIndex] = useState(0);

    const rawX = useMotionValue(50);
    const springX = useSpring(rawX, { stiffness: 520, damping: 40, mass: 0.5 });
    const clipPath = useTransform(springX, (v) => `inset(0 ${100 - v}% 0 0)`);
    const handlePos = useTransform(springX, (v) => `${v}%`);

    const src = COMPARE_SOURCES[srcIndex];

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const playAll = () => {
            [beforeVRef.current, afterVRef.current].forEach((el) => el?.play().catch(() => {}));
        };
        playAll();
        document.addEventListener('visibilitychange', playAll);
        return () => document.removeEventListener('visibilitychange', playAll);
    }, [src]);

    useEffect(() => {
        const b = beforeVRef.current;
        const a = afterVRef.current;
        if (!b || !a) return;
        const id = setInterval(() => {
            if (b.readyState >= 2 && a.readyState >= 2 && Math.abs(b.currentTime - a.currentTime) > 0.2) {
                a.currentTime = b.currentTime;
            }
        }, 200);
        return () => clearInterval(id);
    }, [src]);

    const moveTo = useCallback(
        (clientX: number) => {
            const el = sliderRef.current;
            if (!el) return;
            const { left, width } = el.getBoundingClientRect();
            rawX.set(Math.min(Math.max(((clientX - left) / width) * 100, 0), 100));
        },
        [rawX]
    );

    const onPointerDown = (e: React.PointerEvent) => {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        moveTo(e.clientX);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragging.current) return;
        moveTo(e.clientX);
    };
    const onPointerUp = () => {
        dragging.current = false;
    };

    const onVideoError = () => {
        setSrcIndex((i) => (i + 1 < COMPARE_SOURCES.length ? i + 1 : i));
    };

    const label = (side: 'left' | 'right', text: string, muted?: boolean) => (
        <span
            className={`absolute top-3 z-[5] rounded-full border border-white/15 px-3 py-1 text-[9px] font-bold uppercase tracking-[0.2em] backdrop-blur-md ${
                side === 'left' ? 'left-3' : 'right-3'
            } ${muted ? 'bg-black/45 text-white/50' : 'bg-black/50 text-white'}`}
        >
            {text}
        </span>
    );

    return (
        <section className="relative border-y border-white/[0.06] bg-[#030303] py-16 md:py-24">
            <div className="mx-auto max-w-[1100px] px-6">
                <p className="text-center text-[11px] font-medium uppercase tracking-[0.25em] text-white/35">
                    Live footage- drag to compare
                </p>
                <h2 className="mt-3 text-center text-xl font-semibold tracking-tight text-white md:text-2xl">
                    Raw clip vs AI-enhanced ad
                </h2>
            </div>

            <div className="mx-auto mt-10 max-w-[1000px] px-4 md:px-6">
                <motion.div
                    initial={false}
                    animate={{ opacity: mounted ? 1 : 0, y: mounted ? 0 : 12 }}
                    transition={{ duration: 0.5 }}
                    ref={sliderRef}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    className="relative w-full cursor-col-resize select-none overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0c] shadow-[0_40px_100px_rgba(0,0,0,0.5)] [aspect-ratio:16/9] [touch-action:none]"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 to-black/80" />

                    <div className="absolute inset-0">
                        <video
                            ref={afterVRef}
                            key={`after-${src}`}
                            src={src}
                            autoPlay
                            loop
                            muted
                            playsInline
                            preload="auto"
                            className="relative z-[1] h-full w-full object-cover"
                            onError={onVideoError}
                        />
                        {label('right', 'AI ad')}
                    </div>
                    <motion.div style={{ clipPath }} className="absolute inset-0 z-[4] overflow-hidden">
                        <video
                            ref={beforeVRef}
                            key={`before-${src}`}
                            src={src}
                            autoPlay
                            loop
                            muted
                            playsInline
                            preload="auto"
                            className="relative z-[1] h-full w-full object-cover"
                            style={{ filter: 'grayscale(1) brightness(0.7) contrast(1.12)' }}
                            onError={onVideoError}
                        />
                        {label('left', 'Raw clip', true)}
                    </motion.div>
                    <motion.div
                        style={{ left: handlePos }}
                        className="pointer-events-none absolute top-0 bottom-0 z-10 flex -translate-x-1/2 flex-col items-center"
                    >
                        <div className="flex-1 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent" />
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-black/50 backdrop-blur-md">
                            <span className="text-xs text-white/90">‹ ›</span>
                        </div>
                        <div className="flex-1 w-px bg-gradient-to-b from-transparent via-white/50 to-transparent" />
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
