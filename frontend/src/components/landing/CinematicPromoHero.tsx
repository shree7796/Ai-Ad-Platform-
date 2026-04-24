'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { SHOWCASE_PRODUCTS, type ShowcaseProduct } from '@/lib/showcaseProducts';
import {
    FULL_HERO_VIDEO_CHAIN,
    CINEMATIC_REFERENCE_POSTER,
} from '@/lib/landingVideoSources';
import CinematicReferenceVideo from '@/components/landing/CinematicReferenceVideo';

/**
 * Slower cinematic loop (~36s) + Luma-style reference background video (see landingVideoSources).
 */

const CYCLE_MS = 36000;
const SCENE_COUNT = 5;
const SCENE_MS = CYCLE_MS / SCENE_COUNT;

const P = SHOWCASE_PRODUCTS;

const easeSmooth = [0.33, 1, 0.28, 1] as const;

const sceneTransition = { duration: 1.65, ease: easeSmooth };

export default function CinematicPromoHero() {
    const [scene, setScene] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setScene((s) => (s + 1) % SCENE_COUNT);
        }, SCENE_MS);
        return () => clearInterval(id);
    }, []);

    return (
        <section className="relative min-h-[100svh] w-full overflow-hidden bg-[#f5f5f4] text-neutral-900">
            {/* Ambient background video- very soft so light UI stays dominant */}
            <div className="pointer-events-none absolute inset-0 z-0">
                <CinematicReferenceVideo
                    sources={FULL_HERO_VIDEO_CHAIN}
                    poster={CINEMATIC_REFERENCE_POSTER}
                    videoClassName="absolute inset-0 h-full w-full scale-105 object-cover opacity-[0.42] md:opacity-[0.38]"
                />
                <div className="absolute inset-0 bg-[#f5f5f4]/42" />
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'radial-gradient(ellipse 100% 80% at 50% 30%, rgba(255,255,255,0.55) 0%, rgba(245,245,244,0.5) 45%, rgba(240,240,238,0.72) 100%)',
                    }}
                />
            </div>
            <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/25 via-transparent to-stone-200/20" />

            {/* Slow drift orbs */}
            <motion.div
                className="pointer-events-none absolute -left-32 top-1/4 z-[1] h-72 w-72 rounded-full bg-white/40 blur-3xl"
                animate={{ x: [0, 24, 0], y: [0, 18, 0], opacity: [0.35, 0.55, 0.35] }}
                transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
                className="pointer-events-none absolute -right-24 bottom-1/4 z-[1] h-80 w-80 rounded-full bg-stone-200/50 blur-3xl"
                animate={{ x: [0, -20, 0], y: [0, -14, 0], opacity: [0.3, 0.5, 0.3] }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative z-10 mx-auto flex min-h-[min(100svh,920px)] max-w-[1200px] flex-col justify-center px-6 pb-20 pt-10 md:px-10 md:pt-12">
                <div className="relative mx-auto aspect-video w-full max-w-[1080px] overflow-hidden rounded-[28px] border border-white/80 bg-white/55 shadow-[0_32px_120px_-16px_rgba(15,23,42,0.12),0_0_0_1px_rgba(255,255,255,0.9)_inset] backdrop-blur-xl">
                    <SceneProgress scene={scene} />

                    <AnimatePresence mode="wait">
                        {scene === 0 && <SceneProductFloat key="s0" product={P[0]} />}
                        {scene === 1 && <SceneStudioAd key="s1" product={P[1]} />}
                        {scene === 2 && <SceneVariations key="s2" products={[P[0], P[2], P[3]]} />}
                        {scene === 3 && <SceneCopy key="s3" />}
                        {scene === 4 && <SceneGrid key="s4" products={P.slice(0, 4)} />}
                    </AnimatePresence>
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 1 }}
                    className="mx-auto mt-10 max-w-lg text-center text-[13px] text-neutral-500"
                >
                    AI-powered creative for commerce- ~{CYCLE_MS / 1000}s loop ·{' '}
                    <Link
                        href="/vstudio"
                        className="font-medium text-neutral-800 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-600"
                    >
                        Open studio
                    </Link>
                </motion.p>
            </div>
        </section>
    );
}

function SceneProgress({ scene }: { scene: number }) {
    return (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 flex w-[min(88%,360px)] -translate-x-1/2 gap-1.5 px-2">
            {Array.from({ length: SCENE_COUNT }).map((_, i) => (
                <motion.div
                    key={i}
                    className="h-1 flex-1 rounded-full bg-neutral-300/90"
                    initial={false}
                    animate={{
                        opacity: scene === i ? 1 : 0.35,
                        scaleY: scene === i ? 1.35 : 1,
                        backgroundColor: scene === i ? 'rgba(64,64,64,0.85)' : 'rgba(200,200,200,0.9)',
                    }}
                    transition={{ duration: 0.55, ease: easeSmooth }}
                />
            ))}
        </div>
    );
}

function sceneWrap(children: ReactNode) {
    return (
        <motion.div
            initial={{ opacity: 0, filter: 'blur(14px)', scale: 1.02 }}
            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
            exit={{ opacity: 0, filter: 'blur(12px)', scale: 0.99 }}
            transition={sceneTransition}
            className="absolute inset-0 flex items-center justify-center"
        >
            {children}
        </motion.div>
    );
}

function SceneProductFloat({ product }: { product: ShowcaseProduct }) {
    return sceneWrap(
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-stone-50/90 to-stone-100/80 px-8">
            <motion.div
                className="relative"
                animate={{
                    y: [0, -14, 0],
                    scale: [1, 1.06, 1],
                    rotate: [-0.6, 0.6, -0.6],
                }}
                transition={{
                    duration: 6.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                }}
            >
                <motion.div
                    className="relative h-[min(42vh,320px)] w-[min(72vw,420px)]"
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <Image
                        src={product.src}
                        alt={product.label}
                        fill
                        className="object-contain drop-shadow-[0_28px_60px_rgba(15,23,42,0.15)]"
                        sizes="(max-width: 900px) 72vw, 420px"
                        priority
                    />
                </motion.div>
            </motion.div>
            <motion.p
                className="mt-8 text-center text-[11px] font-medium uppercase tracking-[0.35em] text-neutral-400"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 1, ease: easeSmooth }}
            >
                Start with one image · {product.category}
            </motion.p>
        </div>
    );
}

function SceneStudioAd({ product }: { product: ShowcaseProduct }) {
    return sceneWrap(
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-100 via-stone-50 to-neutral-200 px-6 py-10">
            <motion.div
                className="relative w-full max-w-[520px]"
                initial={{ scale: 0.9, rotateX: 10, y: 20 }}
                animate={{ scale: 1, rotateX: 0, y: 0 }}
                transition={{ duration: 1.5, ease: easeSmooth }}
                style={{ perspective: 1200 }}
            >
                <motion.div
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_40px_100px_-20px_rgba(15,23,42,0.2)] ring-1 ring-black/[0.04]">
                        <div className="relative aspect-[4/3] w-full bg-gradient-to-b from-neutral-50 to-neutral-100">
                            <motion.div
                                className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(255,255,255,0.9),transparent)]"
                                animate={{ opacity: [0.85, 1, 0.85] }}
                                transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <motion.div
                                className="relative h-full w-full"
                                animate={{ scale: [1, 1.03, 1] }}
                                transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
                            >
                                <Image src={product.src} alt={product.label} fill className="object-contain p-8" sizes="520px" />
                            </motion.div>
                            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/[0.06] to-transparent" />
                        </div>
                        <div className="border-t border-neutral-100 px-5 py-4">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400">Studio lit</p>
                            <p className="mt-1 text-sm font-medium text-neutral-800">{product.label} · campaign-ready</p>
                        </div>
                    </div>
                </motion.div>
                <div
                    className="pointer-events-none -mt-4 h-24 scale-y-[-1] opacity-[0.18]"
                    style={{
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.15), transparent)',
                        filter: 'blur(4px)',
                    }}
                />
            </motion.div>
        </div>
    );
}

function SceneVariations({ products }: { products: ShowcaseProduct[] }) {
    return sceneWrap(
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#f0f0ee] px-4 py-8">
            <motion.div
                className="flex w-full max-w-[720px] items-center justify-center gap-3 md:gap-5"
                animate={{ x: [0, -36, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
                {products.map((p, i) => (
                    <motion.div
                        key={p.id}
                        className="relative aspect-[3/4] w-[30%] max-w-[200px] flex-shrink-0 overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] ring-1 ring-black/[0.05]"
                        animate={{ y: [0, i % 2 === 0 ? -8 : 8, 0] }}
                        transition={{ duration: 4 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                        <Image src={p.src} alt={p.label} fill className="object-cover" sizes="200px" />
                    </motion.div>
                ))}
            </motion.div>
            <motion.p
                className="mt-8 text-center text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-400"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 1.1 }}
            >
                Variations · different categories · one workflow
            </motion.p>
        </div>
    );
}

function SceneCopy() {
    return sceneWrap(
        <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-white via-stone-50/90 to-stone-100/80 px-8">
            <motion.h2
                className="max-w-[640px] text-center text-[clamp(1.35rem,3.8vw,2.25rem)] font-semibold leading-[1.2] tracking-tight text-neutral-900"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.25, ease: easeSmooth }}
            >
                Create Stunning Product Ads with AI
            </motion.h2>
            <motion.p
                className="mt-5 max-w-[520px] text-center text-[clamp(0.95rem,2.2vw,1.15rem)] text-neutral-500"
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, delay: 0.35, ease: easeSmooth }}
            >
                From Simple Image to Professional Creative
            </motion.p>
            <motion.div
                className="mt-10 h-px w-32 bg-gradient-to-r from-transparent via-neutral-300 to-transparent"
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 1.4, delay: 0.65, ease: easeSmooth }}
            />
        </div>
    );
}

function SceneGrid({ products }: { products: ShowcaseProduct[] }) {
    return sceneWrap(
        <div className="flex h-full w-full items-center justify-center bg-neutral-100/90 px-5 py-8">
            <div className="grid w-full max-w-[640px] grid-cols-2 gap-3 md:gap-4">
                {products.map((p, i) => (
                    <motion.div
                        key={p.id}
                        initial={{ opacity: 0, y: 22, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: i * 0.22, duration: 0.95, ease: easeSmooth }}
                        className="flex aspect-[4/3] flex-col overflow-hidden rounded-xl bg-white shadow-[0_12px_40px_-8px_rgba(15,23,42,0.1)] ring-1 ring-black/[0.04]"
                    >
                        <motion.div
                            className="relative flex-1 bg-neutral-50"
                            animate={{ opacity: [1, 0.92, 1] }}
                            transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                        >
                            <Image
                                src={p.src}
                                alt={p.label}
                                fill
                                className="object-contain p-3"
                                sizes="(max-width: 768px) 40vw, 200px"
                            />
                        </motion.div>
                        <div className="border-t border-neutral-100 px-3 py-2">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400">Generated ad</p>
                            <p className="truncate text-[11px] font-medium text-neutral-700">{p.label}</p>
                            <p className="truncate text-[10px] text-neutral-500">{p.category}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
