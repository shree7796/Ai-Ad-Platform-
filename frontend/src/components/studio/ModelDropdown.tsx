'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check, Zap } from 'lucide-react';
import { createPortal } from 'react-dom';
import { StudioModelIcon } from '@/lib/studioModelIcon';

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

/** Fixed viewport position: panel opens above trigger (`bottom` = px from viewport bottom to panel's bottom edge). */
interface PanelPosition {
    left: number;
    width: number;
    bottom: number;
    maxHeight: number;
}

interface Props {
    models: ModelOption[];
    value: string;
    onChange: (v: string) => void;
    label?: string;
    /** Compact pill trigger for Krea dock toolbar */
    variant?: 'default' | 'dock';
}

const OPEN_DELAY_MS = 50;
const CLOSE_DELAY_MS = 280;

function computePanelPosition(el: HTMLButtonElement, variant: 'default' | 'dock'): PanelPosition {
    const r = el.getBoundingClientRect();
    const width = variant === 'dock' ? Math.max(r.width, 300) : r.width;
    const gap = 8;
    let left = r.left;
    if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8);
    }
    const spaceAbove = r.top - gap - 8;
    const maxHeight = Math.min(320, Math.max(120, spaceAbove));
    return {
        left,
        width,
        bottom: window.innerHeight - r.top + gap,
        maxHeight,
    };
}

export default function ModelDropdown({ models, value, onChange, label = 'AI Model', variant = 'default' }: Props) {
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<PanelPosition | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const selected = models.find(m => m.value === value) ?? models[0];

    const clearOpenTimer = () => {
        if (openTimerRef.current) {
            clearTimeout(openTimerRef.current);
            openTimerRef.current = null;
        }
    };

    const clearCloseTimer = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    };

    const clearAllTimers = () => {
        clearOpenTimer();
        clearCloseTimer();
    };

    const openDropdown = useCallback(() => {
        if (!btnRef.current) return;
        setPos(computePanelPosition(btnRef.current, variant));
        setOpen(true);
    }, [variant]);

    const closeDropdown = useCallback(() => {
        setOpen(false);
        setPos(null);
    }, []);

    const scheduleOpen = useCallback(() => {
        clearCloseTimer();
        clearOpenTimer();
        openTimerRef.current = setTimeout(() => {
            openTimerRef.current = null;
            openDropdown();
        }, OPEN_DELAY_MS);
    }, [openDropdown]);

    const scheduleClose = useCallback(() => {
        clearOpenTimer();
        clearCloseTimer();
        closeTimerRef.current = setTimeout(() => {
            closeTimerRef.current = null;
            closeDropdown();
        }, CLOSE_DELAY_MS);
    }, [closeDropdown]);

    const onTriggerMouseEnter = () => {
        clearCloseTimer();
        scheduleOpen();
    };

    const onTriggerMouseLeave = () => {
        clearOpenTimer();
        scheduleClose();
    };

    const onPanelMouseEnter = () => {
        clearCloseTimer();
    };

    const onPanelMouseLeave = () => {
        scheduleClose();
    };

    useEffect(() => () => clearAllTimers(), []);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                panelRef.current && !panelRef.current.contains(e.target as Node) &&
                btnRef.current && !btnRef.current.contains(e.target as Node)
            ) {
                clearAllTimers();
                closeDropdown();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, closeDropdown]);

    // Reposition while open (e.g. layout shift); close on scroll away from panel
    useEffect(() => {
        if (!open || !btnRef.current) return;
        const handleScroll = (e: Event) => {
            if (panelRef.current && panelRef.current.contains(e.target as Node)) return;
            clearAllTimers();
            closeDropdown();
        };
        const handleResize = () => {
            if (!btnRef.current) return;
            setPos(computePanelPosition(btnRef.current, variant));
        };
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleResize);
        };
    }, [open, variant, closeDropdown]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                clearAllTimers();
                closeDropdown();
            }
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open, closeDropdown]);

    const panel = open && pos ? createPortal(
        <div
            ref={panelRef}
            onMouseEnter={onPanelMouseEnter}
            onMouseLeave={onPanelMouseLeave}
            style={{
                position: 'fixed',
                left: pos.left,
                width: pos.width,
                bottom: pos.bottom,
                maxHeight: pos.maxHeight,
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 9999,
                overflowY: 'auto',
                padding: 6,
                scrollbarWidth: 'thin',
            }}
        >
            {models.map((m) => {
                const active = value === m.value;
                return (
                    <button
                        key={m.value}
                        type="button"
                        onClick={() => { onChange(m.value); clearAllTimers(); closeDropdown(); }}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '9px 12px', cursor: 'pointer', textAlign: 'left',
                            background: active ? 'var(--bg-subtle)' : 'transparent',
                            border: 'none', fontFamily: 'inherit',
                            borderRadius: 'var(--radius-sm)',
                            transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                        <div style={{ width: 16, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                            {active && <Check size={12} color="#0a84ff" strokeWidth={2.5} />}
                        </div>
                        <div
                            style={{
                                width: 22,
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-primary)',
                            }}
                        >
                            <StudioModelIcon modelValue={m.value} size={15} strokeWidth={2} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                    {m.label}
                                </span>
                                <span style={{
                                    fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
                                    padding: '1px 5px', borderRadius: 4, flexShrink: 0,
                                    background: `${m.badgeColor}18`, color: m.badgeColor,
                                }}>
                                    {m.badge}
                                </span>
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {m.desc}
                            </div>
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 3,
                            flexShrink: 0, fontSize: 11, fontWeight: 700,
                            color: 'var(--text-muted)',
                        }}>
                            <Zap size={9} fill="currentColor" />
                            {m.credits}{m.creditsSuffix ?? ''}
                        </div>
                    </button>
                );
            })}
        </div>,
        document.body
    ) : null;

    const isDock = variant === 'dock';

    return (
        <div
            className={isDock ? 'krea-model-dd-wrap' : undefined}
            style={isDock ? { minWidth: 0 } : undefined}
            onMouseEnter={onTriggerMouseEnter}
            onMouseLeave={onTriggerMouseLeave}
        >
            {label && !isDock && (
                <div style={{ marginBottom: 8 }}>
                    <span className="text-label">{label}</span>
                </div>
            )}

            <button
                ref={btnRef}
                type="button"
                onClick={() => {
                    clearAllTimers();
                    if (open) {
                        closeDropdown();
                    } else {
                        openDropdown();
                    }
                }}
                className={isDock ? 'krea-model-dd-trigger' : undefined}
                style={{
                    width: isDock ? '100%' : '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: isDock ? 8 : 10,
                    padding: isDock ? '8px 14px' : '9px 12px',
                    borderRadius: isDock ? 9999 : 'var(--radius-md)',
                    cursor: 'pointer',
                    border: open
                        ? '1px solid rgba(10, 132, 255, 0.55)'
                        : `1px solid ${isDock ? 'rgba(255,255,255,0.1)' : 'var(--studio-dd-border, var(--border))'}`,
                    background: open
                        ? 'rgba(255,255,255,0.08)'
                        : isDock
                          ? '#2a2a2a'
                          : 'var(--studio-dd-bg, var(--bg-input))',
                    fontFamily: 'inherit',
                    transition: 'all 0.15s',
                    textAlign: 'left',
                    boxShadow: open ? '0 0 0 2px rgba(10, 132, 255, 0.35)' : 'none',
                }}
            >
                {!isDock && (
                    <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', flexShrink: 0,
                        padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                        background: `${selected.badgeColor}18`, color: selected.badgeColor,
                    }}>
                        {selected.badge}
                    </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-primary)', flexShrink: 0 }}>
                    <StudioModelIcon modelValue={selected.value} size={isDock ? 14 : 15} strokeWidth={2} />
                </span>
                <span style={{
                    flex: 1, minWidth: 0, fontSize: isDock ? 12 : 13, fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                    {selected.label}
                </span>
                <span style={{
                    display: 'flex', alignItems: 'center', gap: 3,
                    flexShrink: 0, fontSize: isDock ? 10 : 11, fontWeight: 600,
                    color: 'var(--text-muted)',
                }}>
                    <Zap size={isDock ? 8 : 9} fill="currentColor" />
                    {selected.credits}{selected.creditsSuffix ?? ''}
                </span>
                <ChevronDown
                    size={isDock ? 13 : 14}
                    color="var(--text-muted)"
                    style={{ flexShrink: 0, transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'none' }}
                />
            </button>

            {panel}
        </div>
    );
}
