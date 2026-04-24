'use client';

import { useState } from 'react';
import { Lightbulb, Layers, Palette, Zap, Image as ImageIcon, Lock } from 'lucide-react';
import ModelDropdown, { type ModelOption } from '@/components/studio/ModelDropdown';
import ChipDropdown, { type ChipOption } from '@/components/studio/ChipDropdown';
import {
    KreaDockRoot,
    KreaDockPrompt,
    KreaDockToolbar,
    KreaDockChipRow,
    KreaDockSubmit,
} from '@/components/studio/KreaDock';

// ── Models (portal dropdown - same as TextToVideo) ────────────────────────────

const IGAMING_MODELS: ModelOption[] = [
    { value: 'flux-schnell', label: 'Flux Schnell', badge: 'FAST',        badgeColor: '#0ea5e9', desc: 'Fast generation · standard quality',  credits: 30 },
    { value: 'flux-dev',     label: 'Flux Dev',     badge: 'RECOMMENDED', badgeColor: '#409cff', desc: 'High quality · crisp game assets',    credits: 40 },
    { value: 'flux-pro',     label: 'Flux Pro',     badge: 'PREMIUM',     badgeColor: '#f59e0b', desc: 'Professional quality · fine details', credits: 44 },
    { value: 'flux-2-pro',   label: 'Flux 2 Pro',   badge: 'BEST',        badgeColor: '#a855f7', desc: 'Best quality · most detailed output', credits: 50 },
];

const MODEL_COST_KEY: Record<string, string> = {
    'flux-schnell': 'igaming_flux_schnell',
    'flux-dev':     'igaming_flux_dev',
    'flux-pro':     'igaming_flux_pro',
    'flux-2-pro':   'igaming_flux_2_pro',
};

// ── ChipDropdown options ──────────────────────────────────────────────────────

const TEMPLATE_OPTIONS: ChipOption[] = [
    { value: 'slot_icon',    label: 'Slot Icon',    desc: 'Centered, high contrast, isolated game icon'   },
    { value: 'bonus_item',   label: 'Bonus Item',   desc: 'Glowing treasure with magical aura on dark bg' },
    { value: 'promo_banner', label: 'Promo Banner', desc: 'Casino promotional with neon highlights'       },
    { value: 'card',         label: 'Playing Card', desc: 'Elegant casino card design, crisp borders'    },
    { value: 'symbol',       label: 'Game Symbol',  desc: 'Bold graphic symbol, vibrant centered'         },
    { value: 'custom',       label: 'Custom',       desc: 'Use your prompt directly, no preset style'    },
];

const STYLE_OPTIONS: ChipOption[] = [
    { value: 'gold',    label: 'Gold',    desc: 'Warm metallic, shiny golden finish'        },
    { value: 'silver',  label: 'Silver',  desc: 'Cool chrome, reflective metallic sheen'    },
    { value: 'gem',     label: 'Gem',     desc: 'Crystal sparkle, prismatic vibrant colors' },
    { value: 'neon',    label: 'Neon',    desc: 'Electric glow, dark background, vivid'     },
    { value: 'classic', label: 'Classic', desc: 'Rich traditional casino style, elegant'    },
];

const SUGGESTIONS = [
    'A golden dragon holding a glowing ruby coin',
    'Lucky 7 symbol with diamond shine and fire glow',
    'Treasure chest overflowing with coins on velvet',
    'Royal crown with embedded precious gemstones',
    'A phoenix rising from flames with golden feathers',
];

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
    const [prompt, setPrompt]     = useState('');
    const [model, setModel]       = useState('flux-dev');
    const [template, setTemplate] = useState('slot_icon');
    const [style, setStyle]       = useState('gold');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const selModel = IGAMING_MODELS.find(m => m.value === model) ?? IGAMING_MODELS[1];
    const quality  = model === 'flux-schnell' ? 'standard' : 'premium';

    function runGenerate() {
        if (!prompt.trim()) return;
        onGenerate({
            task_type: 'igaming_assets',
            prompt: prompt.trim(),
            igaming_template: template,
            igaming_style: style,
            igaming_quality: quality,
            image_model: MODEL_COST_KEY[model] ?? 'igaming_flux_dev',
        });
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Premium badge */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px',
                background: 'rgba(5,150,105,0.10)',
                border: '1px solid rgba(5,150,105,0.25)',
                borderRadius: 8, fontSize: 11, color: '#10b981', fontWeight: 600,
            }}>
                <Lock size={11} strokeWidth={2.5} />
                Premium Feature - requires a paid subscription
            </div>

            <KreaDockRoot>
                <KreaDockPrompt
                    value={prompt}
                    onChange={setPrompt}
                    placeholder={`Describe your game asset… e.g. "${SUGGESTIONS[0]}"`}
                    onSubmit={runGenerate}
                    disabled={loading}
                />

                {showSuggestions && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 2px 10px' }}>
                        {SUGGESTIONS.map(s => (
                            <button key={s} type="button" className="krea-dock-chip"
                                style={{ whiteSpace: 'normal', textAlign: 'left', lineHeight: 1.35, maxWidth: '100%' }}
                                onClick={() => { setPrompt(s); setShowSuggestions(false); }}>
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                <KreaDockToolbar>
                    <KreaDockChipRow>

                        {/* Model - ModelDropdown (same as TextToVideo) */}
                        <ModelDropdown
                            models={IGAMING_MODELS}
                            value={model}
                            onChange={setModel}
                            label=""
                            variant="dock"
                        />

                        {/* Template - ChipDropdown (proper portal dropdown) */}
                        <ChipDropdown
                            icon={<Layers size={14} strokeWidth={1.75} />}
                            value={template}
                            options={TEMPLATE_OPTIONS}
                            onChange={setTemplate}
                            disabled={loading}
                        />

                        {/* Style - ChipDropdown (proper portal dropdown) */}
                        <ChipDropdown
                            icon={<Palette size={14} strokeWidth={1.75} />}
                            value={style}
                            options={STYLE_OPTIONS}
                            onChange={setStyle}
                            disabled={loading}
                        />

                        {/* Credits - read-only */}
                        <span className="krea-dock-chip" style={{ pointerEvents: 'none', opacity: 0.6 }}>
                            <Zap size={13} strokeWidth={1.75} style={{ color: '#fbbf24' }} />
                            {selModel.credits} cr · 4 assets
                        </span>

                        {/* Ideas toggle */}
                        <button type="button" className="krea-dock-chip"
                            data-on={showSuggestions ? 'true' : undefined}
                            onClick={() => setShowSuggestions(v => !v)}
                            disabled={loading}>
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

                {/* Info row */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 14px 8px', fontSize: 11, color: 'var(--text-muted)',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <ImageIcon size={11} style={{ opacity: 0.5, flexShrink: 0 }} />
                    Generates 4 assets: front view · left angle · right angle · promo scene
                </div>

            </KreaDockRoot>
        </div>
    );
}
