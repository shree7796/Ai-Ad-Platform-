'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, History, CreditCard, Settings } from 'lucide-react';

function RailMark() {
    return (
        <div
            style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}
        >
            <svg width="10" height="10" viewBox="0 0 15 15" fill="none" aria-hidden>
                <path d="M7.5 1.5L13.5 13H1.5L7.5 1.5Z" fill="#000000" />
            </svg>
        </div>
    );
}

const RAIL_LINKS: {
    href: string;
    label: string;
    icon: typeof Home;
    match: (p: string) => boolean;
}[] = [
    { href: '/studio?tab=text-to-image', label: 'Studio home', icon: Home, match: (p) => p === '/studio' },
    { href: '/studio/history', label: 'History', icon: History, match: (p) => p.startsWith('/studio/history') },
    { href: '/studio/billing', label: 'Billing', icon: CreditCard, match: (p) => p.startsWith('/studio/billing') },
    { href: '/studio/settings', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/studio/settings') },
];

export default function StudioIconRail() {
    const pathname = usePathname();

    return (
        <aside
            className="studio-icon-rail"
            style={{
                height: '100%',
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px 0 14px',
                gap: 6,
            }}
        >
            <Link
                href="/"
                title="Lumina home"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 8,
                    borderRadius: 10,
                    marginBottom: 4,
                    textDecoration: 'none',
                    transition: 'background 0.15s',
                }}
                className="studio-icon-rail-link"
            >
                <RailMark />
            </Link>

            <div style={{ width: 22, height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px 0 8px' }} />

            {RAIL_LINKS.map(({ href, label, icon: Icon, match }) => {
                const active = match(pathname || '');
                return (
                    <Link
                        key={href}
                        href={href}
                        title={label}
                        className={`studio-icon-rail-btn ${active ? 'active' : ''}`}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 40,
                            height: 40,
                            borderRadius: 10,
                            textDecoration: 'none',
                            color: active ? '#ffffff' : '#a3a3a3',
                            background: active ? '#2a2a2a' : 'transparent',
                            transition: 'background 0.15s, color 0.15s',
                        }}
                    >
                        <Icon size={19} strokeWidth={active ? 2 : 1.65} />
                    </Link>
                );
            })}

            <div style={{ flex: 1, minHeight: 8 }} aria-hidden />
        </aside>
    );
}
