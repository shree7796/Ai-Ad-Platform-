'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { SHOWCASE_PRODUCTS } from '@/lib/showcaseProducts';

const fade = {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-80px' },
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
} as const;

const cardClass =
    'rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-[0_12px_40px_-12px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.03] md:p-8';

export function ProductPlatformSection() {
    const featured = SHOWCASE_PRODUCTS.slice(4, 6);
    return (
        <section className="border-b border-neutral-200/80 bg-white px-6 py-24 md:py-32">
            <div className="mx-auto max-w-[1100px]">
                <motion.div {...fade}>
                    <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-tight tracking-[-0.03em] text-neutral-900">
                        Product &amp; Platform
                    </h2>
                    <p className="mt-5 max-w-[720px] text-[17px] leading-relaxed text-neutral-500 md:text-lg">
                        Foundations for a new era of creativity and human expression- built for e‑commerce teams.
                    </p>

                    <div className={`mt-14 ${cardClass}`}>
                        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
                            <div className="max-w-[560px]">
                                <h3 className="text-xl font-semibold tracking-tight text-neutral-900 md:text-2xl">Lumina</h3>
                                <p className="mt-4 text-[15px] leading-relaxed text-neutral-600 md:text-base">
                                    Direct creative work from concept to delivery with agents that generate, transform, and
                                    coordinate media across image, video, and audio, and text.
                                </p>
                                <Link
                                    href="/vstudio"
                                    className="mt-8 inline-flex items-center gap-2 text-[14px] font-medium text-neutral-900 no-underline transition-opacity hover:opacity-70"
                                >
                                    Learn more
                                    <ArrowRight className="h-4 w-4 opacity-70" strokeWidth={2} />
                                </Link>
                            </div>
                            <div className="flex gap-4">
                                {featured.map((p) => (
                                    <div
                                        key={p.id}
                                        className="relative h-36 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-neutral-50 shadow-sm ring-1 ring-neutral-100 md:h-44 md:w-32"
                                    >
                                        <Image src={p.src} alt={p.label} fill className="object-cover" sizes="128px" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

const researchItems = [
    {
        title: 'Lumina Core',
        badge: 'new',
        copy: 'Our first unified understanding and generation stack- a step toward multimodal intelligence for ads and creative.',
        cta: 'Learn more',
        href: '/vstudio',
        productIdx: 2,
    },
    {
        title: 'Motion Engine',
        badge: null,
        copy: 'Fast, coherent motion with realistic detail and logical sequences for commercial and social video.',
        cta: 'Discover',
        href: '#',
        productIdx: 3,
    },
    {
        title: 'Brand Reasoning',
        badge: null,
        copy: 'Models tuned for brand-safe storytelling, continuity, and campaign-level coherence.',
        cta: 'Discover',
        href: '#',
        productIdx: 8,
    },
];

const engineering = [
    { date: 'Nov 26, 2025', title: 'Pushing the Limit of Efficient Inference-Time Scaling' },
    { date: 'Oct 14, 2025', title: 'Evaluation Report- Pro Video Generation' },
    { date: 'Mar 11, 2025', title: 'Breaking the Algorithmic Ceiling in Pre-Training' },
];

export function ResearchSection() {
    return (
        <section className="border-b border-neutral-200/80 bg-[#fafafa] px-6 py-24 md:py-32">
            <div className="mx-auto max-w-[1100px]">
                <motion.div {...fade}>
                    <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-tight tracking-[-0.03em] text-neutral-900">
                        Research
                    </h2>
                    <p className="mt-5 max-w-[720px] text-[17px] leading-relaxed text-neutral-500 md:text-lg">
                        We are focused on foundational research and systems engineering to build multimodal general
                        intelligence.
                    </p>

                    <div className="mt-14 grid gap-6 md:grid-cols-3">
                        {researchItems.map((item) => (
                            <div key={item.title} className={`flex flex-col ${cardClass}`}>
                                <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-xl bg-neutral-100">
                                    <Image
                                        src={SHOWCASE_PRODUCTS[item.productIdx].src}
                                        alt=""
                                        fill
                                        className="object-cover"
                                        sizes="(max-width:768px) 100vw, 320px"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-semibold text-neutral-900">{item.title}</h3>
                                    {item.badge && (
                                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                <p className="mt-3 flex-1 text-[14px] leading-relaxed text-neutral-600">{item.copy}</p>
                                <Link
                                    href={item.href}
                                    className="mt-6 inline-flex items-center gap-2 text-[13px] font-medium text-neutral-900 no-underline hover:opacity-70"
                                >
                                    {item.cta}
                                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                                </Link>
                            </div>
                        ))}
                    </div>

                    <div className="mt-16 border-t border-neutral-200/80 pt-12">
                        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">Engineering</p>
                        <ul className="mt-6 space-y-4">
                            {engineering.map((row) => (
                                <li key={row.title}>
                                    <Link href="#" className="group flex flex-wrap items-baseline gap-x-3 no-underline">
                                        <span className="text-[13px] text-neutral-400">{row.date}</span>
                                        <span className="text-[15px] text-neutral-700 transition-colors group-hover:text-neutral-900">
                                            {row.title}
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}

const newsItems = [
    { cat: 'Company', date: 'Feb 19, 2026', title: 'Partners deploy creative AI across global brand operations.' },
    { cat: 'Company', date: 'Feb 11, 2026', title: 'Regional studio expansion and enterprise partnerships.' },
    { cat: 'Product', date: 'Jan 26, 2026', title: 'Faster generation: higher resolution and lower latency for teams.' },
];

export function RecentNewsSection() {
    return (
        <section className="border-b border-neutral-200/80 bg-white px-6 py-24 md:py-32">
            <div className="mx-auto max-w-[1100px]">
                <motion.div {...fade} className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-tight tracking-[-0.03em] text-neutral-900">
                            Recent News
                        </h2>
                        <p className="mt-4 max-w-[520px] text-[17px] leading-relaxed text-neutral-500">
                            Stay up to date with product releases and stories from across the industry.
                        </p>
                    </div>
                    <Link href="#" className="text-[14px] font-medium text-neutral-600 no-underline hover:text-neutral-900">
                        All news →
                    </Link>
                </motion.div>

                <motion.ul {...fade} className="mt-14 divide-y divide-neutral-200/90 border-t border-neutral-200/90">
                    {newsItems.map((n) => (
                        <li key={n.title} className="py-7">
                            <div className="flex flex-wrap items-center gap-3 text-[12px] text-neutral-500">
                                <span>{n.cat}</span>
                                <span className="text-neutral-300">·</span>
                                <span>{n.date}</span>
                            </div>
                            <Link
                                href="#"
                                className="mt-2 block text-[17px] font-medium text-neutral-800 no-underline hover:text-neutral-950"
                            >
                                {n.title}
                            </Link>
                        </li>
                    ))}
                </motion.ul>
            </div>
        </section>
    );
}

export function TeamCommunitySection() {
    return (
        <section className="bg-[#fafafa] px-6 py-24 md:py-32">
            <div className="mx-auto max-w-[1100px]">
                <motion.div {...fade}>
                    <h2 className="text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-tight tracking-[-0.03em] text-neutral-900">
                        Team &amp; Community
                    </h2>
                    <p className="mt-4 text-[17px] text-neutral-500">Everything we can imagine should be real.</p>

                    <div className="mt-14 grid gap-6 md:grid-cols-2 md:gap-10">
                        <div className={cardClass}>
                            <h3 className="text-lg font-semibold text-neutral-900">Careers</h3>
                            <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
                                We&apos;re building the future of creative intelligence. If you share our vision of AI that
                                enables extraordinary human expression, we&apos;d love to talk.
                            </p>
                            <Link
                                href="#"
                                className="mt-5 inline-flex items-center gap-2 text-[14px] font-medium text-neutral-900 no-underline hover:opacity-70"
                            >
                                View roles
                                <ArrowRight className="h-4 w-4" strokeWidth={2} />
                            </Link>
                        </div>
                        <div className={cardClass}>
                            <h3 className="text-lg font-semibold text-neutral-900">Learning Center</h3>
                            <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">
                                Explore workflows, best practices, and new ways to bring ideas to life with an intelligent
                                multimodal agent by your side.
                            </p>
                            <Link
                                href="#"
                                className="mt-5 inline-flex items-center gap-2 text-[14px] font-medium text-neutral-900 no-underline hover:opacity-70"
                            >
                                Explore
                                <ArrowRight className="h-4 w-4" strokeWidth={2} />
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
