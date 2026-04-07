'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '@/components/studio/Sidebar';
import {
    User,
    Bell,
    Lock,
    Eye,
    CreditCard,
    Globe,
    Shield,
    Save,
    Camera,
    Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState('profile');

    const handleSave = () => {
        const t = toast.loading('Saving changes...');
        setTimeout(() => {
            toast.dismiss(t);
            toast.success('Settings updated successfully', {
                style: {
                    borderRadius: '12px',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--shadow-lg)',
                    border: '1px solid var(--border)'
                }
            });
        }, 1200);
    };

    const sections = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'appearance', label: 'Appearance', icon: Eye },
        { id: 'billing', label: 'Plan & Billing', icon: CreditCard },
    ];

    return (
        <div className="studio-layout">
            <Sidebar />
            <main className="studio-main">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginBottom: 32 }}
                >
                    <h1 style={{
                        fontSize: 24, fontWeight: 800, color: 'var(--text-primary)',
                        fontFamily: 'var(--font-display, Montserrat), sans-serif',
                        letterSpacing: '-0.03em', marginBottom: 4,
                    }}>Account Settings</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>Manage your profile and platform preferences</p>
                </motion.div>

                <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 40 }}>
                    {/* Sidebar Tabs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {sections.map(s => {
                            const isActive = activeSection === s.id;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => setActiveSection(s.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12,
                                        padding: '12px 16px', borderRadius: 12, border: 'none',
                                        background: isActive ? 'var(--bg-muted)' : 'transparent',
                                        color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                                        fontSize: 14, fontWeight: isActive ? 700 : 500,
                                        cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left'
                                    }}
                                >
                                    <s.icon size={18} style={{ opacity: isActive ? 1 : 0.6 }} />
                                    {s.label}
                                </button>
                            );
                        })}
                        <div style={{ height: 1, background: 'var(--border-light)', margin: '16px 0' }} />
                        <button style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '12px 16px', borderRadius: 12, border: 'none',
                            background: 'transparent', color: '#ef4444',
                            fontSize: 14, fontWeight: 600, cursor: 'pointer', textAlign: 'left'
                        }}>
                            <Trash2 size={18} />
                            Delete Account
                        </button>
                    </div>

                    {/* Content Section */}
                    <motion.div
                        key={activeSection}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="card"
                        style={{ padding: 32 }}
                    >
                        {activeSection === 'profile' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ width: 80, height: 80, borderRadius: 99, background: 'var(--bg-muted)', border: '2px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800 }}>BS</div>
                                        <button style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 99, background: 'var(--accent)', border: '2px solid var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                                            <Camera size={14} />
                                        </button>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>Profile Picture</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>JPG, GIF or PNG. Max size of 2MB</div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Full Name</label>
                                        <input type="text" defaultValue="Bhavin S." style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14 }} />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Email Address</label>
                                        <input type="email" defaultValue="bhavin@lumina.ai" style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14 }} />
                                    </div>
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>Bio/Description</label>
                                    <textarea rows={4} placeholder="Tell us about yourself..." style={{ width: '100%', padding: '12px 16px', borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit' }} />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16 }}>
                                    <motion.button
                                        whileTap={{ scale: 0.98 }}
                                        onClick={handleSave}
                                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                                    >
                                        <Save size={18} />
                                        Save Changes
                                    </motion.button>
                                </div>
                            </div>
                        )}

                        {activeSection !== 'profile' && (
                            <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                <div style={{ width: 64, height: 64, borderRadius: 99, background: 'var(--bg-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                    <Shield size={32} color="var(--text-muted)" />
                                </div>
                                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Section coming soon</h3>
                                <p style={{ fontSize: 14, color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto' }}>We are working on bringing more advanced settings to your profile.</p>
                            </div>
                        )}
                    </motion.div>
                </div>
            </main>
        </div>
    );
}
