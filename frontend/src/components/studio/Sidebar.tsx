'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    CreditCard,
    Settings,
    ChevronRight,
    Zap,
    User,
    LogOut,
    History,
    Shield,
    AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useUsageSummary } from '@/hooks/useUsageSummary';
import Cookies from 'js-cookie';
import { getUser, setAuth, getToken } from '@/lib/auth';
import { authAPI } from '@/lib/api';
import type { User as UserType } from '@/lib/auth';

const menuItems = [
    { id: 'generate', label: 'Generate', icon: Sparkles, path: '/studio' },
    { id: 'history', label: 'History', icon: History, path: '/studio/history' },
    { id: 'billing', label: 'Billing', icon: CreditCard, path: '/studio/billing' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/studio/settings' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const { data: usage, loading: usageLoading, error: usageError } = useUsageSummary();

    // Defer cookie read to client-only to prevent SSR/client hydration mismatch.
    // Also refresh from /auth/me so the balance reflects DB changes (e.g. credit grants).
    const [sessionUser, setSessionUser] = useState<UserType | null>(null);
    useEffect(() => {
        // Start with cookie for instant render
        setSessionUser(getUser());
        // Then fetch fresh data from the API and update both state and cookie
        const token = getToken();
        if (token) {
            authAPI.me()
                .then(res => {
                    const freshUser: UserType = res.data;
                    setSessionUser(freshUser);
                    // Refresh the cookie so the rest of the app sees updated balances
                    setAuth(token, freshUser);
                })
                .catch(() => { /* silently fall back to cookie data */ });
        }
    }, []);

    const creditBalance = sessionUser?.credit_balance ?? 0;
    const bonusBalance = sessionUser?.bonus_credit_balance ?? 0;
    const reservedBalance = sessionUser?.reserved_balance ?? 0;
    const availableCredits = Math.max(0, creditBalance + bonusBalance - reservedBalance);
    const isLowBalance = availableCredits < 100;
    const showAdminLink = sessionUser?.is_admin === true;

    const imgUsed = usage?.image_generations_this_month ?? 0;
    const imgCap = usage?.monthly_image_quota ?? (usageError && !usageLoading ? 8 : 0);
    const vidUsed = usage?.video_units_used_this_month ?? usage?.video_generations_this_month ?? 0;
    const vidCap = usage?.monthly_video_quota ?? (usageError && !usageLoading ? 2 : 0);
    const imgPct = useMemo(() => {
        if (!usage || imgCap <= 0) return imgUsed > 0 ? 100 : 0;
        return Math.min(100, (imgUsed / imgCap) * 100);
    }, [usage, imgUsed, imgCap]);
    const vidPct = useMemo(() => {
        if (!usage || vidCap <= 0) return vidUsed > 0 ? 100 : 0;
        return Math.min(100, (vidUsed / vidCap) * 100);
    }, [usage, vidUsed, vidCap]);
    const planLabel = usage?.plan_display_name || 'Free';

    const handleSignOut = () => {
        setIsLoggingOut(true);
        const t = toast.loading('Signing out...');
        Cookies.remove('token');
        Cookies.remove('user');
        setTimeout(() => {
            toast.dismiss(t);
            toast.success('Signed out successfully');
            router.push('/login');
        }, 800);
    };

    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    return (
        <aside
            className="studio-sidebar glow-container"
            onMouseMove={handleMouseMove}
            style={{
                '--mouse-x': `${mousePos.x}px`,
                '--mouse-y': `${mousePos.y}px`
            } as any}
        >
            <div className="glow-overlay" />
            {/* Logo */}
            <div style={{ padding: '24px 20px 20px' }}>
                <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }} className="group">
                    <motion.div
                        whileHover={{ scale: 1.05, rotate: 5 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            width: 32, height: 32, borderRadius: 10,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                        }}
                    >
                        <Zap size={16} color="#fff" fill="#fff" />
                    </motion.div>
                    <span style={{
                        fontFamily: 'var(--font-display, Montserrat), sans-serif',
                        fontWeight: 800, fontSize: 18,
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        letterSpacing: '-0.02em',
                    }}>
                        Lumina
                    </span>
                </Link>

                <div style={{
                    marginTop: 8, fontSize: 11, fontWeight: 500,
                    color: 'var(--text-muted)', letterSpacing: '0.05em',
                }}>
                    AI Creative Studio
                </div>
            </div>

            <div className="divider" style={{ margin: '0 16px' }} />

            {/* Navigation */}
            <nav style={{ padding: '12px 12px', flex: 1 }}>
                <div style={{ marginBottom: 4, padding: '0 8px 8px' }}>
                    <span className="text-label">Workspace</span>
                </div>
                {menuItems.map(({ icon: Icon, label, path: href }, index) => {
                    const isActive = pathname === href;
                    return (
                        <motion.div
                            key={href}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1, type: 'spring', stiffness: 200, damping: 20 }}
                        >
                            <Link href={href} style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
                                <motion.div
                                    className={`nav-item ${isActive ? 'active' : ''}`}
                                    whileHover={{ x: 6 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                    style={{ position: 'relative' }}
                                >
                                    <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                                    <span>{label}</span>
                                    {isActive && (
                                        <motion.div
                                            layoutId="active-pill"
                                            style={{
                                                position: 'absolute',
                                                left: 0, right: 0, top: 0, bottom: 0,
                                                background: 'var(--bg-accent-soft)',
                                                borderRadius: 12,
                                                zIndex: -1,
                                            }}
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    {isActive && (
                                        <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                                    )}
                                </motion.div>
                            </Link>
                        </motion.div>
                    );
                })}

                {showAdminLink && (
                    <>
                        <div style={{ marginTop: 16, marginBottom: 4, padding: '0 8px 8px' }}>
                            <span className="text-label">Administration</span>
                        </div>
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.35, type: 'spring', stiffness: 200, damping: 20 }}
                        >
                            <Link href="/admin" style={{ textDecoration: 'none', display: 'block', marginBottom: 2 }}>
                                <motion.div
                                    className={`nav-item ${pathname === '/admin' || pathname?.startsWith('/admin/') ? 'active' : ''}`}
                                    whileHover={{ x: 6 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                    style={{ position: 'relative' }}
                                >
                                    <Shield size={16} strokeWidth={pathname?.startsWith('/admin') ? 2.5 : 2} />
                                    <span>Admin console</span>
                                    {(pathname === '/admin' || pathname?.startsWith('/admin/')) && (
                                        <motion.div
                                            layoutId="active-pill"
                                            style={{
                                                position: 'absolute',
                                                left: 0, right: 0, top: 0, bottom: 0,
                                                background: 'var(--bg-accent-soft)',
                                                borderRadius: 12,
                                                zIndex: -1,
                                            }}
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    {(pathname === '/admin' || pathname?.startsWith('/admin/')) && (
                                        <ChevronRight size={14} style={{ marginLeft: 'auto', opacity: 0.5 }} />
                                    )}
                                </motion.div>
                            </Link>
                        </motion.div>
                    </>
                )}
            </nav>

            <div className="divider" style={{ margin: '0 16px' }} />

            {/* Credits */}
            <div style={{ padding: '12px 16px' }}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    className="card"
                    style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-muted)',
                        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.05)'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>MONTHLY USE</span>
                        <motion.span
                            animate={{
                                boxShadow: ['0 0 0px var(--accent-glow)', '0 0 10px var(--accent-glow)', '0 0 0px var(--accent-glow)']
                            }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            style={{
                                fontSize: 10, fontWeight: 700, color: 'var(--accent)',
                                background: 'var(--bg-accent-soft)', padding: '2px 10px', borderRadius: 99,
                                textTransform: 'uppercase'
                            }}
                        >{planLabel}</motion.span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>
                        Images <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{usage ? `${imgUsed}/${imgCap}` : '—'}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--progress-track)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${imgPct}%` }}
                            transition={{ duration: 0.85, ease: 'easeOut' }}
                            style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                borderRadius: 99,
                            }}
                        />
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 6 }}>
                        Video units <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>{usage ? `${vidUsed}/${vidCap}` : '—'}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--progress-track)', borderRadius: 99, overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${vidPct}%` }}
                            transition={{ duration: 0.85, ease: 'easeOut' }}
                            style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, #0ea5e9, #6366f1)',
                                borderRadius: 99,
                            }}
                        />
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 500, marginTop: 6 }}>
                        Resets monthly (UTC)
                    </div>
                </motion.div>

                {/* Token credit balance */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card"
                    style={{
                        marginTop: 10, padding: '10px 14px', borderRadius: 12,
                        border: isLowBalance ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border)',
                        background: isLowBalance ? 'rgba(239,68,68,0.06)' : 'var(--bg-muted)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                            CREDITS
                        </span>
                        <span style={{
                            fontSize: 13, fontWeight: 800,
                            color: isLowBalance ? '#ef4444' : 'var(--accent)',
                            display: 'flex', alignItems: 'center', gap: 3,
                        }}>
                            <Zap size={12} fill="currentColor" />
                            {availableCredits.toLocaleString()} credits
                        </span>
                    </div>
                    {reservedBalance > 0 && (
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>
                            {reservedBalance} reserved for active jobs
                        </div>
                    )}
                    {isLowBalance && (
                        <Link href="/studio/billing" style={{ textDecoration: 'none' }}>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                style={{
                                    marginTop: 8, padding: '6px 10px', borderRadius: 8,
                                    background: 'rgba(239,68,68,0.12)',
                                    border: '1px solid rgba(239,68,68,0.3)',
                                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                                }}
                            >
                                <AlertTriangle size={11} color="#ef4444" />
                                <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444' }}>
                                    Low balance — Top up
                                </span>
                            </motion.div>
                        </Link>
                    )}
                </motion.div>
            </div>

            {/* User profile */}
            <div style={{ padding: '8px 16px 20px' }}>
                <div style={{ position: 'relative' }}>
                    <motion.div
                        onClick={handleSignOut}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px', borderRadius: 12,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                        whileHover={{ background: 'var(--bg-subtle)' }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <div style={{
                            width: 36, height: 36, borderRadius: 99,
                            background: 'linear-gradient(135deg, #a78bfa, #6366f1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: '0 2px 8px rgba(99, 102, 241, 0.2)',
                        }}>
                            <User size={18} color="#fff" />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {sessionUser?.full_name || sessionUser?.username || 'User'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {sessionUser?.email || ''}
                            </div>
                        </div>
                        <LogOut size={14} style={{ color: 'var(--text-muted)', opacity: 0.8 }} />
                    </motion.div>
                </div>
            </div>
        </aside>
    );
}
