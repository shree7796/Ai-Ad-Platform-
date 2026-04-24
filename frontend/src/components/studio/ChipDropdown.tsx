'use client';

/**
 * ChipDropdown - a compact krea-dock-chip that opens a proper portal dropdown
 * above the trigger (same behaviour as ModelDropdown variant="dock").
 *
 * Usage:
 *   <ChipDropdown
 *     icon={<MicVocal size={14} />}
 *     value="fable"
 *     options={[{ value: 'fable', label: 'Fable', desc: 'Warm storytelling' }, …]}
 *     onChange={v => setVoice(v)}
 *   />
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

export interface ChipOption {
    value: string;
    label: string;
    desc?: string;
}

interface PanelPos {
    left: number;
    width: number;
    bottom: number;
    maxHeight: number;
}

function computePos(el: HTMLButtonElement): PanelPos {
    const r   = el.getBoundingClientRect();
    const w   = Math.max(r.width, 280);   // minimum 280px so descriptions have room
    const gap = 8;
    let left  = r.left;
    if (left + w > window.innerWidth - 8) left = Math.max(8, window.innerWidth - w - 8);
    const spaceAbove = r.top - gap - 8;
    return {
        left,
        width:     w,
        bottom:    window.innerHeight - r.top + gap,
        maxHeight: Math.min(400, Math.max(150, spaceAbove)),
    };
}

interface Props {
    /** Icon shown inside the chip trigger */
    icon?: React.ReactNode;
    value: string;
    options: ChipOption[];
    onChange: (v: string) => void;
    disabled?: boolean;
}

export default function ChipDropdown({ icon, value, options, onChange, disabled }: Props) {
    const [open, setOpen]   = useState(false);
    const [pos, setPos]     = useState<PanelPos | null>(null);
    const btnRef            = useRef<HTMLButtonElement>(null);
    const panelRef          = useRef<HTMLDivElement>(null);

    const selected = options.find(o => o.value === value) ?? options[0];

    const openDropdown = useCallback(() => {
        if (!btnRef.current) return;
        setPos(computePos(btnRef.current));
        setOpen(true);
    }, []);

    const closeDropdown = useCallback(() => {
        setOpen(false);
        setPos(null);
    }, []);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                btnRef.current   && !btnRef.current.contains(e.target as Node)
            ) closeDropdown();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, closeDropdown]);

    // Reposition on resize; close on scroll
    useEffect(() => {
        if (!open) return;
        const onScroll = (e: Event) => {
            if (panelRef.current?.contains(e.target as Node)) return;
            closeDropdown();
        };
        const onResize = () => {
            if (btnRef.current) setPos(computePos(btnRef.current));
        };
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        return () => {
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
        };
    }, [open, closeDropdown]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDropdown(); };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, closeDropdown]);

    const panel = open && pos ? createPortal(
        <div
            ref={panelRef}
            style={{
                position:  'fixed',
                left:      pos.left,
                width:     pos.width,
                bottom:    pos.bottom,
                maxHeight: pos.maxHeight,
                background:    'var(--bg-card, #1c1c24)',
                border:        '1px solid var(--border, rgba(255,255,255,0.12))',
                borderRadius:  'var(--radius-lg, 12px)',
                boxShadow:     'var(--shadow-lg, 0 16px 48px rgba(0,0,0,0.55))',
                zIndex:        9999,
                overflowY:     'auto',
                padding:       8,
                scrollbarWidth: 'thin',
            }}
        >
            {options.map(opt => {
                const active = opt.value === value;
                return (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => { onChange(opt.value); closeDropdown(); }}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 12px', cursor: 'pointer', textAlign: 'left',
                            background: active ? 'var(--bg-subtle, rgba(255,255,255,0.06))' : 'transparent',
                            border: 'none', fontFamily: 'inherit',
                            borderRadius: 'var(--radius-sm, 8px)',
                            transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => {
                            if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle, rgba(255,255,255,0.06))';
                        }}
                        onMouseLeave={e => {
                            if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                    >
                        {/* Checkmark */}
                        <div style={{ width: 16, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                            {active && <Check size={12} color="#0a84ff" strokeWidth={2.5} />}
                        </div>
                        {/* Label + desc */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary, #fff)', whiteSpace: 'normal', lineHeight: 1.3 }}>
                                {opt.label}
                            </div>
                            {opt.desc && (
                                <div style={{ fontSize: 11.5, color: 'var(--text-muted, #6b7280)', marginTop: 2, whiteSpace: 'normal', lineHeight: 1.4 }}>
                                    {opt.desc}
                                </div>
                            )}
                        </div>
                    </button>
                );
            })}
        </div>,
        document.body,
    ) : null;

    return (
        <div className="krea-model-dd-wrap" style={{ minWidth: 0 }}>
            <button
                ref={btnRef}
                type="button"
                disabled={disabled}
                onClick={() => open ? closeDropdown() : openDropdown()}
                className="krea-model-dd-trigger"
                style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '7px 10px',
                    borderRadius: 9999,
                    cursor: 'pointer',
                    border: open
                        ? '1px solid rgba(10,132,255,0.55)'
                        : '1px solid rgba(255,255,255,0.1)',
                    background: open ? 'rgba(255,255,255,0.08)' : '#2a2a2a',
                    fontFamily: 'inherit',
                    fontSize: 12, fontWeight: 600,
                    color: 'var(--text-primary, #fff)',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                    boxShadow: open ? '0 0 0 2px rgba(10,132,255,0.35)' : 'none',
                }}
            >
                {icon && <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)' }}>{icon}</span>}
                <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden' }}>
                    {selected?.label}
                </span>
                <ChevronDown
                    size={13}
                    color="var(--text-muted)"
                    style={{ flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
                />
            </button>
            {panel}
        </div>
    );
}
