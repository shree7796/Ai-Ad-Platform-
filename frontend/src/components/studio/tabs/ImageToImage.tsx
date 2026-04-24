'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload, X, ArrowLeftRight,
    Sparkles, Scissors, Camera,
    ImageIcon,
} from 'lucide-react';
import ModelDropdown, { ModelOption } from '@/components/studio/ModelDropdown';
import AspectRatioSelector from '@/components/studio/AspectRatioSelector';
import { KreaDockRoot, KreaDockPrompt, KreaDockToolbar, KreaDockChipRow, KreaDockSubmit } from '@/components/studio/KreaDock';
import { useAuth } from '@/context/AuthContext';
import { imageModelsWithLocksForPlan } from '@/lib/studioPlan';

const STYLE_OPTIONS = ['None', 'Watercolor', 'Oil Painting', 'Sketch', 'Pixel Art', 'Impressionist', 'Minimalist'];

const IMAGE_MODELS_ALL: ModelOption[] = [
    { value: 'flux-dev',         label: 'FLUX Dev',          badge: 'DEFAULT',  badgeColor: '#0a84ff', desc: 'Best product identity & fire scene preservation',  credits: 8  },
    { value: 'flux-kontext',     label: 'FLUX Kontext',       badge: 'ADVANCED', badgeColor: '#f59e0b', desc: 'Context-aware editing · strong identity lock',     credits: 8  },
    { value: 'flux-2-pro-edit',  label: 'FLUX 2 Pro Edit',    badge: 'NEWEST',   badgeColor: '#a855f7', desc: 'Latest FLUX editing · highest quality edits',      credits: 11 },
    { value: 'nano-banana',      label: 'Nano Banana v1',     badge: 'FAST',     badgeColor: '#10b981', desc: 'Quick & affordable · Google Imagen diffusion',     credits: 8  },
    { value: 'nano-banana-2',    label: 'Nano Banana 2',      badge: 'SMART',    badgeColor: '#409cff', desc: 'Reasoning-guided · complex scenes · 4K',           credits: 8  },
    { value: 'nano-banana-pro',  label: 'Nano Banana Pro',    badge: 'PRO',      badgeColor: '#f97316', desc: 'Google Imagen Pro · best nano quality',            credits: 10 },
    { value: 'seedream-45-edit', label: 'Seedream 4.5 Edit',  badge: 'BYTEDANCE',badgeColor: '#ec4899', desc: 'ByteDance Seedream · photorealistic edits',        credits: 8  },
];

interface ToggleOption {
    key: 'enhance' | 'bgRemove' | 'heroCinematic';
    icon: ReactNode;
    short: string;
}

interface Props {
    onGenerate: (data: {
        image: File;
        prompt: string;
        enhance: boolean;
        bgRemove: boolean;
        style: string;
        heroCinematic: boolean;
        model: string;
        ratio: string;
    }) => void;
    loading: boolean;
}

function cycleStr(arr: string[], current: string): string {
    const i = arr.indexOf(current);
    return arr[(i + 1) % arr.length];
}

export default function ImageToImage({ onGenerate, loading }: Props) {
    const { user } = useAuth();
    const [image, setImage] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [enhance, setEnhance] = useState(false);
    const [bgRemove, setBgRemove] = useState(false);
    const [style, setStyle] = useState('None');
    const [heroCinematic, setHeroCinematic] = useState(true);
    const [model, setModel] = useState('flux-dev');
    const [ratio, setRatio] = useState('1:1');
    const [comparePos, setComparePos] = useState(50);

    const toggleMap: Record<string, [boolean, (v: boolean) => void]> = {
        enhance: [enhance, setEnhance],
        bgRemove: [bgRemove, setBgRemove],
        heroCinematic: [heroCinematic, setHeroCinematic],
    };

    const TOGGLES: ToggleOption[] = [
        { key: 'enhance',       icon: <Sparkles size={14} />, short: 'Enhance' },
        { key: 'bgRemove',      icon: <Scissors size={14} />, short: 'Cutout' },
        { key: 'heroCinematic', icon: <Camera size={14} />, short: 'Hero cam' },
    ];

    const onDrop = useCallback((files: File[]) => {
        if (files[0]) {
            setImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(files[0]); });
            setImage(files[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop, accept: { 'image/*': [] }, maxFiles: 1,
    });

    const clearImage = () => {
        setImage(null);
        setImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    };

    const imageModels = useMemo(() => imageModelsWithLocksForPlan(user?.plan, IMAGE_MODELS_ALL), [user?.plan]);

    useEffect(() => {
        const cur = imageModels.find((m) => m.value === model);
        if (!cur || cur.disabled) {
            const first = imageModels.find((m) => !m.disabled);
            if (first) setModel(first.value);
        }
    }, [imageModels, model]);

    const canGenerate = !loading && !!image;
    const credits = useMemo(() => {
        const m = imageModels.find((row) => row.value === model && !row.disabled);
        return m?.credits ?? imageModels.find((row) => !row.disabled)?.credits ?? 8;
    }, [imageModels, model]);

    const runGenerate = () => {
        if (image) onGenerate({ image, prompt, enhance, bgRemove, style, heroCinematic, model, ratio });
    };

    const sourceChipLabel = image
        ? (image.name.length > 18 ? `${image.name.slice(0, 16)}…` : image.name)
        : 'Start frame';

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {imageUrl && (
                <div style={{
                    position: 'relative',
                    borderRadius: 16,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: '#141414',
                }}>
                    <div
                        style={{ height: 112, position: 'relative', cursor: 'col-resize' }}
                        onMouseMove={e => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setComparePos(Math.round(((e.clientX - rect.left) / rect.width) * 100));
                        }}
                    >
                        <img src={imageUrl} alt="Source" style={{ width: '100%', height: 112, objectFit: 'cover', display: 'block' }} />
                        <div style={{
                            position: 'absolute', top: 0, left: 0,
                            right: `${100 - comparePos}%`, bottom: 0,
                            background: 'rgba(255,255,255,0.06)',
                            backdropFilter: 'saturate(1.15)',
                            pointerEvents: 'none', transition: 'right 0.04s',
                        }} />
                        <div style={{
                            position: 'absolute', top: '50%', left: `${comparePos}%`,
                            transform: 'translate(-50%, -50%)',
                            width: 2, height: '100%', background: '#0a84ff',
                        }}>
                            <div style={{
                                position: 'absolute', top: '50%', left: '50%',
                                transform: 'translate(-50%, -50%)',
                                background: '#0a84ff', borderRadius: 99, padding: '3px 6px',
                                display: 'flex', alignItems: 'center',
                            }}>
                                <ArrowLeftRight size={11} color="#fff" />
                            </div>
                        </div>
                        <span style={badgeStyle('left')}>Before</span>
                        <span style={badgeStyle('right', 'rgba(255,255,255,0.2)')}>After</span>
                    </div>
                    <button type="button" onClick={clearImage} style={clearBtnStyle} aria-label="Remove image">
                        <X size={12} />
                    </button>
                </div>
            )}

            <KreaDockRoot>
                <KreaDockPrompt
                    rows={3}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Guide the edit (optional)- e.g. BMW M4 with flames, dark asphalt…"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            runGenerate();
                        }
                    }}
                />
                <div className="section-label" style={{ marginTop: 2, marginBottom: 6 }}>
                    Aspect ratio
                </div>
                <AspectRatioSelector value={ratio} onChange={setRatio} />
                <KreaDockToolbar>
                    <KreaDockChipRow>
                        <div
                            {...getRootProps()}
                            className="krea-dock-chip"
                            style={{ cursor: 'pointer' }}
                            data-on={image ? 'true' : undefined}
                        >
                            <input {...getInputProps()} />
                            {isDragActive ? <Upload size={14} /> : <ImageIcon size={14} strokeWidth={1.75} />}
                            {sourceChipLabel}
                        </div>
                        <ModelDropdown models={imageModels} value={model} onChange={setModel} label="" variant="dock" />
                        <button
                            type="button"
                            className="krea-dock-chip"
                            title="Style transfer"
                            onClick={() => setStyle(s => cycleStr(STYLE_OPTIONS, s))}
                        >
                            {style === 'None' ? 'Style' : style}
                        </button>
                        {TOGGLES.map(t => {
                            const [val, setVal] = toggleMap[t.key];
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    className="krea-dock-chip"
                                    data-on={val ? 'true' : undefined}
                                    title={t.short}
                                    onClick={() => setVal(!val)}
                                >
                                    {t.icon}
                                    {t.short}
                                </button>
                            );
                        })}
                    </KreaDockChipRow>
                    <KreaDockSubmit
                        disabled={!canGenerate}
                        loading={loading}
                        onClick={runGenerate}
                        title={`Transform (${credits} credits)`}
                    />
                </KreaDockToolbar>
            </KreaDockRoot>
        </div>
    );
}

function badgeStyle(side: 'left' | 'right', bg = 'rgba(0,0,0,0.4)'): CSSProperties {
    return {
        position: 'absolute', top: 8, [side]: 8,
        fontSize: 9, fontWeight: 700, color: '#fff',
        background: bg, padding: '2px 7px', borderRadius: 4,
        backdropFilter: 'blur(4px)', letterSpacing: '0.04em',
        textTransform: 'uppercase',
    };
}

const clearBtnStyle: CSSProperties = {
    position: 'absolute', top: 8, right: 8,
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
    border: 'none', borderRadius: 99, width: 26, height: 26,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#fff', zIndex: 2,
};
