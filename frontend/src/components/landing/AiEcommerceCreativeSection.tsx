'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ImageIcon, Video } from 'lucide-react';
import CinematicReferenceVideo from '@/components/landing/CinematicReferenceVideo';
import {
    AI_ADS_CAMPAIGN_HERO_CHAIN,
    AI_ADS_PRODUCT_FILM_CHAIN,
    AI_ADS_SOCIAL_MOTION_CHAIN,
    AI_ADS_VIDEO_CAMPAIGN_POSTER,
    AI_ADS_VIDEO_PRODUCT_POSTER,
    AI_ADS_VIDEO_SOCIAL_POSTER,
} from '@/lib/landingVideoSources';
import { SHOWCASE_PRODUCTS } from '@/lib/showcaseProducts';

const fade = {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-70px' },
    transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
} as const;

const stillA = SHOWCASE_PRODUCTS.find((p) => p.id === 'sneaker') ?? SHOWCASE_PRODUCTS[0];
const stillB = SHOWCASE_PRODUCTS.find((p) => p.id === 'skincare') ?? SHOWCASE_PRODUCTS[3];

const videoTiles = [
    {
        key: 'product',
        title: 'Product & PDP video',
        body: 'Turn a single packshot into short ads, rotations, and feature callouts for listings.',
        sources: AI_ADS_PRODUCT_FILM_CHAIN,
        poster: AI_ADS_VIDEO_PRODUCT_POSTER,
        icon: Video,
    },
    {
        key: 'social',
        title: 'Social & performance cuts',
        body: 'Square, vertical, and 16:9 renditions tuned for Meta, TikTok, and display.',
        sources: AI_ADS_SOCIAL_MOTION_CHAIN,
        poster: AI_ADS_VIDEO_SOCIAL_POSTER,
        icon: Video,
    },
    {
        key: 'hero',
        title: 'Campaign & hero motion',
        body: 'Cinematic hooks, supers, and end cards that match your brand system.',
        sources: AI_ADS_CAMPAIGN_HERO_CHAIN,
        poster: AI_ADS_VIDEO_CAMPAIGN_POSTER,
        icon: Video,
    },
] as const;

/**
 * Extra AI commerce placements: multiple video use-cases + still “generation” tiles.
 */
export default function AiEcommerceCreativeSection() {
    return (
        <section className="border-b border-neutral-200/90 bg-gradient-to-b from-white to-[#f7f7f6] px-4 py-20 md:px-6 md:py-28">
            <div className="mx-auto max-w-[1140px]">
                <motion.div {...fade} className="max-w-[720px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neutral-400">
                        AI for commerce
                    </p>
                    <h2 className="mt-3 text-[clamp(1.65rem,3.8vw,2.35rem)] font-semibold tracking-[-0.03em] text-neutral-900">
                        More AI ads: video and image creation for products
                    </h2>
                    <p className="mt-4 text-[15px] leading-relaxed text-neutral-600 md:text-[17px]">
                        Generate ecommerce films from briefs, stills, or catalogs — plus packshots and variant grids for
                        the same campaign. Everything below runs on your self-hosted clips with distinct stacks per
                        placement.
                    </p>
                    <Link
                        href="/vstudio"
                        className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-indigo-600 no-underline hover:text-indigo-800"
                    >
                        Open creative studio
                        <ArrowRight className="h-4 w-4" strokeWidth={2} />
                    </Link>
                </motion.div>

                <motion.div
                    {...fade}
                    className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6"
                >
                    {videoTiles.map((tile) => (
                        <div
                            key={tile.key}
                            className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_20px_60px_-24px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.03]"
                        >
                            <div className="relative aspect-video w-full bg-neutral-100">
                                <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                                    <tile.icon className="h-3 w-3" strokeWidth={2} />
                                    Video
                                </div>
                                <CinematicReferenceVideo
                                    sources={tile.sources}
                                    poster={tile.poster}
                                    className="absolute inset-0"
                                    videoClassName="absolute inset-0 h-full w-full object-cover"
                                />
                            </div>
                            <div className="flex flex-1 flex-col p-5 md:p-6">
                                <h3 className="text-lg font-semibold tracking-tight text-neutral-900">{tile.title}</h3>
                                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-neutral-600 md:text-[14px]">
                                    {tile.body}
                                </p>
                            </div>
                        </div>
                    ))}
                </motion.div>

                <motion.div
                    {...fade}
                    className="mt-6 grid gap-5 sm:grid-cols-2 lg:mt-8 lg:gap-6"
                >
                    <div className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_20px_60px_-24px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.03]">
                        <div className="relative aspect-[4/3] w-full bg-neutral-100">
                            <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-800 shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
                                <ImageIcon className="h-3 w-3" strokeWidth={2} />
                                Image
                            </div>
                            <Image
                                src={stillA.src}
                                alt={stillA.label}
                                fill
                                className="object-cover"
                                sizes="(max-width:1024px) 100vw, 540px"
                            />
                        </div>
                        <div className="p-5 md:p-6">
                            <h3 className="text-lg font-semibold tracking-tight text-neutral-900">Packshots & variants</h3>
                            <p className="mt-2 text-[13px] leading-relaxed text-neutral-600 md:text-[14px]">
                                New angles, backgrounds, and colorways from one master shot — ready for PDP and paid
                                social statics.
                            </p>
                        </div>
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-neutral-200/90 bg-white shadow-[0_20px_60px_-24px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.03]">
                        <div className="relative aspect-[4/3] w-full bg-neutral-100">
                            <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-800 shadow-sm ring-1 ring-black/5 backdrop-blur-sm">
                                <ImageIcon className="h-3 w-3" strokeWidth={2} />
                                Image
                            </div>
                            <Image
                                src={stillB.src}
                                alt={stillB.label}
                                fill
                                className="object-cover"
                                sizes="(max-width:1024px) 100vw, 540px"
                            />
                        </div>
                        <div className="p-5 md:p-6">
                            <h3 className="text-lg font-semibold tracking-tight text-neutral-900">Lifestyle and context</h3>
                            <p className="mt-2 text-[13px] leading-relaxed text-neutral-600 md:text-[14px]">
                                Scene-built stills for lookbooks, email, and storefront heroes — matched to your video
                                look and feel.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
