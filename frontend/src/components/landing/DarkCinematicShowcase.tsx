'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'framer-motion';
import CinematicReferenceVideo from '@/components/landing/CinematicReferenceVideo';
import {
    DARK_CARD_DEPTH_POSTER,
    DARK_CARD_FLUX_POSTER,
    DARK_SHOWCASE_LEFT_CHAIN,
    DARK_SHOWCASE_RIGHT_CHAIN,
    DARK_SHOWCASE_CENTER_CHAIN,
} from '@/lib/landingVideoSources';
import { gradientPoster } from '@/lib/gradientMedia';
import { DARK_SHOWCASE_GRID_LEFT, DARK_SHOWCASE_GRID_RIGHT } from '@/lib/darkShowcaseGridPhotos';

const fade = {
    initial: { opacity: 0, y: 32 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-60px' },
    transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
} as const;


const gridContainer = {
    hidden: {},
    show: {
        transition: { staggerChildren: 0.05, delayChildren: 0.06 },
    },
};

const gridCell = {
    hidden: { opacity: 0, y: 10, scale: 0.96 },
    show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
    },
};

/** Fallback only if Unsplash fails to load. */
function GenerativeTile({ seed }: { seed: number }) {
    const a = (seed * 47) % 360;
    const b = (seed * 19) % 80;
    const x = 25 + (seed % 50);
    const y = 20 + (seed % 55);
    return (
        <div
            className="absolute inset-0 overflow-hidden rounded-lg"
            style={{
                background: `
          radial-gradient(ellipse 90% 75% at ${x}% ${y}%, hsla(${a} 55% 52% / 0.22) 0%, transparent 52%),
          linear-gradient(${128 + (seed % 80)}deg, hsl(${a} 32% ${10 + b * 0.08}%) 0%, hsl(${(a + 55) % 360} 28% 7%) 100%)
        `,
            }}
        />
    );
}

function PhotoCell({
    src,
    seed,
    sizes,
    priority,
}: {
    src: string;
    seed: number;
    sizes: string;
    priority?: boolean;
}) {
    const [failed, setFailed] = useState(false);

    return (
        <motion.div
            variants={gridCell}
            whileHover={{ scale: 1.045, zIndex: 2 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className="relative aspect-square overflow-hidden rounded-lg bg-neutral-900 ring-1 ring-white/[0.08]"
        >
            {failed ? (
                <GenerativeTile seed={seed} />
            ) : (
                <Image
                    src={src}
                    alt=""
                    fill
                    className="object-cover"
                    sizes={sizes}
                    priority={priority}
                    onError={() => setFailed(true)}
                />
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-80" />
        </motion.div>
    );
}

const CENTER_POSTER = gradientPoster(252, 288);

const topCards = [
    {
        title: 'Flux 3.14',
        body: 'Macro-fluid detail and light physics tuned for premium product and hero shots.',
        cta: 'Discover Flux 3.14',
        href: '/vstudio',
        sources: DARK_SHOWCASE_LEFT_CHAIN,
        poster: DARK_CARD_FLUX_POSTER,
    },
    {
        title: 'Depth 3',
        body: 'Toy shelves, kids’ brands, and lifestyle scenes with coherent motion and campaign-ready color.',
        cta: 'Discover Depth 3',
        href: '/vstudio',
        sources: DARK_SHOWCASE_RIGHT_CHAIN,
        poster: DARK_CARD_DEPTH_POSTER,
    },
];

function PillLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <Link
            href={href}
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-neutral-950 no-underline transition-opacity hover:opacity-90"
        >
            {children}
        </Link>
    );
}

/**
 * Dark band: video cards + real photo grids (Unsplash, same pipeline as product showcase) + center video.
 */
export default function DarkCinematicShowcase() {
    return (
        <section className="relative border-y border-white/10 bg-black px-4 py-20 text-white md:px-6 md:py-28">
            <div className="mx-auto max-w-[1200px]">
                <motion.div {...fade}>
                    <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-500">Models</p>
                    <h2 className="mt-3 text-[clamp(1.75rem,4vw,2.5rem)] font-semibold tracking-[-0.03em] text-white">
                        Explore the stack
                    </h2>
                    <p className="mt-4 max-w-[640px] text-[15px] leading-relaxed text-neutral-400 md:text-[17px]">
                        Kids’ toys, plush, blocks, and catalog stills in the grids; center and side videos rotate
                        ocean, forest, abstract, and city- the toy‑aisle reel plays only in the strip above.
                    </p>
                </motion.div>

                <motion.div {...fade} className="mt-14 grid gap-5 md:grid-cols-2 md:gap-6">
                    {topCards.map((card) => (
                        <div
                            key={card.title}
                            className="flex flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-neutral-950 shadow-[0_40px_100px_-40px_rgba(0,0,0,0.9)]"
                        >
                            <div className="relative aspect-[16/10] w-full bg-neutral-900">
                                <CinematicReferenceVideo
                                    sources={card.sources}
                                    poster={card.poster}
                                    className="absolute inset-0"
                                    videoClassName="absolute inset-0 h-full w-full object-cover"
                                />
                            </div>
                            <div className="flex flex-1 flex-col px-7 py-8 md:px-9 md:py-10">
                                <h3 className="text-xl font-semibold tracking-tight md:text-2xl">{card.title}</h3>
                                <p className="mt-3 flex-1 text-[14px] leading-relaxed text-neutral-400 md:text-[15px]">
                                    {card.body}
                                </p>
                                <div className="mt-8">
                                    <PillLink href={card.href}>{card.cta}</PillLink>
                                </div>
                            </div>
                        </div>
                    ))}
                </motion.div>

                <motion.div
                    {...fade}
                    className="mt-5 grid grid-cols-1 gap-8 md:mt-8 md:grid-cols-3 md:gap-8 lg:gap-10 lg:grid-cols-[1fr_1.12fr_1fr]"
                >
                    <motion.div
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: '-50px' }}
                        variants={gridContainer}
                        className="grid grid-cols-3 gap-1.5 rounded-[24px] border border-white/[0.07] bg-neutral-950 p-2 md:gap-2 md:p-2.5"
                    >
                        {DARK_SHOWCASE_GRID_LEFT.map((src, i) => (
                            <PhotoCell
                                key={`L-${i}-${src}`}
                                src={src}
                                seed={i + 200}
                                sizes="(max-width:768px) 28vw, 140px"
                                priority={i < 6}
                            />
                        ))}
                    </motion.div>

                    <div className="relative aspect-[4/5] overflow-hidden rounded-[24px] border border-white/[0.08] bg-neutral-950 md:aspect-auto md:min-h-[320px] lg:min-h-[360px]">
                        <CinematicReferenceVideo
                            sources={DARK_SHOWCASE_CENTER_CHAIN}
                            poster={CENTER_POSTER}
                            className="absolute inset-0"
                            videoClassName="absolute inset-0 h-full w-full object-cover"
                        />
                    </div>

                    <motion.div
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: '-50px' }}
                        variants={gridContainer}
                        className="grid grid-cols-2 gap-1.5 rounded-[24px] border border-white/[0.07] bg-neutral-950 p-2 md:gap-2 md:p-2.5"
                    >
                        {DARK_SHOWCASE_GRID_RIGHT.map((src, i) => (
                            <PhotoCell
                                key={`R-${i}-${src}`}
                                src={src}
                                seed={i + 400}
                                sizes="(max-width:768px) 42vw, 180px"
                            />
                        ))}
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
}
