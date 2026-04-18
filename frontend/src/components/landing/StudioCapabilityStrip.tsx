'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Wand2, Images, Video, LayoutDashboard } from 'lucide-react';
import { BRAND_NAME } from '@/lib/brand';

const TRUSTED_TEAMS = ['Publicis Groupe', 'Serviceplan', 'Mazda', 'Dentsu', 'Adidas', 'Humain'];

const fade = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '-50px' },
    transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
} as const;

const cards = [
    {
        icon: Wand2,
        title: 'Text → image',
        desc: 'Prompt once, get on-brand stills for ads and social.',
        href: '/studio',
    },
    {
        icon: Images,
        title: 'Image → image',
        desc: 'Restyle, relight, and iterate without a full reshoot.',
        href: '/studio',
    },
    {
        icon: Video,
        title: 'Motion',
        desc: 'Turn stills into short clips ready for performance creative.',
        href: '/studio',
    },
    {
        icon: LayoutDashboard,
        title: 'One workspace',
        desc: 'Projects, history, and billing in one place, no scattered tools.',
        href: '/dashboard',
    },
];

export default function StudioCapabilityStrip() {
    return (
        <section className="relative border-y border-neutral-200/80 bg-[#f8f8f6] py-16 md:py-24">
            <div
                className="pointer-events-none absolute inset-0 opacity-[0.45]"
                style={{
                    background:
                        'radial-gradient(700px 380px at 15% 0%, rgba(99, 102, 241, 0.09), transparent 60%), radial-gradient(600px 320px at 92% 100%, rgba(139, 92, 246, 0.07), transparent 55%)',
                }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:44px_44px]" />

            <div className="relative z-10 mx-auto max-w-[1100px] px-6">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="border-b border-neutral-200/80 pb-12 text-center md:pb-14"
                >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-neutral-500">
                        Trusted by creative teams
                    </p>
                    <p className="mx-auto mt-3 max-w-lg text-[14px] leading-relaxed text-neutral-600">
                        Agencies and in-house studios use {BRAND_NAME} to move from brief to shipped creative without a
                        dozen disconnected tools.
                    </p>
                    <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-10 gap-y-5 md:gap-x-14">
                        {TRUSTED_TEAMS.map((name) => (
                            <span
                                key={name}
                                className="text-[14px] font-semibold tracking-tight text-neutral-400 transition hover:text-neutral-600 md:text-[15px]"
                            >
                                {name}
                            </span>
                        ))}
                    </div>
                </motion.div>

                <motion.div {...fade} className="mx-auto mt-14 max-w-2xl text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
                        Inside the studio
                    </p>
                    <h2 className="mt-3 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-neutral-900 md:text-3xl">
                        Everything you need to produce with {BRAND_NAME}
                    </h2>
                    <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 md:text-base">
                        The same flows as the app, laid out so visitors instantly read “creative control room,” not
                        another generic landing page.
                    </p>
                </motion.div>

                <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {cards.map((c, i) => (
                        <motion.div
                            key={c.title}
                            initial={{ opacity: 0, y: 16 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-40px' }}
                            transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <Link
                                href={c.href}
                                className="group flex h-full flex-col rounded-2xl border border-neutral-200/90 bg-white/90 p-5 shadow-[0_12px_40px_-18px_rgba(15,23,42,0.12)] ring-1 ring-white/80 backdrop-blur-sm transition hover:border-indigo-200/80 hover:shadow-[0_20px_50px_-20px_rgba(99,102,241,0.18)]"
                            >
                                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 text-indigo-600 transition group-hover:from-indigo-500/25 group-hover:to-violet-500/15">
                                    <c.icon className="h-5 w-5" strokeWidth={2} />
                                </div>
                                <h3 className="font-[family-name:var(--font-display)] text-[15px] font-bold text-neutral-900">
                                    {c.title}
                                </h3>
                                <p className="mt-2 flex-1 text-[13px] leading-relaxed text-neutral-600">{c.desc}</p>
                                <span className="mt-4 text-[12px] font-semibold text-indigo-600 group-hover:text-indigo-500">
                                    Open workspace →
                                </span>
                            </Link>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
