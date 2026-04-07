'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Download, RefreshCcw, Edit2 } from 'lucide-react';

interface Variation {
    id: string;
    thumbnail: string;
    source: string;
}

interface VideoSliderProps {
    variations: Variation[];
    activeId: string;
    onSelect: (v: Variation) => void;
    isVisible: boolean;
}

const spring = { type: 'spring' as const, stiffness: 380, damping: 28 };
const ease = [0.22, 1, 0.36, 1] as const;

const stripVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.06, delayChildren: 0.04 },
    },
};

const thumbVariants = {
    hidden: { opacity: 0, y: 18, scale: 0.94 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: spring,
    },
};

export const VideoSlider: React.FC<VideoSliderProps> = ({ variations, activeId, onSelect, isVisible }) => {
    const stripRef = useRef<HTMLDivElement>(null);
    const activeThumbRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => {
        if (!isVisible) return;
        const t = window.setTimeout(() => {
            activeThumbRef.current?.scrollIntoView({
                behavior: 'smooth',
                inline: 'center',
                block: 'nearest',
            });
        }, 100);
        return () => window.clearTimeout(t);
    }, [activeId, isVisible]);

    const activeIndex = Math.max(0, variations.findIndex((x) => x.id === activeId));

    return (
        <motion.div
            initial={{ opacity: 0, y: 36, scale: 0.97 }}
            animate={{
                opacity: isVisible ? 1 : 0,
                y: isVisible ? 0 : 28,
                scale: isVisible ? 1 : 0.98,
            }}
            transition={{ duration: 0.5, ease }}
            className="pointer-events-none fixed bottom-24 left-1/2 z-30 w-full max-w-3xl -translate-x-1/2 px-4 md:bottom-28 md:px-6"
        >
            <div className="pointer-events-auto overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-b from-[#101012]/95 to-[#0a0a0c]/98 shadow-[0_12px_48px_rgba(0,0,0,0.65),0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-xl">
                <motion.div
                    className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent"
                    initial={{ opacity: 0, scaleX: 0.3 }}
                    animate={{ opacity: isVisible ? 1 : 0, scaleX: isVisible ? 1 : 0.3 }}
                    transition={{ duration: 0.6, ease }}
                />
                <div className="px-3 py-3 md:px-4 md:py-3.5">
                    <div className="mb-2.5 flex items-baseline justify-between gap-3 px-0.5">
                        <motion.span
                            className="text-[11px] font-medium tracking-wide text-white/50"
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -8 }}
                            transition={{ delay: 0.1, duration: 0.35 }}
                        >
                            Variations
                        </motion.span>
                        <motion.span
                            key={activeId}
                            initial={{ opacity: 0, scale: 0.92 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={spring}
                            className="tabular-nums text-[11px] text-violet-300/90"
                        >
                            {activeIndex + 1} / {variations.length}
                        </motion.span>
                    </div>

                    <div className="relative -mx-1">
                        <div
                            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[#0c0c0e] to-transparent"
                            aria-hidden
                        />
                        <div
                            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[#0c0c0e] to-transparent"
                            aria-hidden
                        />

                        <motion.div
                            ref={stripRef}
                            variants={stripVariants}
                            initial="hidden"
                            animate={isVisible ? 'show' : 'hidden'}
                            className="no-scrollbar flex gap-2.5 overflow-x-auto px-1 py-0.5 md:gap-3"
                        >
                            {variations.map((v) => {
                                const active = activeId === v.id;
                                return (
                                    <motion.button
                                        key={v.id}
                                        type="button"
                                        variants={thumbVariants}
                                        ref={active ? activeThumbRef : undefined}
                                        whileHover={{
                                            y: -3,
                                            transition: { type: 'spring', stiffness: 420, damping: 24 },
                                        }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={() => onSelect(v)}
                                        className={`group relative w-[5.75rem] flex-shrink-0 overflow-hidden rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 md:w-[6.75rem] ${
                                            active
                                                ? 'z-[1] shadow-[0_0_0_1.5px_rgba(167,139,250,0.95),0_14px_32px_-10px_rgba(109,40,217,0.45)]'
                                                : 'shadow-[0_0_0_1px_rgba(255,255,255,0.1)]'
                                        } aspect-video bg-zinc-900`}
                                    >
                                        {active && (
                                            <motion.div
                                                layoutId="slider-active-ring"
                                                className="pointer-events-none absolute inset-0 rounded-[11px] ring-2 ring-violet-400/90 ring-offset-0 ring-offset-transparent"
                                                transition={spring}
                                            />
                                        )}
                                        <motion.img
                                            src={v.thumbnail}
                                            alt=""
                                            className="h-full w-full object-cover"
                                            animate={{ scale: active ? 1.06 : 1 }}
                                            transition={{ duration: 0.45, ease }}
                                        />
                                        <div
                                            className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/15 transition-opacity duration-300 ${
                                                active ? 'opacity-100' : 'opacity-40 group-hover:opacity-70'
                                            }`}
                                        />
                                        {active && (
                                            <motion.span
                                                layoutId="slider-active-bar"
                                                className="pointer-events-none absolute bottom-1.5 left-2 right-2 h-[3px] rounded-full bg-gradient-to-r from-violet-400 via-white to-fuchsia-400 shadow-[0_0_12px_rgba(167,139,250,0.8)]"
                                                transition={spring}
                                            />
                                        )}
                                    </motion.button>
                                );
                            })}

                            <motion.button
                                type="button"
                                variants={thumbVariants}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.97 }}
                                className="flex aspect-video w-[5.75rem] flex-shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/18 bg-white/[0.04] text-white/45 transition-colors hover:border-violet-400/35 hover:bg-violet-500/10 hover:text-white/85 md:w-[6.75rem]"
                            >
                                <RefreshCcw size={17} strokeWidth={1.75} />
                                <span className="text-[9px] font-medium uppercase tracking-widest">New</span>
                            </motion.button>
                        </motion.div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isVisible ? 1 : 0 }}
                        transition={{ delay: 0.25, duration: 0.35 }}
                        className="mt-3 flex items-center justify-between border-t border-white/[0.07] pt-3"
                    >
                        <div className="flex gap-6">
                            <motion.button
                                type="button"
                                whileHover={{ x: 2 }}
                                whileTap={{ scale: 0.97 }}
                                className="flex items-center gap-1.5 text-[11px] font-medium text-white/45 transition-colors hover:text-white"
                            >
                                <Download size={13} strokeWidth={2} />
                                Download
                            </motion.button>
                            <motion.button
                                type="button"
                                whileHover={{ x: 2 }}
                                whileTap={{ scale: 0.97 }}
                                className="flex items-center gap-1.5 text-[11px] font-medium text-white/45 transition-colors hover:text-white"
                            >
                                <Edit2 size={13} strokeWidth={2} />
                                Edit
                            </motion.button>
                        </div>
                        <span className="hidden text-[10px] text-white/28 sm:inline">{variations.length} generated</span>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};
