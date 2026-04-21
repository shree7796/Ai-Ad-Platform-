'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Zap } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface ModelOption {
    value: string;
    label: string;
    badge: string;
    badgeColor: string;
    desc: string;
    credits: number;
    /** e.g. "/5s" for video models */
    creditsSuffix?: string;
}

interface DropdownRect { top: number; left: number; width: number; }

interface Props {
    models: ModelOption[];
    value: string;
    onChange: (v: string) => void;
    label?: string;
}

export default function ModelDropdown({ models, value, onChange, label = 'AI Model' }: Props) {
    const [open, setOpen] = useState(false);
    const [rect, setRect] = useState<DropdownRect | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const selected = models.find(m => m.value === value) ?? models[0];

    const openDropdown = useCallback(() => {
        if (!btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        setRect({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width });
        setOpen(true);
    }, []);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                btnRef.current && !btnRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    // Close only when scrolling OUTSIDE the dropdown panel (e.g. page scroll)
    useEffect(() => {
        if (!open) return;
        const handleScroll = (e: Event) => {
            if (panelRef.current && panelRef.current.contains(e.target as Node)) return;
            setOpen(false);
        };
        const handleResize = () => setOpen(false);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleResize);
        };
    }, [open]);

    const panel = open && rect ? createPortal(
        <div
            ref={panelRef}
            style={{
                position: 'absolute',
                top: rect.top,
                left: rect.left,
                width: rect.width,
                background: 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                borderRadius: 12,
                boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
                zIndex: 9999,
                maxHeight: 340,
                overflowY: 'auto',
            }}
        >
            {models.map((m, i) => {
                const active = value === m.value;
                return (
                    <button
                        key={m.value}
                        type="button"
                        onMouseDown={e => { e.preventDefault(); onChange(m.value); setOpen(false); }}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 14px', cursor: 'pointer', textAlign: 'left',
                            background: active ? 'var(--bg-accent-soft)' : 'transparent',
                            border: 'none', fontFamily: 'inherit',
                            borderBottom: i < models.length - 1 ? '1px solid var(--border)' : 'none',
                            transition: 'background 0.12s',
                        }}
                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                        {/* Check indicator */}
                        <div style={{ width: 16, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                            {active && <Check size={13} color="var(--accent)" strokeWidth={3} />}
                        </div>
                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <span style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--accent)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                    {m.label}
                                </span>
                                <span style={{
                                    fontSize: 9, fontWeight: 800, letterSpacing: '0.05em',
                                    padding: '2px 5px', borderRadius: 4, flexShrink: 0,
                                    background: `${m.badgeColor}20`, color: m.badgeColor,
                                    border: `1px solid ${m.badgeColor}40`,
                                }}>
                                    {m.badge}
                                </span>
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {m.desc}
                            </div>
                        </div>
                        {/* Credits */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, fontSize: 11, fontWeight: 800, color: active ? 'var(--accent)' : 'var(--text-muted)' }}>
                            <Zap size={9} fill="currentColor" />
                            {m.credits}{m.creditsSuffix ?? ' credits'}
                        </div>
                    </button>
                );
            })}
        </div>,
        document.body
    ) : null;

    return (
        <div>
            {/* Label */}
            {label && (
                <div style={{ marginBottom: 10 }}>
                    <span className="text-label">{label}</span>
                </div>
            )}

            {/* Trigger button */}
            <button
                ref={btnRef}
                type="button"
                onClick={() => open ? setOpen(false) : openDropdown()}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
                    border: open ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                    background: open ? 'var(--bg-accent-soft)' : 'var(--bg-subtle)',
                    fontFamily: 'inherit', transition: 'all 0.15s', textAlign: 'left',
                }}
            >
                {/* Selected badge */}
                <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', flexShrink: 0,
                    padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                    background: `${selected.badgeColor}20`, color: selected.badgeColor,
                    border: `1px solid ${selected.badgeColor}40`,
                }}>
                    {selected.badge}
                </span>
                {/* Selected name */}
                <span style={{
                    flex: 1, fontSize: 13, fontWeight: 700,
                    color: open ? 'var(--accent)' : 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {selected.label}
                </span>
                {/* Credits chip */}
                <span style={{
                    display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
                    fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
                    color: open ? 'var(--accent)' : 'var(--text-muted)',
                    background: open ? 'rgba(99,102,241,0.12)' : 'var(--bg-muted)',
                    border: `1px solid ${open ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`,
                    borderRadius: 6, padding: '3px 7px',
                }}>
                    <Zap size={9} fill="currentColor" />
                    {selected.credits}{selected.creditsSuffix ?? ' credits'}
                </span>
                <ChevronDown
                    size={14}
                    color="var(--text-muted)"
                    style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
                />
            </button>

            {panel}
        </div>
    );
}
