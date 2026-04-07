'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sparkles,
    Clock,
    CreditCard,
    Settings,
    ChevronRight,
    Zap,
    User,
    LogOut,
    History,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

    const handleSignOut = () => {
        setIsLoggingOut(true);
        const t = toast.loading('Signing out...');
        setTimeout(() => {
            toast.dismiss(t);
            toast.success('Signed out successfully');
            router.push('/login');
        }, 1200);
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
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>CREDITS</span>
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
                        >Pro</motion.span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>240</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}> / 500</span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.03)', borderRadius: 99, overflow: 'hidden' }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '48%' }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            style={{
                                height: '100%',
                                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                                borderRadius: 99,
                            }}
                        />
                    </div>
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
                                Bhavin S.
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                bhavin@lumina.ai
                            </div>
                        </div>
                        <LogOut size={14} style={{ color: 'var(--text-muted)', opacity: 0.8 }} />
                    </motion.div>
                </div>
            </div>
        </aside>
    );
}
