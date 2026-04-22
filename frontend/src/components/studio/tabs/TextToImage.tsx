'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, RectangleHorizontal } from 'lucide-react';
import ModelDropdown, { ModelOption } from '@/components/studio/ModelDropdown';
import { KreaDockRoot, KreaDockPrompt, KreaDockToolbar, KreaDockChipRow, KreaDockSubmit } from '@/components/studio/KreaDock';

const IMAGE_MODELS: ModelOption[] = [
    { value: 'flux-schnell',    label: 'FLUX Schnell',    badge: 'FAST',     badgeColor: '#10b981', desc: 'Fastest generation · great for drafts',                credits: 4  },
    { value: 'flux-dev',        label: 'FLUX Dev',         badge: 'DEFAULT',  badgeColor: '#0a84ff', desc: 'Best quality · product & scene preservation',          credits: 8  },
    { value: 'flux-pro',        label: 'FLUX Pro 1.1',     badge: 'PREMIUM',  badgeColor: '#f59e0b', desc: 'Ultra-detailed · photorealistic output',                credits: 11 },
    { value: 'flux-2-pro',      label: 'FLUX 2 Pro',       badge: 'NEWEST',   badgeColor: '#a855f7', desc: 'Latest FLUX generation · state of the art',            credits: 15 },
    { value: 'nano-banana-pro', label: 'Nano Banana Pro',  badge: 'PRO',      badgeColor: '#f97316', desc: 'Google Imagen Pro · highest nano quality',              credits: 10 },
    { value: 'seedream-45',     label: 'Seedream 4.5',     badge: 'BYTEDANCE',badgeColor: '#ec4899', desc: 'ByteDance · photorealistic · sharp details',            credits: 8  },
    { value: 'ideogram-v3',     label: 'Ideogram V3',      badge: 'TEXT',     badgeColor: '#06b6d4', desc: 'Best for text in images · typography · logos',          credits: 10 },
];

const STYLES = ['Realistic', 'Anime', 'Cinematic', 'Product', '3D'];
const RATIOS = ['1:1', '16:9', '9:16'];
const SUGGESTIONS = [
    'A serene mountain lake at golden hour',
    'Minimalist product shot on white marble',
    'Futuristic city skyline at dusk',
    'Close-up of coffee art in a ceramic cup',
    'Fashion editorial with soft natural light',
];

interface Props {
    onGenerate: (data: { prompt: string; style: string; ratio: string; model: string }) => void;
    loading: boolean;
}

function cycle<T>(arr: T[], current: T): T {
    const i = arr.indexOf(current);
    return arr[(i + 1) % arr.length];
}

export default function TextToImage({ onGenerate, loading }: Props) {
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('Realistic');
    const [ratio, setRatio] = useState('1:1');
    const [model, setModel] = useState('flux-dev');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const selectedModel = useMemo(() => IMAGE_MODELS.find(m => m.value === model) ?? IMAGE_MODELS[0], [model]);

    const runGenerate = () => {
        const p = prompt.trim();
        if (p) onGenerate({ prompt: p, style, ratio, model });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <KreaDockRoot>
                <KreaDockPrompt
                    rows={3}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe an image and click generate…"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            runGenerate();
                        }
                    }}
                />
                <AnimatePresence>
                    {showSuggestions && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 2px 10px' }}>
                                {SUGGESTIONS.map(s => (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => { setPrompt(s); setShowSuggestions(false); }}
                                        className="krea-dock-chip"
                                        style={{ whiteSpace: 'normal', textAlign: 'left', lineHeight: 1.35, maxWidth: '100%' }}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                <KreaDockToolbar>
                    <KreaDockChipRow>
                        <ModelDropdown models={IMAGE_MODELS} value={model} onChange={setModel} label="" variant="dock" />
                        <button
                            type="button"
                            className="krea-dock-chip"
                            title="Style"
                            onClick={() => setStyle(s => cycle(STYLES, s))}
                        >
                            {style}
                        </button>
                        <button
                            type="button"
                            className="krea-dock-chip"
                            title="Aspect ratio"
                            onClick={() => setRatio(r => cycle(RATIOS, r))}
                        >
                            <RectangleHorizontal size={14} strokeWidth={1.75} />
                            {ratio}
                        </button>
                        <button
                            type="button"
                            className="krea-dock-chip"
                            data-on={showSuggestions ? 'true' : undefined}
                            onClick={() => setShowSuggestions(v => !v)}
                        >
                            <Lightbulb size={14} strokeWidth={1.75} />
                            Ideas
                        </button>
                    </KreaDockChipRow>
                    <KreaDockSubmit
                        disabled={!prompt.trim()}
                        loading={loading}
                        onClick={runGenerate}
                        title={`Generate (${selectedModel.credits} credits)`}
                    />
                </KreaDockToolbar>
            </KreaDockRoot>
        </div>
    );
}
