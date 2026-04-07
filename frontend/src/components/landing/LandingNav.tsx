'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

type NavTheme = 'light' | 'dark';

export default function LandingNav({ theme = 'dark' }: { theme?: NavTheme }) {
    const light = theme === 'light';
    const textMuted = light ? 'rgba(23,23,23,0.55)' : 'rgba(255,255,255,0.65)';
    const textHover = light ? '#171717' : '#fff';
    const signIn = light ? 'rgba(23,23,23,0.75)' : 'rgba(255,255,255,0.70)';
    const logoText = light ? '#171717' : '#fff';
    const barBg = light ? 'rgba(255,255,255,0.72)' : 'transparent';

    return (
        <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                height: 60,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 32px',
                background: barBg,
                backdropFilter: light ? 'blur(12px)' : 'none',
                borderBottom: light ? '1px solid rgba(0,0,0,0.06)' : 'none',
            }}
        >
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}>
                <div
                    style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M7.5 2L13 12.5H2L7.5 2Z" fill="#fff" strokeWidth="0" />
                    </svg>
                </div>
                <span
                    style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: logoText,
                        letterSpacing: '-0.02em',
                        fontFamily: 'inherit',
                    }}
                >
                    Lumina
                </span>
            </Link>

            <div className="hidden lg:flex" style={{ alignItems: 'center', gap: 28 }}>
                {[
                    { label: 'Product', href: '#' },
                    { label: 'Pricing', href: '/studio/billing' },
                    { label: 'Enterprise', href: '#' },
                    { label: 'News', href: '#' },
                    { label: 'Join us', href: '#' },
                ].map(({ label, href }) => (
                    <Link
                        key={label}
                        href={href}
                        style={{
                            textDecoration: 'none',
                            color: textMuted,
                            fontSize: 13,
                            fontWeight: 500,
                            letterSpacing: '0.01em',
                            transition: 'color 0.18s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = textHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.color = textMuted)}
                    >
                        {label}
                    </Link>
                ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <Link
                    href="/login"
                    style={{
                        textDecoration: 'none',
                        color: signIn,
                        fontSize: 13,
                        fontWeight: 600,
                        transition: 'color 0.18s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = textHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = signIn)}
                >
                    Sign In
                </Link>

                <Link href="/login" style={{ textDecoration: 'none' }}>
                    <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                            padding: '8px 20px',
                            borderRadius: 99,
                            background: light ? '#171717' : '#e8e8e8',
                            color: light ? '#fafafa' : '#0f1115',
                            fontSize: 12,
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            letterSpacing: '-0.01em',
                        }}
                    >
                        Try Lumina
                    </motion.button>
                </Link>
            </div>
        </motion.nav>
    );
}
