'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

/** Krea-style grouped “Generate” menu (sections + items). */
const GENERATE_GROUPS: { section: string; items: { label: string; desc: string; href: string }[] }[] = [
    {
        section: 'AI Image Generation',
        items: [
            { label: 'Text to Image', desc: 'Create images from any prompt', href: '/studio?tab=text-to-image' },
            { label: 'Realtime Image Generation', desc: 'See results as you type', href: '/vstudio' },
        ],
    },
    {
        section: 'AI Video Generation',
        items: [
            { label: 'Text to Video', desc: 'Animate ideas into motion', href: '/studio?tab=text-to-video' },
            { label: 'Image to Video', desc: 'Bring stills to life', href: '/studio?tab=image-to-video' },
        ],
    },
    {
        section: 'AI 3D Generation',
        items: [
            { label: 'Text to 3D Object', desc: 'Describe geometry in words', href: '/studio' },
            { label: 'Image to 3D Object', desc: 'Turn photos into 3D assets', href: '/studio' },
        ],
    },
    {
        section: 'Edit',
        items: [
            { label: 'Upscaling', desc: 'Sharper images & video', href: '/studio?tab=text-to-image' },
            { label: 'Generative Image Editing', desc: 'Inpaint, outpaint, replace', href: '/studio?tab=image-to-image' },
            { label: 'Image to Image', desc: 'Restyle and transform', href: '/studio?tab=image-to-image' },
        ],
    },
    {
        section: 'Customize',
        items: [
            { label: 'Image LoRA Fine-tuning', desc: 'Train on your brand look', href: '/studio' },
            { label: 'Asset Manager', desc: 'Organise all your creatives', href: '/studio' },
        ],
    },
];

const FLAT_LINKS: { label: string; href: string }[] = [
    { label: 'Image Generator', href: '/studio?tab=text-to-image' },
    { label: 'Video Generator', href: '/studio?tab=text-to-video' },
    { label: 'Upscaler', href: '/studio' },
    { label: 'API', href: '/contact' },
    { label: 'Pricing', href: '/studio/billing' },
    { label: 'Enterprise', href: '/contact' },
];

const OPEN_MS = 45;
const CLOSE_MS = 220;

function FeaturesDropdown({ onDark }: { onDark: boolean }) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const openT = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeT = useRef<ReturnType<typeof setTimeout> | null>(null);

    const measurePanelAnchor = useCallback(() => {
        const btn = wrapRef.current?.querySelector('button');
        if (!btn) return;
        const r = btn.getBoundingClientRect();
        setPanelPos({ top: r.bottom + 10, left: r.left + r.width / 2 });
    }, []);

    const clearTimers = () => {
        if (openT.current) {
            clearTimeout(openT.current);
            openT.current = null;
        }
        if (closeT.current) {
            clearTimeout(closeT.current);
            closeT.current = null;
        }
    };

    const scheduleOpen = () => {
        clearTimers();
        openT.current = setTimeout(() => {
            openT.current = null;
            measurePanelAnchor();
            setOpen(true);
        }, OPEN_MS);
    };

    const scheduleClose = () => {
        clearTimers();
        closeT.current = setTimeout(() => {
            closeT.current = null;
            setOpen(false);
        }, CLOSE_MS);
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    useLayoutEffect(() => {
        if (!open) return;
        measurePanelAnchor();
        const onReposition = () => measurePanelAnchor();
        window.addEventListener('scroll', onReposition, true);
        window.addEventListener('resize', onReposition);
        return () => {
            window.removeEventListener('scroll', onReposition, true);
            window.removeEventListener('resize', onReposition);
        };
    }, [open, measurePanelAnchor]);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const t = e.target as Node;
            if (wrapRef.current?.contains(t)) return;
            if (panelRef.current?.contains(t)) return;
            clearTimers();
            setOpen(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    useEffect(() => () => clearTimers(), []);

    const muted = onDark ? 'rgba(255,255,255,0.55)' : 'rgba(23,23,23,0.55)';
    const hover = onDark ? '#ffffff' : '#0a0a0a';

    const panelMaxH =
        panelPos && typeof window !== 'undefined'
            ? Math.min(420, Math.max(160, window.innerHeight - panelPos.top - 20))
            : 420;

    const megaMenu =
        mounted &&
        createPortal(
            <AnimatePresence>
                {open && panelPos && (
                    <motion.div
                        key="features-mega"
                        ref={panelRef}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        onMouseEnter={() => {
                            clearTimers();
                            setOpen(true);
                        }}
                        onMouseLeave={() => scheduleClose()}
                        style={{
                            position: 'fixed',
                            top: panelPos.top,
                            left: panelPos.left,
                            transform: 'translateX(-50%)',
                            width: 'min(calc(100vw - 48px), 560px)',
                            maxHeight: panelMaxH,
                            overflowY: 'auto',
                            background: 'rgba(255,255,255,0.98)',
                            border: '1px solid rgba(0,0,0,0.08)',
                            borderRadius: 18,
                            padding: '14px 14px 10px',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 12px 48px rgba(0,0,0,0.12), 0 4px 24px rgba(0,0,0,0.06)',
                            zIndex: 10000,
                        }}
                    >
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                                gap: '4px 20px',
                            }}
                            className="generate-mega-cols"
                        >
                            {GENERATE_GROUPS.map((group) => (
                                <div key={group.section} style={{ marginBottom: 8 }}>
                                    <div
                                        style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            letterSpacing: '0.12em',
                                            textTransform: 'uppercase',
                                            color: 'rgba(0,0,0,0.38)',
                                            padding: '8px 10px 6px',
                                        }}
                                    >
                                        {group.section}
                                    </div>
                                    {group.items.map((item) => (
                                        <Link key={item.label} href={item.href} style={{ textDecoration: 'none', display: 'block' }}>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    gap: 10,
                                                    padding: '8px 10px',
                                                    borderRadius: 10,
                                                    transition: 'background 0.15s',
                                                    cursor: 'pointer',
                                                }}
                                                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)')}
                                                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                                            >
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0a0a0a', marginBottom: 2, letterSpacing: '-0.01em' }}>{item.label}</div>
                                                    <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', lineHeight: 1.45 }}>{item.desc}</div>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>,
            document.body
        );

    return (
        <>
            <div ref={wrapRef} style={{ position: 'relative' }}>
            <button
                type="button"
                onMouseEnter={() => scheduleOpen()}
                onMouseLeave={() => scheduleClose()}
                onClick={() => {
                    clearTimers();
                    setOpen((v) => {
                        const next = !v;
                        if (next) measurePanelAnchor();
                        return next;
                    });
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    color: open ? hover : muted,
                    fontSize: 15,
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                    transition: 'color 0.15s',
                    fontFamily: 'inherit',
                }}
            >
                Features
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.45 }}>
                    <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
            </button>
            </div>
            {megaMenu}
        </>
    );
}

interface LandingNavProps {
    /** Extra left inset for fixed icon rail (e.g. Krea-style gutter). */
    leftGutterPx?: number;
}

export default function LandingNav({ leftGutterPx = 0 }: LandingNavProps) {
    const [scrolled, setScrolled] = useState(false);
    /** True while the dark hero is behind the nav (Krea-style). */
    const [onDarkHero, setOnDarkHero] = useState(true);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        const el = document.getElementById('krea-hero');
        if (!el) return;
        const ob = new IntersectionObserver(
            ([e]) => setOnDarkHero(e.isIntersecting),
            { threshold: 0, rootMargin: '-68px 0px 0px 0px' }
        );
        ob.observe(el);
        return () => ob.disconnect();
    }, []);

    const dark = onDarkHero;
    const muted = dark ? 'rgba(255,255,255,0.55)' : 'rgba(23,23,23,0.55)';
    const hover = dark ? '#ffffff' : '#0a0a0a';
    const barBg = dark
        ? scrolled
            ? 'rgba(0,0,0,0.82)'
            : 'transparent'
        : scrolled
          ? 'rgba(255,255,255,0.92)'
          : 'rgba(255,255,255,0.78)';
    const barBorder = dark
        ? scrolled
            ? '1px solid rgba(255,255,255,0.06)'
            : '1px solid transparent'
        : scrolled
          ? '1px solid rgba(0,0,0,0.06)'
          : '1px solid transparent';
    const blur = scrolled ? 'blur(20px)' : 'none';

    return (
        <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                height: 68,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `0 max(24px, 4vw) 0 calc(${leftGutterPx}px + max(24px, 4vw))`,
                background: barBg,
                backdropFilter: blur,
                WebkitBackdropFilter: blur,
                borderBottom: barBorder,
                transition: 'background 0.3s, border-color 0.3s',
            }}
        >
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }} aria-label="Lumina home">
                <div
                    style={{
                        width: dark ? 34 : 28,
                        height: dark ? 34 : 28,
                        borderRadius: dark ? 9 : 7,
                        background: dark ? 'transparent' : '#0a0a0a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <svg width={dark ? 16 : 13} height={dark ? 16 : 13} viewBox="0 0 15 15" fill="none" aria-hidden>
                        <path d="M7.5 1.5L13.5 13H1.5L7.5 1.5Z" fill="#ffffff" />
                    </svg>
                </div>
                <span
                    style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: dark ? '#fafafa' : '#0a0a0a',
                        letterSpacing: '-0.03em',
                    }}
                >
                    Lumina
                </span>
            </Link>

            <div className="hidden md:flex" style={{ alignItems: 'center', gap: 4, position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                <Link
                    href="/studio"
                    style={{
                        textDecoration: 'none',
                        color: muted,
                        fontSize: 15,
                        fontWeight: 500,
                        padding: '8px 11px',
                        transition: 'color 0.15s',
                        whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = hover)}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = muted)}
                >
                    App
                </Link>
                <div style={{ padding: '0 2px' }}>
                    <FeaturesDropdown onDark={dark} />
                </div>
                {FLAT_LINKS.map(({ label, href }) => (
                    <Link
                        key={label}
                        href={href}
                        style={{
                            textDecoration: 'none',
                            color: muted,
                            fontSize: 15,
                            fontWeight: 500,
                            padding: '8px 11px',
                            whiteSpace: 'nowrap',
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = hover)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = muted)}
                    >
                        {label}
                    </Link>
                ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: dark ? 18 : 12, flexShrink: 0 }}>
                <Link href="/register" style={{ textDecoration: 'none' }}>
                    <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            padding: '9px 20px',
                            borderRadius: 9999,
                            background: '#ffffff',
                            color: '#0a0a0a',
                            fontSize: 14,
                            fontWeight: 600,
                            border: dark ? 'none' : '1px solid #0a0a0a',
                            cursor: 'pointer',
                            letterSpacing: '-0.01em',
                            fontFamily: 'inherit',
                        }}
                    >
                        Sign up for free
                    </motion.button>
                </Link>
                {dark ? (
                    <Link
                        href="/login"
                        style={{
                            textDecoration: 'none',
                            fontSize: 15,
                            fontWeight: 500,
                            color: 'rgba(255,255,255,0.9)',
                            padding: '8px 6px',
                            transition: 'color 0.15s',
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.9)')}
                    >
                        Log in
                    </Link>
                ) : (
                    <Link href="/login" style={{ textDecoration: 'none' }} className="hidden sm:block">
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                                padding: '8px 18px',
                                borderRadius: 9999,
                                background: '#0a0a0a',
                                color: '#ffffff',
                                fontSize: 13,
                                fontWeight: 600,
                                border: 'none',
                                cursor: 'pointer',
                                letterSpacing: '-0.01em',
                                fontFamily: 'inherit',
                            }}
                        >
                            Log in
                        </motion.button>
                    </Link>
                )}
            </div>
            <style>{`
                @media (max-width: 640px) {
                    .generate-mega-cols { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </motion.nav>
    );
}
