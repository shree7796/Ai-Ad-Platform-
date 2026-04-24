'use client';

import { useState } from 'react';
import {
    Lightbulb, Layers, Palette, ChevronDown, Check, Zap,
    Image as ImageIcon, Cpu, Lock,
} from 'lucide-react';
import {
    KreaDockRoot,
    KreaDockPrompt,
    KreaDockToolbar,
    KreaDockChipRow,
    KreaDockSubmit,
} from '@/components/studio/KreaDock';

// ── Data ──────────────────────────────────────────────────────────────────────

const IGAMING_MODELS = [
    {
        value: 'flux-schnell',
        costKey: 'igaming_flux_schnell',
        quality: 'standard' as const,
        label: 'Flux Schnell',
        credits: 30,
        badge: 'FAST',
        badgeColor: '#0ea5e9',
        desc: 'Fast generation · standard quality',
    },
    {
        value: 'flux-dev',
        costKey: 'igaming_flux_dev',
        quality: 'premium' as const,
        label: 'Flux Dev',
        credits: 40,
        badge: 'RECOMMENDED',
        badgeColor: '#409cff',
        desc: 'High quality · crisp game assets',
    },
    {
        value: 'flux-pro',
        costKey: 'igaming_flux_pro',
        quality: 'premium' as const,
        label: 'Flux Pro',
        credits: 44,
        badge: 'PREMIUM',
        badgeColor: '#f59e0b',
        desc: 'Professional quality · fine details',
    },
    {
        value: 'flux-2-pro',
        costKey: 'igaming_flux_2_pro',
        quality: 'premium' as const,
        label: 'Flux 2 Pro',
        credits: 50,
        badge: 'BEST',
        badgeColor: '#a855f7',
        desc: 'Best quality · most detailed output',
    },
];

const TEMPLATES = [
    { value: 'slot_icon',    label: 'Slot Icon',     desc: 'Centered, high contrast, isolated game icon'    },
    { value: 'bonus_item',   label: 'Bonus Item',    desc: 'Glowing treasure with magical aura on dark bg'  },
    { value: 'promo_banner', label: 'Promo Banner',  desc: 'Casino promotional with neon highlights'        },
    { value: 'card',         label: 'Playing Card',  desc: 'Elegant casino card design, crisp borders'     },
    { value: 'symbol',       label: 'Game Symbol',   desc: 'Bold graphic symbol, vibrant centered'          },
    { value: 'custom',       label: 'Custom',        desc: 'Use your prompt directly, no preset style'     },
];

const STYLES = [
    { value: 'gold',    label: 'Gold',    desc: 'Warm metallic, shiny golden finish'         },
    { value: 'silver',  label: 'Silver',  desc: 'Cool chrome, reflective metallic sheen'      },
    { value: 'gem',     label: 'Gem',     desc: 'Crystal sparkle, prismatic vibrant colors'  },
    { value: 'neon',    label: 'Neon',    desc: 'Electric glow, dark background, vivid light'},
    { value: 'classic', label: 'Classic', desc: 'Rich traditional casino style, elegant'     },
];

const SUGGESTIONS = [
    'A golden dragon holding a glowing ruby coin',
    'Lucky 7 symbol with diamond shine and fire glow',
    'Treasure chest overflowing with coins on velvet',
    'Royal crown with embedded precious gemstones',
    'A phoenix rising from flames with golden feathers',
];

type DropdownId = 'model' | 'template' | 'style' | null;

function InlineDropdown({ open, children }: { open: boolean; children: React.ReactNode }) {
    if (!open) return null;
    return (
        <div style={{
            background: 'var(--bg-card, #16161e)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 10,
            marginTop: 4,
            marginBottom: 2,
            overflow: 'hidden',
        }}>
            {children}
        </div>
    );
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IgamingPayload {
    task_type: 'igaming_assets';
    prompt: string;
    igaming_template: string;
    igaming_style: string;
    igaming_quality: 'standard' | 'premium';
    image_model: string;
}

interface Props {
    onGenerate: (payload: IgamingPayload) => void;
    loading: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function IgamingAssets({ onGenerate, loading }: Props) {
    const [prompt, setPrompt]               = useState('');
    const [model, setModel]                 = useState('flux-dev');
    const [template, setTemplate]           = useState('slot_icon');
    const [style, setStyle]                 = useState('gold');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [openDd, setOpenDd]               = useState<DropdownId>(null);

    const selModel    = IGAMING_MODELS.find(m => m.value === model) ?? IGAMING_MODELS[1];
    const selTemplate = TEMPLATES.find(t => t.value === template) ?? TEMPLATES[0];
    const selStyle    = STYLES.find(s => s.value === style) ?? STYLES[0];

    function toggle(id: DropdownId) {
        setOpenDd(prev => (prev === id ? null : id));
    }

    function runGenerate() {
        if (!prompt.trim()) return;
        onGenerate({
            task_type: 'igaming_assets',
            prompt: prompt.trim(),
            igaming_template: template,
            igaming_style: style,
            igaming_quality: selModel.quality,
            image_model: selModel.costKey,   // flat-rate cost key for credit lookup
        });
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Premium badge */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 10px',
                background: 'rgba(5,150,105,0.10)',
                border: '1px solid rgba(5,150,105,0.25)',
                borderRadius: 8,
                fontSize: 11,
                color: '#10b981',
                fontWeight: 600,
            }}>
                <Lock size={11} strokeWidth={2.5} />
                Premium Feature — requires a paid subscription
            </div>

            <KreaDockRoot>
                <KreaDockPrompt
                    value={prompt}
                    onChange={setPrompt}
                    placeholder={`Describe your game asset… e.g. "${SUGGESTIONS[0]}"`}
                    onSubmit={runGenerate}
                    disabled={loading}
                />

                {/* Suggestions panel */}
                {showSuggestions && (
                    <div style={{
                        display: 'flex',
                        gap: 6,
                        flexWrap: 'wrap',
                        padding: '6px 12px 8px',
                        borderBottom: '1px solid rgba(255,255,255,0.07)',
                    }}>
                        {SUGGESTIONS.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => { setPrompt(s); setShowSuggestions(false); }}
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.10)',
                                    borderRadius: 20,
                                    padding: '4px 12px',
                                    fontSize: 12,
                                    color: 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    lineHeight: 1.4,
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.11)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                <KreaDockToolbar>
                    <KreaDockChipRow>

                        {/* Model dropdown trigger */}
                        <button
                            type="button"
                            className="krea-dock-chip"
                            data-on={openDd === 'model' ? 'true' : undefined}
                            onClick={() => toggle('model')}
                            disabled={loading}
                            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                            <Cpu size={14} strokeWidth={1.75} />
                            {selModel.label}
                            <ChevronDown size={12} strokeWidth={2} style={{
                                transform: openDd === 'model' ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.15s',
                            }} />
                        </button>

                        {/* Template dropdown trigger */}
                        <button
                            type="button"
                            className="krea-dock-chip"
                            data-on={openDd === 'template' ? 'true' : undefined}
                            onClick={() => toggle('template')}
                            disabled={loading}
                            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                            <Layers size={14} strokeWidth={1.75} />
                            {selTemplate.label}
                            <ChevronDown size={12} strokeWidth={2} style={{
                                transform: openDd === 'template' ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.15s',
                            }} />
                        </button>

                        {/* Style dropdown trigger */}
                        <button
                            type="button"
                            className="krea-dock-chip"
                            data-on={openDd === 'style' ? 'true' : undefined}
                            onClick={() => toggle('style')}
                            disabled={loading}
                            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                            <Palette size={14} strokeWidth={1.75} />
                            {selStyle.label}
                            <ChevronDown size={12} strokeWidth={2} style={{
                                transform: openDd === 'style' ? 'rotate(180deg)' : 'none',
                                transition: 'transform 0.15s',
                            }} />
                        </button>

                        {/* Credits estimate */}
                        <span
                            className="krea-dock-chip"
                            style={{
                                opacity: 0.6,
                                pointerEvents: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                            }}
                        >
                            <Zap size={13} strokeWidth={1.75} style={{ color: '#fbbf24' }} />
                            {selModel.credits} credits · 4 assets
                        </span>

                        {/* Ideas toggle */}
                        <button
                            type="button"
                            className="krea-dock-chip"
                            data-on={showSuggestions ? 'true' : undefined}
                            onClick={() => setShowSuggestions(v => !v)}
                            disabled={loading}
                            style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                        >
                            <Lightbulb size={14} strokeWidth={1.75} />
                            Ideas
                        </button>

                    </KreaDockChipRow>

                    <KreaDockSubmit
                        loading={loading}
                        disabled={loading || !prompt.trim()}
                        onClick={runGenerate}
                        label="Generate 4 Assets"
                    />
                </KreaDockToolbar>

                {/* Model dropdown panel */}
                <InlineDropdown open={openDd === 'model'}>
                    {IGAMING_MODELS.map(m => (
                        <button
                            key={m.value}
                            type="button"
                            onClick={() => { setModel(m.value); setOpenDd(null); }}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                width: '100%',
                                padding: '9px 14px',
                                background: model === m.value ? 'rgba(255,255,255,0.07)' : 'transparent',
                                border: 'none',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.12s',
                            }}
                            onMouseEnter={e => {
                                if (model !== m.value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = model === m.value ? 'rgba(255,255,255,0.07)' : 'transparent';
                            }}
                        >
                            <Check size={14} strokeWidth={2.5} style={{ color: '#0a84ff', opacity: model === m.value ? 1 : 0, flexShrink: 0, marginTop: 2 }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{m.label}</span>
                                    <span style={{
                                        fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
                                        color: m.badgeColor, background: `${m.badgeColor}22`,
                                        padding: '2px 6px', borderRadius: 4,
                                    }}>{m.badge}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.desc}</span>
                                    <span style={{ fontSize: 11, color: '#fbbf24', fontWeight: 600, marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                                        {m.credits} ⚡
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}
                </InlineDropdown>

                {/* Template dropdown panel */}
                <InlineDropdown open={openDd === 'template'}>
                    {TEMPLATES.map(t => (
                        <button
                            key={t.value}
                            type="button"
                            onClick={() => { setTemplate(t.value); setOpenDd(null); }}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                width: '100%',
                                padding: '9px 14px',
                                background: template === t.value ? 'rgba(255,255,255,0.07)' : 'transparent',
                                border: 'none',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.12s',
                            }}
                            onMouseEnter={e => {
                                if (template !== t.value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = template === t.value ? 'rgba(255,255,255,0.07)' : 'transparent';
                            }}
                        >
                            <Check size={14} strokeWidth={2.5} style={{ color: '#0a84ff', opacity: template === t.value ? 1 : 0, flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{t.label}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{t.desc}</div>
                            </div>
                        </button>
                    ))}
                </InlineDropdown>

                {/* Style dropdown panel */}
                <InlineDropdown open={openDd === 'style'}>
                    {STYLES.map(s => (
                        <button
                            key={s.value}
                            type="button"
                            onClick={() => { setStyle(s.value); setOpenDd(null); }}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 10,
                                width: '100%',
                                padding: '9px 14px',
                                background: style === s.value ? 'rgba(255,255,255,0.07)' : 'transparent',
                                border: 'none',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.12s',
                            }}
                            onMouseEnter={e => {
                                if (style !== s.value) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = style === s.value ? 'rgba(255,255,255,0.07)' : 'transparent';
                            }}
                        >
                            <Check size={14} strokeWidth={2.5} style={{ color: '#0a84ff', opacity: style === s.value ? 1 : 0, flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.3 }}>{s.label}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{s.desc}</div>
                            </div>
                        </button>
                    ))}
                </InlineDropdown>

                {/* Info row */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 14px 8px',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <ImageIcon size={11} style={{ opacity: 0.5, flexShrink: 0 }} />
                    Generates 4 assets: front view · left angle · right angle · promo scene
                </div>

            </KreaDockRoot>
        </div>
    );
}
