'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { BRAND_NAME } from '@/lib/brand';
import { STUDIO_MODE_ITEMS } from '@/lib/studioTabs';
import { STUDIO_UI_PREVIEW_CLIP, STUDIO_UI_PREVIEW_POSTER } from '@/lib/landingVideoSources';

export default function StudioDockBand() {
    return (
        <section className="relative overflow-hidden border-y border-white/[0.06] bg-[#08080a] py-20 text-white md:py-28">
            <div
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        'radial-gradient(900px 520px at 50% -20%, rgba(139, 92, 246, 0.22), transparent 55%), radial-gradient(700px 420px at 100% 60%, rgba(99, 102, 241, 0.12), transparent 50%), radial-gradient(500px 360px at 0% 80%, rgba(167, 139, 250, 0.08), transparent 45%)',
                }}
            />
            <div className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-violet-600/25 blur-[100px]" />
            <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-indigo-600/20 blur-[110px]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.12] bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />

            <div className="relative z-10 mx-auto max-w-[1100px] px-6">
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                    className="text-center"
                >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-200/70">
                        Studio surface
                    </p>
                    <h2 className="mx-auto mt-3 max-w-2xl font-[family-name:var(--font-display)] text-[clamp(1.65rem,4vw,2.5rem)] font-bold leading-tight tracking-tight">
                        Step into the {BRAND_NAME} dock with the same modes as the live workspace
                    </h2>
                    <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/55">
                        Tabs, layout, and flow mirror what you see after you sign in. Preview the loop below, then open
                        the app when you&apos;re ready.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className="mx-auto mt-12 flex max-w-4xl flex-wrap items-center justify-center gap-2 md:gap-3"
                >
                    {STUDIO_MODE_ITEMS.map(({ id, label, icon: Icon, isNew }) => (
                        <Link
                            key={id}
                            href="/studio"
                            className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[13px] font-medium text-white/85 shadow-[0_0_0_1px_rgba(139,92,246,0.12)_inset] backdrop-blur-sm transition hover:border-violet-400/35 hover:bg-white/[0.07]"
                        >
                            <Icon className="h-4 w-4 text-violet-300" strokeWidth={2} />
                            <span>{label}</span>
                            {isNew && (
                                <span className="rounded bg-gradient-to-r from-indigo-500 to-violet-500 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white">
                                    NEW
                                </span>
                            )}
                        </Link>
                    ))}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-80px' }}
                    transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-14 grid items-center gap-12 lg:grid-cols-12 lg:gap-10"
                >
                    <div className="relative lg:col-span-7">
                        <div className="absolute -inset-1 rounded-[1.35rem] bg-gradient-to-br from-violet-500/40 via-indigo-500/25 to-transparent opacity-60 blur-lg" />
                        <div className="relative overflow-hidden rounded-[1.25rem] border border-white/[0.12] bg-black/40 shadow-[0_32px_80px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(139,92,246,0.15)_inset]">
                            <div className="flex h-9 items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-3">
                                <div className="flex gap-1.5 pl-1">
                                    <span className="h-2 w-2 rounded-full bg-red-400/80" />
                                    <span className="h-2 w-2 rounded-full bg-amber-400/80" />
                                    <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                                </div>
                                <span className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-white/35">
                                    {BRAND_NAME} · screen preview
                                </span>
                            </div>
                            <div className="relative aspect-video w-full bg-neutral-950">
                                <video
                                    className="h-full w-full object-cover"
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    poster={STUDIO_UI_PREVIEW_POSTER}
                                    preload="metadata"
                                >
                                    <source src={STUDIO_UI_PREVIEW_CLIP} type="video/mp4" />
                                </video>
                                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300/80">
                            Walkthrough
                        </p>
                        <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl font-bold leading-snug md:text-2xl">
                            A quick preview of how generation feels inside the app
                        </h3>
                        <p className="mt-4 text-[15px] leading-relaxed text-white/55">
                            This slot is meant for a short screen capture of your live `/studio` UI. Until then, a
                            soft botanical loop (same rose-toned clip as before) keeps the frame warm. Swap the asset
                            when your recording is ready.
                        </p>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Link
                                href="/studio"
                                className="inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-8 text-[14px] font-bold text-white shadow-lg shadow-violet-500/30 transition hover:opacity-[0.96]"
                            >
                                Open {BRAND_NAME}
                            </Link>
                            <Link
                                href="/register"
                                className="inline-flex h-12 items-center justify-center rounded-full border border-white/15 px-8 text-[14px] font-semibold text-white/80 transition hover:border-white/25 hover:bg-white/[0.04]"
                            >
                                Create account
                            </Link>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
