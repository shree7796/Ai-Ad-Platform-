'use client';

import { motion } from 'framer-motion';
import { PROMO_STRIP_VIDEO_CHAIN, PROMO_STRIP_POSTER } from '@/lib/landingVideoSources';
import CinematicReferenceVideo from '@/components/landing/CinematicReferenceVideo';

/**
 * Full-bleed-style clip in a framed card- reference-quality motion, lighter scrim than before.
 */
export default function LightPromoVideoStrip() {
    return (
        <section className="relative w-full overflow-hidden bg-[#ececea] py-16 md:py-24">
            <div className="mx-auto max-w-[1100px] px-6">
                <motion.p
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                    className="text-center text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-400"
                >
                    AI video · e‑commerce & kids’ brands
                </motion.p>
                <motion.h2
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.9, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                    className="mt-3 text-center text-xl font-semibold tracking-tight text-neutral-800 md:text-2xl"
                >
                    From toy aisles to premium catalogs
                </motion.h2>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 1.1, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="relative mx-auto mt-12 max-w-[1000px] px-6"
            >
                <div className="relative aspect-video w-full overflow-hidden rounded-[24px] border border-white/90 bg-neutral-950 shadow-[0_32px_100px_-24px_rgba(15,23,42,0.35)] ring-1 ring-black/[0.06]">
                    <CinematicReferenceVideo
                        sources={PROMO_STRIP_VIDEO_CHAIN}
                        poster={PROMO_STRIP_POSTER}
                        className="absolute inset-0"
                        videoClassName="absolute inset-0 h-full w-full object-cover"
                    />
                    {/* Light edge blend only- keep footage visible like premium marketing sites */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-[#f5f5f4]/35" />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-[#ececea]/90 to-transparent" />
                </div>
            </motion.div>
        </section>
    );
}
