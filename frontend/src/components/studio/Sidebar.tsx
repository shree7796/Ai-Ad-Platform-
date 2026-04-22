'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Shield,
    User,
    Plus,
    Sparkles,
    ShoppingBag,
    BarChart3,
    LogOut,
    ChevronDown,
    ChevronUp,
    Settings,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useUsageSummary } from '@/hooks/useUsageSummary';
import Cookies from 'js-cookie';
import { getUser, setAuth, getToken } from '@/lib/auth';
import { authAPI } from '@/lib/api';
import type { User as UserType } from '@/lib/auth';
import { STUDIO_MODE_ITEMS, type StudioTab } from '@/lib/studioTabs';

/** Floating menu: bottom-left of panel meets top-right of trigger (Krea-style). */
const WORKSPACE_POPOVER_WIDTH = 292;
const WORKSPACE_POPOVER_GAP = 8;
const WORKSPACE_POPOVER_OFFSET_X = 6;
const WORKSPACE_OPEN_DELAY_MS = 50;
const WORKSPACE_CLOSE_DELAY_MS = 300;

/** Krea-style rounded color tile behind sidebar icons. */
function SidebarIconTile({ bg, children }: { bg: string; children: ReactNode }) {
    const light = bg.toLowerCase() === '#ffffff' || bg.toLowerCase() === '#fff';
    return (
        <span
            aria-hidden
            style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                background: bg,
                color: light ? '#0a0a0a' : '#ffffff',
                boxShadow: light ? 'inset 0 0 0 1px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.4)',
            }}
        >
            {children}
        </span>
    );
}

/** Circular progress (Krea-style credits ring). */
function CreditRing({ fraction, size = 44 }: { fraction: number; size?: number }) {
    const stroke = 3;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(1, fraction));
    const offset = c * (1 - pct);
    const cx = size / 2;
    return (
        <svg width={size} height={size} style={{ flexShrink: 0 }} aria-hidden>
            <g transform={`rotate(-90 ${cx} ${cx})`}>
                <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
                <circle
                    cx={cx}
                    cy={cx}
                    r={r}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={stroke}
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </g>
        </svg>
    );
}

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeTab = (searchParams.get('tab') as StudioTab | null) || 'text-to-image';
    const validTab =
        activeTab === 'text-to-image' ||
        activeTab === 'image-to-image' ||
        activeTab === 'image-to-video' ||
        activeTab === 'text-to-video'
            ? activeTab
            : 'text-to-image';

    const { data: usage } = useUsageSummary();
    const [sessionUser, setSessionUser] = useState<UserType | null>(null);
    const [workspaceOpen, setWorkspaceOpen] = useState(false);
    const [popoverPos, setPopoverPos] = useState<{ left: number; bottom: number } | null>(null);
    const workspaceRef = useRef<HTMLDivElement>(null);
    const accountTriggerRef = useRef<HTMLButtonElement>(null);
    const workspacePopoverRef = useRef<HTMLDivElement>(null);
    const workspaceOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const workspaceCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearWorkspaceTimers = useCallback(() => {
        if (workspaceOpenTimerRef.current) {
            clearTimeout(workspaceOpenTimerRef.current);
            workspaceOpenTimerRef.current = null;
        }
        if (workspaceCloseTimerRef.current) {
            clearTimeout(workspaceCloseTimerRef.current);
            workspaceCloseTimerRef.current = null;
        }
    }, []);

    const scheduleWorkspaceOpen = useCallback(() => {
        if (workspaceCloseTimerRef.current) {
            clearTimeout(workspaceCloseTimerRef.current);
            workspaceCloseTimerRef.current = null;
        }
        if (workspaceOpenTimerRef.current) {
            clearTimeout(workspaceOpenTimerRef.current);
            workspaceOpenTimerRef.current = null;
        }
        workspaceOpenTimerRef.current = setTimeout(() => {
            workspaceOpenTimerRef.current = null;
            setWorkspaceOpen(true);
        }, WORKSPACE_OPEN_DELAY_MS);
    }, []);

    const scheduleWorkspaceClose = useCallback(() => {
        if (workspaceOpenTimerRef.current) {
            clearTimeout(workspaceOpenTimerRef.current);
            workspaceOpenTimerRef.current = null;
        }
        if (workspaceCloseTimerRef.current) {
            clearTimeout(workspaceCloseTimerRef.current);
            workspaceCloseTimerRef.current = null;
        }
        workspaceCloseTimerRef.current = setTimeout(() => {
            workspaceCloseTimerRef.current = null;
            setWorkspaceOpen(false);
        }, WORKSPACE_CLOSE_DELAY_MS);
    }, []);

    const updateWorkspacePopoverPosition = useCallback(() => {
        if (!workspaceOpen || !accountTriggerRef.current) return;
        const r = accountTriggerRef.current.getBoundingClientRect();
        const pad = 10;
        let left = r.right + WORKSPACE_POPOVER_OFFSET_X;
        if (left + WORKSPACE_POPOVER_WIDTH > window.innerWidth - pad) {
            left = Math.max(pad, window.innerWidth - WORKSPACE_POPOVER_WIDTH - pad);
        }
        const bottom = window.innerHeight - r.top + WORKSPACE_POPOVER_GAP;
        setPopoverPos({ left, bottom });
    }, [workspaceOpen]);

    useLayoutEffect(() => {
        if (!workspaceOpen) {
            setPopoverPos(null);
            return;
        }
        updateWorkspacePopoverPosition();
        const onReposition = () => updateWorkspacePopoverPosition();
        window.addEventListener('resize', onReposition);
        document.addEventListener('scroll', onReposition, true);
        return () => {
            window.removeEventListener('resize', onReposition);
            document.removeEventListener('scroll', onReposition, true);
        };
    }, [workspaceOpen, updateWorkspacePopoverPosition]);

    useEffect(() => {
        setSessionUser(getUser());
        const token = getToken();
        if (token) {
            authAPI
                .me()
                .then((res) => {
                    const freshUser: UserType = res.data;
                    setSessionUser(freshUser);
                    setAuth(token, freshUser);
                })
                .catch(() => {});
        }
    }, []);

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            const t = e.target as Node;
            if (workspaceRef.current?.contains(t)) return;
            if (workspacePopoverRef.current?.contains(t)) return;
            clearWorkspaceTimers();
            setWorkspaceOpen(false);
        }
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [clearWorkspaceTimers]);

    useEffect(() => () => clearWorkspaceTimers(), [clearWorkspaceTimers]);

    const creditBalance = sessionUser?.credit_balance ?? 0;
    const bonusBalance = sessionUser?.bonus_credit_balance ?? 0;
    const reservedBalance = sessionUser?.reserved_balance ?? 0;
    const availableCredits = Math.max(0, creditBalance + bonusBalance - reservedBalance);
    const showAdminLink = sessionUser?.is_admin === true;
    const planLabel = usage?.plan_display_name || 'Free';

    const displayName = sessionUser?.full_name || sessionUser?.username || 'Account';
    const usernameShort =
        sessionUser?.username ||
        sessionUser?.email?.split('@')[0] ||
        displayName;

    const handleSignOut = useCallback(() => {
        const t = toast.loading('Signing out...');
        Cookies.remove('token');
        Cookies.remove('user');
        setWorkspaceOpen(false);
        setTimeout(() => {
            toast.dismiss(t);
            toast.success('Signed out successfully');
            router.push('/login');
        }, 600);
    }, [router]);

    const toolHref = (id: StudioTab) => `/studio?tab=${id}`;

    /** Ring fill: comfortable target scales by plan (visual only). */
    const ringTarget = usage?.subscription_active ? 3200 : 120;
    const ringFraction = Math.min(1, availableCredits / Math.max(ringTarget, 1));

    const periodHint = usage?.period_end
        ? `Resets ${new Date(usage.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        : null;

    const menuRowStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '10px 12px',
        borderRadius: 10,
        border: 'none',
        background: 'transparent',
        color: '#e5e5e5',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
        textDecoration: 'none',
        boxSizing: 'border-box',
    };

    return (
        <aside
            className="studio-sidebar"
            style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}
        >
            <div style={{ padding: '2px 10px 14px', flexShrink: 0 }}>
                <Link
                    href="/"
                        style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#ffffff',
                        letterSpacing: '-0.03em',
                        textDecoration: 'none',
                    }}
                >
                    Lumina
                </Link>
                <div
                    style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.38)',
                        marginTop: 6,
                    }}
                >
                    Tools &amp; sessions
                </div>
            </div>

            {showAdminLink && (
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0, marginBottom: 8 }}>
                    <Link
                        href="/admin"
                        className={`studio-sidebar-nav-link ${pathname?.startsWith('/admin') ? 'active' : ''}`}
                    >
                        <SidebarIconTile bg="#64748b">
                            <Shield size={15} strokeWidth={pathname?.startsWith('/admin') ? 2.2 : 1.85} />
                        </SidebarIconTile>
                        Admin
                    </Link>
                </nav>
            )}

            <div className="studio-side-section-label">TOOLS</div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                {STUDIO_MODE_ITEMS.map(({ id, label, icon: Icon, sidebarTileBg }) => {
                    const isActive = pathname === '/studio' && validTab === id;
                    return (
                        <Link key={id} href={toolHref(id)} className={`studio-sidebar-nav-link ${isActive ? 'active' : ''}`}>
                            <SidebarIconTile bg={sidebarTileBg}>
                                <Icon size={15} strokeWidth={isActive ? 2.2 : 1.85} />
                            </SidebarIconTile>
                            {label}
                            </Link>
                    );
                })}
            </nav>

            <div className="studio-side-section-label">SESSIONS</div>
            <button
                type="button"
                className="studio-sidebar-nav-link"
                style={{ marginBottom: 8 }}
                onClick={() => {
                    router.push('/studio');
                    router.refresh();
                }}
            >
                <SidebarIconTile bg="#22c55e">
                    <Plus size={15} strokeWidth={2.2} />
                </SidebarIconTile>
                New Session
            </button>

            <div style={{ flex: 1, minHeight: 16 }} aria-hidden />

            {/* Account row + floating workspace menu (portal — opens above & to the right of the rail) */}
            <div
                ref={workspaceRef}
                style={{ position: 'relative', flexShrink: 0, paddingTop: 4 }}
                onMouseEnter={() => {
                    if (workspaceCloseTimerRef.current) {
                        clearTimeout(workspaceCloseTimerRef.current);
                        workspaceCloseTimerRef.current = null;
                    }
                    scheduleWorkspaceOpen();
                }}
                onMouseLeave={() => {
                    if (workspaceOpenTimerRef.current) {
                        clearTimeout(workspaceOpenTimerRef.current);
                        workspaceOpenTimerRef.current = null;
                    }
                    scheduleWorkspaceClose();
                }}
            >
                {typeof document !== 'undefined' &&
                    createPortal(
                        <AnimatePresence>
                            {workspaceOpen && popoverPos && (
                    <motion.div
                                    ref={workspacePopoverRef}
                                    onMouseEnter={() => {
                                        if (workspaceCloseTimerRef.current) {
                                            clearTimeout(workspaceCloseTimerRef.current);
                                            workspaceCloseTimerRef.current = null;
                                        }
                                    }}
                                    onMouseLeave={() => scheduleWorkspaceClose()}
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                                    style={{
                                        position: 'fixed',
                                        left: popoverPos.left,
                                        bottom: popoverPos.bottom,
                                        width: WORKSPACE_POPOVER_WIDTH,
                                        padding: 0,
                                        borderRadius: 14,
                                        background: '#141414',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 16px 48px rgba(0,0,0,0.65)',
                                        zIndex: 9999,
                                        maxHeight: 'min(78vh, 520px)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        overflow: 'hidden',
                                        transformOrigin: 'bottom left',
                                    }}
                                >
                            <div
                                style={{
                                    flex: 1,
                                    minHeight: 0,
                                    overflowY: 'auto',
                                    padding: 14,
                                    paddingBottom: 10,
                                }}
                            >
                            <div
                                style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: '0.12em',
                                    color: 'rgba(255,255,255,0.38)',
                                    textTransform: 'uppercase',
                                    marginBottom: 10,
                                }}
                            >
                                Workspaces
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    padding: '10px 12px',
                                    borderRadius: 10,
                                    background: 'rgba(255,255,255,0.05)',
                                    marginBottom: 8,
                                }}
                            >
                                <div
                                    style={{
                                        width: 28,
                                        height: 28,
                                        borderRadius: 8,
                                        background: 'rgba(10,132,255,0.2)',
                                        color: '#409cff',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 13,
                                        fontWeight: 800,
                                        flexShrink: 0,
                                    }}
                                >
                                    D
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fafafa' }}>Default workspace</div>
                                    <div style={{ fontSize: 11, color: '#737373', marginTop: 2 }}>{planLabel}</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => toast('Workspaces coming soon')}
                                style={{
                                    ...menuRowStyle,
                                    color: '#a3a3a3',
                                    marginBottom: 14,
                                    padding: '8px 12px',
                                }}
                            >
                                <Plus size={16} strokeWidth={2} />
                                Add workspace
                            </button>

                            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px 0 14px' }} />

                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                                <CreditRing fraction={ringFraction} size={48} />
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 15, fontWeight: 700, color: '#fafafa', letterSpacing: '-0.02em' }}>
                                        {availableCredits.toLocaleString()} credits remaining
                                    </div>
                                    <div style={{ fontSize: 12, color: '#737373', marginTop: 4, lineHeight: 1.45 }}>
                                        {reservedBalance > 0 && (
                                            <span>
                                                {reservedBalance} reserved ·{' '}
                                            </span>
                                        )}
                                        {periodHint || `${planLabel} plan`}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Link
                                    href="/studio/billing"
                                    onClick={() => setWorkspaceOpen(false)}
                                    style={menuRowStyle}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                    }}
                                >
                                    <Sparkles size={16} strokeWidth={1.8} style={{ color: '#eab308' }} />
                                    Upgrade plan
                                </Link>
                                <Link
                                    href="/studio/billing"
                                    onClick={() => setWorkspaceOpen(false)}
                                    style={menuRowStyle}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                    }}
                                >
                                    <ShoppingBag size={16} strokeWidth={1.8} style={{ color: '#a3a3a3' }} />
                                    Buy credits
                                </Link>
                                <Link
                                    href="/studio/settings"
                                    onClick={() => setWorkspaceOpen(false)}
                                    style={menuRowStyle}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                    }}
                                >
                                    <Settings size={16} strokeWidth={1.8} style={{ color: '#a3a3a3' }} />
                                    Settings
                                </Link>
                                <Link
                                    href="/studio/history"
                                    onClick={() => setWorkspaceOpen(false)}
                                    style={menuRowStyle}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                    }}
                                >
                                    <BarChart3 size={16} strokeWidth={1.8} style={{ color: '#a3a3a3' }} />
                                    Usage &amp; history
                                </Link>
                            </div>
                            </div>
                            <div
                                style={{
                                    flexShrink: 0,
                                    padding: '10px 14px 14px',
                                    borderTop: '1px solid rgba(255,255,255,0.1)',
                                    background: '#141414',
                                }}
                            >
                                <button
                                    type="button"
                                    onClick={handleSignOut}
                                    style={{
                                        ...menuRowStyle,
                                        marginTop: 0,
                                        color: '#fca5a5',
                                    }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.12)';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                                    }}
                                >
                                    <LogOut size={16} strokeWidth={1.8} />
                                    Log out
                                </button>
                            </div>
                                </motion.div>
                            )}
                        </AnimatePresence>,
                        document.body
                    )}

                <button
                    ref={accountTriggerRef}
                    type="button"
                    onClick={() => {
                        clearWorkspaceTimers();
                        setWorkspaceOpen((v) => !v);
                    }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        width: '100%',
                        padding: '12px 10px',
                        marginTop: 4,
                        borderRadius: 12,
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: workspaceOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                        transition: 'background 0.15s, border-color 0.15s',
                    }}
                    aria-expanded={workspaceOpen}
                    aria-haspopup="true"
                >
                    <div
                        style={{
                            width: 34,
                            height: 34,
                            borderRadius: 999,
                            background: '#2a2a2a',
                            color: '#e5e5e5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 700,
                            flexShrink: 0,
                        }}
                    >
                        {sessionUser?.full_name?.[0]?.toUpperCase() ||
                            sessionUser?.username?.[0]?.toUpperCase() || <User size={16} />}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                            style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#fafafa',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {usernameShort}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                            <span
                                style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    color: '#a3a3a3',
                                    background: 'rgba(255,255,255,0.06)',
                                    padding: '2px 8px',
                                    borderRadius: 99,
                                }}
                            >
                                {planLabel}
                            </span>
                            <span style={{ fontSize: 11, color: '#525252' }}>·</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#22c55e' }}>
                                {availableCredits.toLocaleString()} ⚡
                    </span>
                        </div>
                    </div>
                    {workspaceOpen ? (
                        <ChevronUp size={18} color="#737373" style={{ flexShrink: 0 }} />
                    ) : (
                        <ChevronDown size={18} color="#737373" style={{ flexShrink: 0 }} />
                    )}
                </button>
            </div>
        </aside>
    );
}
