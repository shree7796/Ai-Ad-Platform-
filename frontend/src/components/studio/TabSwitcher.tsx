'use client';

import { motion } from 'framer-motion';
import { STUDIO_MODE_ITEMS, type StudioTab } from '@/lib/studioTabs';

export type { StudioTab };

interface Props {
    active: StudioTab;
    onChange: (tab: StudioTab) => void;
}

export default function TabSwitcher({ active, onChange }: Props) {
    return (
        <div className="tab-switcher">
            {STUDIO_MODE_ITEMS.map(({ id, label, icon: Icon, isNew }) => {
                const isActive = active === id;
                return (
                    <button
                        key={id}
                        onClick={() => onChange(id)}
                        className={`tab-btn ${isActive ? 'active' : ''}`}
                        style={{ position: 'relative' }}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="krea-active-tab"
                                style={{
                                    position: 'absolute', inset: 0,
                                    background: 'rgba(255,255,255,0.1)',
                                    borderRadius: 8,
                                    boxShadow: '0 1px 4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
                                    zIndex: -1,
                                }}
                                transition={{ type: 'spring', bounce: 0.16, duration: 0.45 }}
                            />
                        )}
                        <Icon
                            size={13}
                            strokeWidth={isActive ? 2.2 : 1.7}
                            style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', flexShrink: 0 }}
                        />
                        <span>{label}</span>
                        {isNew && (
                            <span style={{
                                fontSize: 9, fontWeight: 700,
                                background: '#0a84ff',
                                color: '#ffffff',
                                padding: '1px 5px', borderRadius: 4,
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
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
