'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useLayoutEffect, useCallback, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { clearAuth, getToken } from '@/lib/auth';

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

function planLabelFromKey(plan: string | undefined): string {
    if (!plan) return 'Free';
    const p = plan.toLowerCase();
    return p.charAt(0).toUpperCase() + p.slice(1);
}

function LandingNavAccount({ dark }: { dark: boolean }) {
    const { user, isSessionPending, clearSession } = useAuth();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const showSkeleton = mounted && !!getToken() && isSessionPending && !user;
    const credits = user
        ? Math.max(
              0,
              (user.credit_balance ?? 0) + (user.bonus_credit_balance ?? 0) - (user.reserved_balance ?? 0)
          )
        : 0;
    const displayName = user?.full_name || user?.username || user?.email?.split('@')[0] || '';
    const planLbl = planLabelFromKey(user?.plan);

    const muted = dark ? 'rgba(255,255,255,0.55)' : 'rgba(23,23,23,0.55)';
    const fg = dark ? '#fafafa' : '#0a0a0a';

    if (!mounted || (!user && !getToken())) {
        return (
            <>
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
            </>
        );
    }

    if (showSkeleton) {
        return (
            <div
                aria-hidden
                style={{
                    width: 220,
                    height: 40,
                    borderRadius: 9999,
                    background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                }}
            />
        );
    }

    if (user) {
        return (
            <>
                <Link
                    href="/studio"
                    prefetch
                    style={{
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 14px',
                        borderRadius: 9999,
                        background: dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                        border: dark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(0,0,0,0.08)',
                        maxWidth: 'min(92vw, 340px)',
                    }}
                    title="Open studio"
                >
                    <span
                        style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: fg,
                            letterSpacing: '-0.02em',
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                        }}
                    >
                        {displayName}
                    </span>
                    <span style={{ color: muted, fontWeight: 500, fontSize: 13 }}>|</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: fg }}>{planLbl}</span>
                    <span style={{ color: muted, fontWeight: 500, fontSize: 13 }}>|</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: fg, whiteSpace: 'nowrap' }}>
                        {credits} ⚡
                    </span>
                </Link>
                <button
                    type="button"
                    onClick={() => {
                        clearAuth();
                        clearSession();
                        window.location.href = '/';
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                        color: muted,
                        padding: '8px 4px',
                        fontFamily: 'inherit',
                    }}
                >
                    Log out
                </button>
            </>
        );
    }

    return null;
}

const mobileLinkStyle: CSSProperties = {
    display: 'block',
    padding: '12px 14px',
    borderRadius: 12,
    textDecoration: 'none',
    color: 'rgba(250,250,250,0.92)',
    fontSize: 15,
    fontWeight: 500,
    transition: 'background 0.15s',
};

function MobileMenuAuthFooter({ onClose }: { onClose: () => void }) {
    const { user, clearSession } = useAuth();
    const credits = user
        ? Math.max(
              0,
              (user.credit_balance ?? 0) + (user.bonus_credit_balance ?? 0) - (user.reserved_balance ?? 0)
          )
        : 0;
    const displayName = user?.full_name || user?.username || user?.email?.split('@')[0] || '';
    const planLbl = planLabelFromKey(user?.plan);

    if (user) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                    style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'rgba(250,250,250,0.8)',
                        padding: '4px 14px 0',
                        lineHeight: 1.45,
                    }}
                >
                    {displayName} · {planLbl} · {credits} ⚡
                </div>
                <Link href="/studio" prefetch style={{ textDecoration: 'none' }} onClick={onClose}>
                    <span
                        style={{
                            display: 'block',
                            textAlign: 'center',
                            padding: '12px 16px',
                            borderRadius: 9999,
                            background: '#ffffff',
                            color: '#0a0a0a',
                            fontSize: 14,
                            fontWeight: 600,
                        }}
                    >
                        Open studio
                    </span>
                </Link>
                <button
                    type="button"
                    onClick={() => {
                        clearAuth();
                        clearSession();
                        onClose();
                        window.location.href = '/';
                    }}
                    style={{
                        ...mobileLinkStyle,
                        textAlign: 'center',
                        border: '1px solid rgba(255,255,255,0.2)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    Log out
                </button>
            </div>
        );
    }

    return (
        <>
            <Link href="/register" style={{ textDecoration: 'none' }} onClick={onClose}>
                <span
                    style={{
                        display: 'block',
                        textAlign: 'center',
                        padding: '12px 16px',
                        borderRadius: 9999,
                        background: '#ffffff',
                        color: '#0a0a0a',
                        fontSize: 14,
                        fontWeight: 600,
                    }}
                >
                    Sign up for free
                </span>
            </Link>
            <Link
                href="/login"
                style={{
                    ...mobileLinkStyle,
                    textAlign: 'center',
                    border: '1px solid rgba(255,255,255,0.2)',
                }}
                onClick={onClose}
            >
                Log in
            </Link>
        </>
    );
}

export default function LandingNav({ leftGutterPx = 0 }: LandingNavProps) {
    const [scrolled, setScrolled] = useState(false);
    /** True while the dark hero is behind the nav (Krea-style). */
    const [onDarkHero, setOnDarkHero] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [portalReady, setPortalReady] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 12);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    useEffect(() => {
        setPortalReady(true);
    }, []);

    useEffect(() => {
        if (!mobileOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [mobileOpen]);

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

    const mobileMenu =
        portalReady &&
        createPortal(
            <AnimatePresence>
                {mobileOpen ? (
                    <>
                        <motion.div
                            key="mobile-nav-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="md:hidden"
                            style={{
                                position: 'fixed',
                                inset: 0,
                                zIndex: 10002,
                                background: 'rgba(0,0,0,0.5)',
                            }}
                            onClick={() => setMobileOpen(false)}
                            aria-hidden={!mobileOpen}
                        />
                        <motion.aside
                            key="mobile-nav-panel"
                            role="dialog"
                            aria-modal="true"
                            aria-label="Site menu"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'tween', duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                            className="md:hidden"
                            style={{
                                position: 'fixed',
                                top: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 10003,
                                width: 'min(360px, 92vw)',
                                background: '#0a0a0a',
                                color: '#fafafa',
                                padding: '20px 18px 28px',
                                boxShadow: '-12px 0 48px rgba(0,0,0,0.45)',
                                overflowY: 'auto',
                                borderLeft: '1px solid rgba(255,255,255,0.08)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 20,
                                    paddingBottom: 16,
                                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                                }}
                            >
                                <span style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em' }}>Menu</span>
                                <button
                                    type="button"
                                    aria-label="Close menu"
                                    onClick={() => setMobileOpen(false)}
                                    style={{
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: 10,
                                        padding: 8,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        color: '#fff',
                                    }}
                                >
                                    <X size={20} strokeWidth={2} />
                                </button>
                            </div>
                            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Link href="/studio" style={mobileLinkStyle} onClick={() => setMobileOpen(false)}>
                                    App
                                </Link>
                                <div
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        letterSpacing: '0.14em',
                                        textTransform: 'uppercase',
                                        color: 'rgba(255,255,255,0.38)',
                                        padding: '16px 14px 8px',
                                    }}
                                >
                                    Features
                                </div>
                                {GENERATE_GROUPS.flatMap((group) =>
                                    group.items.map((item) => (
                                        <Link
                                            key={`${group.section}-${item.label}`}
                                            href={item.href}
                                            style={{ ...mobileLinkStyle, fontSize: 14, padding: '10px 14px 10px 18px' }}
                                            onClick={() => setMobileOpen(false)}
                                        >
                                            {item.label}
                                        </Link>
                                    ))
                                )}
                                <div
                                    style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        letterSpacing: '0.14em',
                                        textTransform: 'uppercase',
                                        color: 'rgba(255,255,255,0.38)',
                                        padding: '16px 14px 8px',
                                    }}
                                >
                                    More
                                </div>
                                {FLAT_LINKS.map(({ label, href }) => (
                                    <Link
                                        key={label}
                                        href={href}
                                        style={{ ...mobileLinkStyle, fontSize: 14 }}
                                        onClick={() => setMobileOpen(false)}
                                    >
                                        {label}
                                    </Link>
                                ))}
                                <div
                                    style={{
                                        marginTop: 20,
                                        paddingTop: 20,
                                        borderTop: '1px solid rgba(255,255,255,0.08)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 10,
                                    }}
                                >
                                    <MobileMenuAuthFooter onClose={() => setMobileOpen(false)} />
                                </div>
                            </nav>
                        </motion.aside>
                    </>
                ) : null}
            </AnimatePresence>,
            document.body
        );

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
                    prefetch
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
                <button
                    type="button"
                    className="md:hidden"
                    aria-label="Open menu"
                    aria-expanded={mobileOpen}
                    onClick={() => setMobileOpen(true)}
                    style={{
                        marginRight: 2,
                        background: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        border: dark ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.12)',
                        borderRadius: 10,
                        padding: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Menu size={20} color={dark ? '#ffffff' : '#0a0a0a'} strokeWidth={2} />
                </button>
                <div className="hidden md:flex" style={{ alignItems: 'center', gap: dark ? 14 : 10 }}>
                    <LandingNavAccount dark={dark} />
                </div>
            </div>
            <style>{`
                @media (max-width: 640px) {
                    .generate-mega-cols { grid-template-columns: 1fr !important; }
                }
            `}</style>
            {mobileMenu}
        </motion.nav>
    );
}
