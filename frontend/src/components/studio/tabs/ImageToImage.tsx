'use client';

import { useState, useCallback } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Upload, Wand2, X, ArrowLeftRight,
    Sparkles, Scissors, Camera, Cpu, Palette,
    CheckCircle2,
} from 'lucide-react';

/* ─── Constants ─────────────────────────────────────────────── */
const STYLE_OPTIONS = [
    'None', 'Watercolor', 'Oil Painting', 'Sketch',
    'Pixel Art', 'Impressionist', 'Minimalist',
];

const IMAGE_MODELS = [
    {
        value: 'flux-dev',
        label: 'Flux Dev',
        badge: 'DEFAULT',
        badgeColor: 'var(--accent)',
        desc: 'Best product identity preservation & fire scenes',
        price: '~$0.055/img',
    },
    {
        value: 'nano-banana',
        label: 'Nano Banana v1',
        badge: 'FAST',
        badgeColor: '#10b981',
        desc: 'Quick & affordable · Google Imagen diffusion',
        price: '$0.039/img',
    },
    {
        value: 'nano-banana-2',
        label: 'Nano Banana 2',
        badge: 'BEST',
        badgeColor: '#f59e0b',
        desc: 'Reasoning-guided · complex fire/env scenes · 4K',
        price: '$0.08/img',
    },
];

interface ToggleOption {
    key: 'enhance' | 'bgRemove' | 'heroCinematic';
    icon: ReactNode;
    label: string;
    desc: string;
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
    }) => void;
    loading: boolean;
}

/* ─── Component ─────────────────────────────────────────────── */
export default function ImageToImage({ onGenerate, loading }: Props) {
    const [image, setImage] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [enhance, setEnhance] = useState(false);
    const [bgRemove, setBgRemove] = useState(false);
    const [style, setStyle] = useState('None');
    const [heroCinematic, setHeroCinematic] = useState(true);
    const [model, setModel] = useState('flux-dev');
    const [comparePos, setComparePos] = useState(50);

    const toggleMap: Record<string, [boolean, (v: boolean) => void]> = {
        enhance: [enhance, setEnhance],
        bgRemove: [bgRemove, setBgRemove],
        heroCinematic: [heroCinematic, setHeroCinematic],
    };

    const TOGGLES: ToggleOption[] = [
        {
            key: 'enhance',
            icon: <Sparkles size={15} />,
            label: 'Enhance Quality',
            desc: 'Sharpen details and boost realism after generation',
        },
        {
            key: 'bgRemove',
            icon: <Scissors size={15} />,
            label: 'Remove Background',
            desc: 'Auto-cut product from its original background first',
        },
        {
            key: 'heroCinematic',
            icon: <Camera size={15} />,
            label: 'Cinematic Hero Camera',
            desc: 'AI adjusts viewpoint (low front, head-on, ¾) for fire-poster shots — turn off to paste cutout on plate only',
        },
    ];

    const onDrop = useCallback((files: File[]) => {
        if (files[0]) {
            setImage(files[0]);
            setImageUrl(URL.createObjectURL(files[0]));
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop, accept: { 'image/*': [] }, maxFiles: 1,
    });

    const clearImage = () => { setImage(null); setImageUrl(null); };

    const canGenerate = !loading && !!image;

    return (
        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── 1. Upload ─────────────────────────────────────── */}
            <div className="card" style={{ padding: 20 }}>
                <label className="text-label" style={{ display: 'block', marginBottom: 12 }}>
                    Source Image
                </label>
                {!imageUrl ? (
                    <div
                        {...getRootProps()}
                        className={`dropzone ${isDragActive ? 'active' : ''}`}
                        style={{ height: 190, gap: 12 }}
                    >
                        <input {...getInputProps()} />
                        <div style={{
                            width: 52, height: 52, borderRadius: 14,
                            background: 'var(--bg-accent-soft)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Upload size={22} color="var(--accent)" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                                Drop image here
                            </div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                                or click to browse · PNG, JPG, WEBP
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{
                        position: 'relative', borderRadius: 12, overflow: 'hidden',
                        border: '1px solid var(--border)',
                    }}>
                        <div
                            className="compare-container"
                            style={{ height: 210 }}
                            onMouseMove={e => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setComparePos(Math.round(((e.clientX - rect.left) / rect.width) * 100));
                            }}
                        >
                            <img
                                src={imageUrl}
                                alt="Original"
                                style={{ width: '100%', height: 210, objectFit: 'cover', display: 'block' }}
                            />
                            <div style={{
                                position: 'absolute', top: 0, left: 0,
                                right: `${100 - comparePos}%`, bottom: 0,
                                background: 'rgba(99,102,241,0.12)',
                                backdropFilter: 'saturate(1.6)',
                                pointerEvents: 'none', transition: 'right 0.05s',
                            }} />
                            <div style={{
                                position: 'absolute', top: '50%', left: `${comparePos}%`,
                                transform: 'translate(-50%, -50%)',
                                width: 2, height: '100%',
                                background: 'var(--accent)',
                                boxShadow: '0 0 8px rgba(99,102,241,0.5)',
                            }}>
                                <div style={{
                                    position: 'absolute', top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    background: 'var(--accent)', borderRadius: 99,
                                    padding: '4px 8px',
                                    display: 'flex', alignItems: 'center',
                                }}>
                                    <ArrowLeftRight size={13} color="#fff" />
                                </div>
                            </div>
                            <span style={badgeStyle('left')}>BEFORE</span>
                            <span style={badgeStyle('right', 'rgba(99,102,241,0.75)')}>AFTER</span>
                        </div>
                        <button onClick={clearImage} style={clearBtnStyle}>
                            <X size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── 2. Transform Settings ─────────────────────────── */}
            <SectionCard title="Transform Settings" icon={<Wand2 size={14} />}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {TOGGLES.map((t, i) => {
                        const [val, setVal] = toggleMap[t.key];
                        return (
                            <div key={t.key}>
                                <div
                                    style={{
                                        display: 'flex', alignItems: 'flex-start',
                                        justifyContent: 'space-between',
                                        gap: 12, padding: '13px 0',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => setVal(!val)}
                                >
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
                                        <div style={{
                                            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                                            background: val ? 'var(--bg-accent-soft)' : 'var(--bg-subtle)',
                                            border: `1px solid ${val ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: val ? 'var(--accent)' : 'var(--text-muted)',
                                            transition: 'all 0.2s',
                                        }}>
                                            {t.icon}
                                        </div>
                                        <div>
                                            <div style={{
                                                fontSize: 13.5, fontWeight: 600,
                                                color: 'var(--text-primary)', lineHeight: 1.3,
                                            }}>
                                                {t.label}
                                            </div>
                                            <div style={{
                                                fontSize: 12, color: 'var(--text-muted)',
                                                marginTop: 3, lineHeight: 1.45, maxWidth: 280,
                                            }}>
                                                {t.desc}
                                            </div>
                                        </div>
                                    </div>
                                    <ToggleSwitch value={val} onChange={setVal} />
                                </div>
                                {i < TOGGLES.length - 1 && (
                                    <div style={{ height: 1, background: 'var(--border)', margin: '0' }} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </SectionCard>

            {/* ── 3. AI Model ───────────────────────────────────── */}
            <SectionCard title="AI Model" icon={<Cpu size={14} />}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {IMAGE_MODELS.map(m => {
                        const active = model === m.value;
                        return (
                            <button
                                key={m.value}
                                onClick={() => setModel(m.value)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '12px 14px', borderRadius: 10,
                                    cursor: 'pointer', textAlign: 'left', width: '100%',
                                    border: active
                                        ? '2px solid var(--accent)'
                                        : '1.5px solid var(--border)',
                                    background: active ? 'var(--bg-accent-soft)' : 'var(--bg-subtle)',
                                    fontFamily: 'inherit',
                                    transition: 'all 0.18s cubic-bezier(0.16,1,0.3,1)',
                                }}
                            >
                                {/* Selection indicator */}
                                <div style={{
                                    width: 18, height: 18, borderRadius: 99, flexShrink: 0,
                                    border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                                    background: active ? 'var(--accent)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.18s',
                                }}>
                                    {active && <div style={{ width: 6, height: 6, borderRadius: 99, background: '#fff' }} />}
                                </div>

                                {/* Text */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                                        <span style={{
                                            fontSize: 13.5, fontWeight: 700,
                                            color: active ? 'var(--accent)' : 'var(--text-primary)',
                                        }}>
                                            {m.label}
                                        </span>
                                        <span style={{
                                            fontSize: 9.5, fontWeight: 800, letterSpacing: '0.05em',
                                            padding: '2px 6px', borderRadius: 4,
                                            background: `${m.badgeColor}20`,
                                            color: m.badgeColor,
                                            border: `1px solid ${m.badgeColor}40`,
                                        }}>
                                            {m.badge}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                        {m.desc}
                                    </div>
                                </div>

                                {/* Price */}
                                <div style={{
                                    fontSize: 11, fontWeight: 700,
                                    color: active ? 'var(--accent)' : 'var(--text-muted)',
                                    whiteSpace: 'nowrap', flexShrink: 0,
                                }}>
                                    {m.price}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </SectionCard>

            {/* ── 4. Style Transfer ─────────────────────────────── */}
            <SectionCard title="Style Transfer" icon={<Palette size={14} />}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {STYLE_OPTIONS.map(s => (
                        <button
                            key={s}
                            onClick={() => setStyle(s)}
                            className={`pill ${style === s ? 'active' : ''}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </SectionCard>

            {/* ── 5. Guide Prompt ───────────────────────────────── */}
            <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <label className="text-label">Guide Prompt</label>
                    <span style={{
                        fontSize: 10, color: 'var(--text-muted)',
                        background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                        padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                    }}>
                        OPTIONAL
                    </span>
                </div>
                <textarea
                    className="studio-input"
                    rows={3}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="e.g. BMW M4 with flames and smoke, dark asphalt, add metallic BRAND watermark"
                />
            </div>

            {/* ── 6. Generate Button ────────────────────────────── */}
            <button
                className="btn-primary"
                onClick={() => image && onGenerate({ image, prompt, enhance, bgRemove, style, heroCinematic, model })}
                disabled={!canGenerate}
                style={{ opacity: canGenerate ? 1 : 0.5 }}
            >
                {loading ? (
                    <>
                        <span style={spinnerStyle} />
                        Processing...
                    </>
                ) : (
                    <>
                        <CheckCircle2 size={16} />
                        Transform Image
                    </>
                )}
            </button>

            {!image && (
                <p style={{
                    textAlign: 'center', fontSize: 12, color: 'var(--text-muted)',
                    margin: '-8px 0 0', lineHeight: 1.5,
                }}>
                    Upload a source image above to get started
                </p>
            )}
        </div>
    );
}

/* ─── Sub-components ────────────────────────────────────────── */

function SectionCard({ title, icon, children }: {
    title: string;
    icon: ReactNode;
    children: ReactNode;
}) {
    return (
        <div className="card" style={{ padding: 20 }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                marginBottom: 14,
            }}>
                <span style={{ color: 'var(--accent)', display: 'flex', alignItems: 'center' }}>
                    {icon}
                </span>
                <span className="text-label">{title}</span>
            </div>
            {children}
        </div>
    );
}

function ToggleSwitch({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div
            onClick={e => { e.stopPropagation(); onChange(!value); }}
            role="switch"
            aria-checked={value}
            style={{
                width: 42, height: 24, borderRadius: 99, flexShrink: 0,
                background: value ? 'var(--accent)' : 'var(--bg-muted)',
                border: `1.5px solid ${value ? 'var(--accent)' : 'var(--border)'}`,
                position: 'relative', cursor: 'pointer',
                transition: 'all 0.22s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: value ? '0 0 10px rgba(99,102,241,0.35)' : 'none',
            }}
        >
            <div style={{
                position: 'absolute',
                top: 2, left: value ? 20 : 2,
                width: 16, height: 16, borderRadius: 99,
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                transition: 'left 0.22s cubic-bezier(0.16,1,0.3,1)',
            }} />
        </div>
    );
}

/* ─── Style helpers ─────────────────────────────────────────── */
function badgeStyle(side: 'left' | 'right', bg = 'rgba(0,0,0,0.45)'): CSSProperties {
    return {
        position: 'absolute', top: 8,
        [side]: 8,
        fontSize: 10, fontWeight: 700, color: '#fff',
        background: bg, padding: '3px 8px', borderRadius: 5,
        backdropFilter: 'blur(4px)', letterSpacing: '0.04em',
    };
}

const clearBtnStyle: CSSProperties = {
    position: 'absolute', top: 10, right: 10,
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 99, width: 30, height: 30,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: '#fff',
};

const spinnerStyle: CSSProperties = {
    width: 15, height: 15, borderRadius: 99,
    border: '2.5px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
};
