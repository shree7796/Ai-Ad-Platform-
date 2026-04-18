'use client';

import React from 'react';
import { motion } from 'framer-motion';
import LandingNav from '@/components/landing/LandingNav';
import CinematicPromoHero from '@/components/landing/CinematicPromoHero';
import LightPromoVideoStrip from '@/components/landing/LightPromoVideoStrip';
import LogoCloud from '@/components/landing/LogoCloud';
import DarkCinematicShowcase from '@/components/landing/DarkCinematicShowcase';
import AiEcommerceCreativeSection from '@/components/landing/AiEcommerceCreativeSection';
import {
    ProductPlatformSection,
    ResearchSection,
    RecentNewsSection,
    TeamCommunitySection,
} from '@/components/landing/LumaHomeSections';
import Link from 'next/link';

const footerColumns: { title: string; links: { label: string; href: string }[] }[] = [
    {
        title: 'Product',
        links: [
            { label: 'Pricing', href: '/studio/billing' },
            { label: 'Use Cases', href: '#' },
            { label: 'Platform', href: '/vstudio' },
            { label: 'API', href: '#' },
            { label: 'Enterprise', href: '#' },
        ],
    },
    {
        title: 'Company',
        links: [
            { label: 'Join Us', href: '#' },
            { label: 'Creative Partner Program', href: '#' },
            { label: 'Education Program', href: '#' },
            { label: 'Learning Center', href: '#' },
            { label: 'Media kit', href: '#' },
        ],
    },
    {
        title: 'Legal',
        links: [
            { label: 'Terms of Service', href: '#' },
            { label: 'Privacy Policy', href: '#' },
        ],
    },
];

export default function LandingPage() {
    return (
        <main className="relative min-h-screen w-full overflow-x-hidden bg-[#fafafa] selection:bg-indigo-500/20">
            <div className="relative z-20">
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                >
                    <LandingNav theme="light" />
                </motion.div>

                {/* AI studio positioning — light shell, clear CTAs */}
                <section className="relative z-20 mx-auto max-w-3xl px-6 pt-24 text-center md:max-w-4xl md:pt-28">
                    <span className="inline-flex items-center rounded-full border border-indigo-200/80 bg-white/90 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-indigo-600 shadow-sm backdrop-blur">
                        AI Creative Studio
                    </span>
                    <h1 className="mt-5 text-balance text-3xl font-black tracking-tight text-neutral-900 md:text-5xl md:leading-[1.08]">
                        Studio-grade images &amp; video from one workspace
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-neutral-600 md:text-lg">
                        Prompt, iterate, and ship campaign-ready creatives — built for teams who want Luma-style polish without the complexity.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                        <Link
                            href="/studio"
                            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-3 text-sm font-bold text-white no-underline shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500"
                        >
                            Open Studio
                        </Link>
                        <Link
                            href="/register"
                            className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-bold text-neutral-900 no-underline shadow-sm transition hover:border-neutral-400"
                        >
                            Start free
                        </Link>
                    </div>
                </section>

                <div className="flex flex-col">
                    <CinematicPromoHero />
                    <LightPromoVideoStrip />
                    <AiEcommerceCreativeSection />
                    <LogoCloud />
                    <DarkCinematicShowcase />
                    <ProductPlatformSection />
                    <ResearchSection />
                    <RecentNewsSection />
                    <TeamCommunitySection />
                </div>

                <footer className="border-t border-neutral-200/90 bg-white px-6 py-20 md:px-12 md:py-28">
                    <div className="mx-auto flex max-w-[1100px] flex-col gap-16 md:flex-row md:justify-between">
                        <div>
                            <Link href="/" className="inline-flex items-center gap-2.5 no-underline">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]">
                                    <span className="text-[11px] font-black text-white">L</span>
                                </div>
                                <span className="text-[17px] font-semibold tracking-tight text-neutral-900">Lumina</span>
                            </Link>
                            <p className="mt-6 max-w-xs text-[14px] leading-relaxed text-neutral-500">
                                AI agents for creative work — from concept to delivery.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-12 sm:grid-cols-3 md:gap-20">
                            {footerColumns.map((col) => (
                                <div key={col.title}>
                                    <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-neutral-400">
                                        {col.title}
                                    </div>
                                    <ul className="mt-5 space-y-3">
                                        {col.links.map((l) => (
                                            <li key={l.label}>
                                                <Link
                                                    href={l.href}
                                                    className="text-[14px] text-neutral-600 no-underline transition-colors hover:text-neutral-900"
                                                >
                                                    {l.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="mx-auto mt-20 flex max-w-[1100px] flex-col items-start justify-between gap-4 border-t border-neutral-200/90 pt-10 text-[12px] text-neutral-400 md:flex-row md:items-center">
                        <span>© {new Date().getFullYear()} Lumina. All rights reserved.</span>
                        <div className="flex gap-8">
                            {['Twitter', 'Instagram', 'YouTube'].map((s) => (
                                <Link key={s} href="#" className="text-inherit no-underline hover:text-neutral-600">
                                    {s}
                                </Link>
                            ))}
                        </div>
                    </div>
                </footer>
            </div>
        </main>
    );
}
