'use client';

import { motion } from 'framer-motion';
import { Image as ImageIcon, Images, Video, Film } from 'lucide-react';

export type StudioTab = 'text-to-image' | 'image-to-image' | 'image-to-video' | 'text-to-video';

interface Props {
    active: StudioTab;
    onChange: (tab: StudioTab) => void;
}

const tabs: { id: StudioTab; label: string; icon: React.ElementType; isNew?: boolean }[] = [
    { id: 'text-to-image', label: 'Text to Image', icon: ImageIcon },
    { id: 'image-to-image', label: 'Image to Image', icon: Images },
    { id: 'image-to-video', label: 'Image to Video', icon: Video },
    { id: 'text-to-video', label: 'Text to Video', icon: Film, isNew: true },
];

export default function TabSwitcher({ active, onChange }: Props) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            background: 'var(--bg-muted)',
            borderRadius: 14,
            padding: 4,
            border: '1px solid var(--border-light)',
            width: 'fit-content',
            position: 'relative',
        }}>
            {tabs.map(({ id, label, icon: Icon, isNew }) => {
                const isActive = active === id;
                return (
                    <button
                        key={id}
                        onClick={() => onChange(id)}
                        className={`tab-btn ${isActive ? 'active' : ''}`}
                        style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '8px 16px',
                            border: 'none',
                            background: 'transparent',
                            borderRadius: 10,
                            cursor: 'pointer',
                            zIndex: 1,
                        }}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="active-tab-indicator"
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    borderRadius: 10,
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    zIndex: -1,
                                }}
                                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <Icon size={14} strokeWidth={isActive ? 2.5 : 2} style={{ color: isActive ? 'var(--accent)' : 'inherit' }} />
                        <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {label}
                        </span>
                        {isNew && (
                            <span style={{
                                fontSize: 9,
                                fontWeight: 800,
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: '#fff',
                                padding: '1px 5px',
                                borderRadius: 4,
                                textTransform: 'uppercase',
                                marginLeft: 2,
                            }}>
                                NEW
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
