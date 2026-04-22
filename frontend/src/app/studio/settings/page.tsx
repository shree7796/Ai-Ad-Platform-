'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Sidebar from '@/components/studio/Sidebar';
import StudioIconRail from '@/components/studio/StudioIconRail';
import {
    User,
    Bell,
    Lock,
    Eye,
    CreditCard,
    Shield,
    Save,
    Camera,
    Trash2,
    Loader2,
    Zap,
    ArrowRight,
    AtSign,
    Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI, formatApiError } from '@/lib/api';
import { getUser, setAuth, getToken, type User as UserType } from '@/lib/auth';

function userInitials(u: UserType | null): string {
    if (!u) return '?';
    const n = u.full_name?.trim();
    if (n) {
        const parts = n.split(/\s+/).filter(Boolean);
        if (parts.length >= 2) {
            return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
        }
        return n.slice(0, 2).toUpperCase();
    }
    const fallback = u.username || u.email || '?';
    return fallback.slice(0, 2).toUpperCase();
}

function planLabel(plan: string): string {
    if (!plan) return 'Free';
    return plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
}

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('profile');
    const [user, setUser] = useState<UserType | null>(null);
    const [loading, setLoading] = useState(true);
    const [fullName, setFullName] = useState('');
    const [saving, setSaving] = useState(false);

    const refreshProfile = useCallback(async () => {
        try {
            const res = await authAPI.me();
            const u = res.data;
            setUser(u);
            setFullName(u.full_name ?? '');
            const token = getToken();
            if (token) setAuth(token, u);
        } catch (err) {
            toast.error(formatApiError(err, 'Could not load your profile.'));
            const cached = getUser();
            if (cached) {
                setUser(cached);
                setFullName(cached.full_name ?? '');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshProfile();
    }, [refreshProfile]);

    const handleSaveProfile = async () => {
        if (!getToken()) {
            toast.error('You are not signed in.');
            return;
        }
        setSaving(true);
        try {
            const res = await authAPI.updateMe({
                full_name: fullName.trim() === '' ? null : fullName.trim(),
            });
            setUser(res.data);
            const token = getToken();
            if (token) setAuth(token, res.data);
            toast.success('Profile updated');
        } catch (err) {
            toast.error(formatApiError(err, 'Could not save profile.'));
        } finally {
            setSaving(false);
        }
    };

    const sections = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'appearance', label: 'Appearance', icon: Eye },
        { id: 'billing', label: 'Plan & Billing', icon: CreditCard },
    ] as const;

    const displayName = user?.full_name?.trim() || user?.username || 'Your account';
    const wallet =
        (user?.credit_balance ?? 0) +
        (user?.bonus_credit_balance ?? 0) -
        (user?.reserved_balance ?? 0);

    return (
        <div className="studio-layout studio-layout--triple">
            <StudioIconRail />
            <Sidebar />
            <main className="studio-main studio-main--document" style={{ paddingBottom: 48 }}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginBottom: 28 }}
                >
                    <h1
                        style={{
                            fontSize: 22,
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.03em',
                            marginBottom: 6,
                        }}
                    >
                        Account
                    </h1>
                    <p
                        style={{
                            fontSize: 14,
                            color: 'var(--text-secondary)',
                            margin: 0,
                            fontWeight: 500,
                            lineHeight: 1.5,
                            maxWidth: 520,
                        }}
                    >
                        Your profile, plan, and preferences. Changes to your name sync everywhere you’re signed in.
                    </p>
                </motion.div>

                <div className="studio-settings-grid">
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, position: 'sticky', top: 24 }}>
                        {sections.map((s) => {
                            const isActive = activeSection === s.id;
                            return (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setActiveSection(s.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        padding: '11px 14px',
                                        borderRadius: 10,
                                        border: 'none',
                                        background: isActive ? 'var(--bg-muted)' : 'transparent',
                                        color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                                        fontSize: 14,
                                        fontWeight: isActive ? 600 : 500,
                                        cursor: 'pointer',
                                        transition: 'background 0.15s, color 0.15s',
                                        textAlign: 'left',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    <s.icon size={18} style={{ opacity: isActive ? 1 : 0.65 }} />
                                    {s.label}
                                </button>
                            );
                        })}
                        <div style={{ height: 1, background: 'var(--border)', margin: '14px 0' }} />
                        <button
                            type="button"
                            onClick={() =>
                                toast('Account deletion isn’t available in the app yet. Contact support if you need to close your account.', {
                                    icon: 'ℹ️',
                                })
                            }
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '11px 14px',
                                borderRadius: 10,
                                border: 'none',
                                background: 'transparent',
                                color: '#f87171',
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontFamily: 'inherit',
                            }}
                        >
                            <Trash2 size={18} />
                            Delete account
                        </button>
                    </nav>

                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                        className="card"
                        style={{
                            padding: 0,
                            overflow: 'hidden',
                            border: '1px solid var(--border)',
                            borderRadius: 16,
                            background: 'var(--bg-card)',
                        }}
                    >
                        {loading ? (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 12,
                                    padding: 64,
                                    color: 'var(--text-muted)',
                                    fontSize: 14,
                                }}
                            >
                                <Loader2 size={22} className="animate-spin" style={{ opacity: 0.8 }} />
                                Loading your account…
                            </div>
                        ) : activeSection === 'profile' ? (
                            <div>
                                {/* Identity summary */}
                                <div
                                    style={{
                                        padding: '24px 28px',
                                        borderBottom: '1px solid var(--border)',
                                        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                                        <div style={{ position: 'relative' }}>
                                            <div
                                                style={{
                                                    width: 72,
                                                    height: 72,
                                                    borderRadius: 99,
                                                    background: 'var(--bg-muted)',
                                                    border: '2px solid var(--border-medium)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 22,
                                                    fontWeight: 700,
                                                    color: 'var(--text-primary)',
                                                }}
                                            >
                                                {userInitials(user)}
                                            </div>
                                            <button
                                                type="button"
                                                title="Avatars coming soon"
                                                onClick={() => toast('Custom avatars are coming soon.')}
                                                style={{
                                                    position: 'absolute',
                                                    bottom: 0,
                                                    right: 0,
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: 99,
                                                    background: 'var(--accent)',
                                                    border: '2px solid var(--bg-card)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#fff',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Camera size={14} />
                                            </button>
                                        </div>
                                        <div style={{ flex: 1, minWidth: 200 }}>
                                            <div
                                                style={{
                                                    fontSize: 18,
                                                    fontWeight: 700,
                                                    color: 'var(--text-primary)',
                                                    marginBottom: 4,
                                                    letterSpacing: '-0.02em',
                                                }}
                                            >
                                                {displayName}
                                            </div>
                                            <div
                                                style={{
                                                    display: 'flex',
                                                    flexWrap: 'wrap',
                                                    gap: '8px 14px',
                                                    fontSize: 13,
                                                    color: 'var(--text-muted)',
                                                }}
                                            >
                                                {user?.username && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                        <AtSign size={14} />
                                                        {user.username}
                                                    </span>
                                                )}
                                                {user?.created_at && (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                                                        <Calendar size={14} />
                                                        Joined{' '}
                                                        {new Date(user.created_at).toLocaleDateString(undefined, {
                                                            month: 'short',
                                                            year: 'numeric',
                                                        })}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 700,
                                                        letterSpacing: '0.04em',
                                                        textTransform: 'uppercase',
                                                        padding: '4px 10px',
                                                        borderRadius: 99,
                                                        background: 'rgba(10,132,255,0.15)',
                                                        color: '#7cc4ff',
                                                        border: '1px solid rgba(10,132,255,0.35)',
                                                    }}
                                                >
                                                    {planLabel(user?.plan ?? 'free')}
                                                </span>
                                                <span
                                                    style={{
                                                        fontSize: 11,
                                                        fontWeight: 600,
                                                        padding: '4px 10px',
                                                        borderRadius: 99,
                                                        background: 'var(--bg-subtle)',
                                                        color: 'var(--text-secondary)',
                                                        border: '1px solid var(--border)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: 5,
                                                    }}
                                                >
                                                    <Zap size={12} />
                                                    ~{Math.max(0, wallet)} credits
                                                </span>
                                                {user?.is_admin && (
                                                    <span
                                                        style={{
                                                            fontSize: 11,
                                                            fontWeight: 700,
                                                            padding: '4px 10px',
                                                            borderRadius: 99,
                                                            background: 'rgba(245,158,11,0.12)',
                                                            color: '#fbbf24',
                                                            border: '1px solid rgba(245,158,11,0.3)',
                                                        }}
                                                    >
                                                        Admin
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                                    <div>
                                        <label
                                            className="section-label"
                                            style={{ display: 'block', marginBottom: 8 }}
                                        >
                                            Full name
                                        </label>
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Your name"
                                            autoComplete="name"
                                            className="studio-input"
                                            style={{ borderRadius: 12 }}
                                        />
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
                                            Shown in the studio sidebar and receipts. You can leave this blank.
                                        </p>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                        <div>
                                            <label
                                                className="section-label"
                                                style={{ display: 'block', marginBottom: 8 }}
                                            >
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={user?.email ?? ''}
                                                readOnly
                                                className="studio-input"
                                                style={{
                                                    borderRadius: 12,
                                                    opacity: 0.85,
                                                    cursor: 'not-allowed',
                                                    background: 'var(--bg-subtle)',
                                                }}
                                            />
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
                                                Email sign-in. To change it, contact support.
                                            </p>
                                        </div>
                                        <div>
                                            <label
                                                className="section-label"
                                                style={{ display: 'block', marginBottom: 8 }}
                                            >
                                                Username
                                            </label>
                                            <input
                                                type="text"
                                                value={user?.username ?? ''}
                                                readOnly
                                                className="studio-input"
                                                style={{
                                                    borderRadius: 12,
                                                    opacity: 0.85,
                                                    cursor: 'not-allowed',
                                                    background: 'var(--bg-subtle)',
                                                }}
                                            />
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, marginBottom: 0 }}>
                                                Unique handle. Username changes are not supported yet.
                                            </p>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
                                        <motion.button
                                            type="button"
                                            whileTap={{ scale: 0.98 }}
                                            disabled={saving}
                                            onClick={handleSaveProfile}
                                            className="btn-primary"
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '12px 22px',
                                                borderRadius: 12,
                                                opacity: saving ? 0.7 : 1,
                                                cursor: saving ? 'wait' : 'pointer',
                                            }}
                                        >
                                            {saving ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <Save size={18} />
                                            )}
                                            Save changes
                                        </motion.button>
                                    </div>
                                </div>
                            </div>
                        ) : activeSection === 'billing' ? (
                            <div style={{ padding: '32px 28px' }}>
                                <h2
                                    style={{
                                        fontSize: 17,
                                        fontWeight: 700,
                                        color: 'var(--text-primary)',
                                        marginBottom: 8,
                                    }}
                                >
                                    Plan & billing
                                </h2>
                                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24 }}>
                                    Upgrade your plan, buy credits, and see invoices on the billing page.
                                </p>
                                <Link
                                    href="/studio/billing"
                                    className="btn-primary"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        padding: '12px 20px',
                                        borderRadius: 12,
                                        textDecoration: 'none',
                                        fontWeight: 600,
                                        fontSize: 14,
                                    }}
                                >
                                    Open billing
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '48px 28px' }}>
                                <div
                                    style={{
                                        width: 56,
                                        height: 56,
                                        borderRadius: 99,
                                        background: 'var(--bg-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 18px',
                                    }}
                                >
                                    <Shield size={26} color="var(--text-muted)" />
                                </div>
                                <h3
                                    style={{
                                        fontSize: 16,
                                        fontWeight: 700,
                                        color: 'var(--text-primary)',
                                        marginBottom: 8,
                                    }}
                                >
                                    Coming soon
                                </h3>
                                <p
                                    style={{
                                        fontSize: 14,
                                        color: 'var(--text-muted)',
                                        maxWidth: 320,
                                        margin: '0 auto',
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {activeSection === 'notifications' &&
                                        'Email and in-app notifications will land here.'}
                                    {activeSection === 'security' &&
                                        'Password change and two-factor authentication will be available here.'}
                                    {activeSection === 'appearance' &&
                                        'Theme and density options for the studio will be available here.'}
                                </p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
