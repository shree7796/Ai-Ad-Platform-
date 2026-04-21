'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Video, X, Zap, ArrowRight, Lock, Unlock } from 'lucide-react';
import ModelDropdown, { ModelOption } from '@/components/studio/ModelDropdown';

const MODEL_BASE_CREDITS: Record<string, number> = {
    kling_standard:         10,
    kling_pro:              98,
    kling_21_pro:           98,
    kling_21_master:        60,
    kling_26_pro:           98,
    kling_30_pro:           140,
    seedance_fast:          242,
    seedance_standard:      160,
    seedance_ref:           160,
    seedance_fast_ref:      242,
    pixverse_v6:            50,
    pixverse_c1:            40,
    pixverse_c1_transition: 40,
    minimax:                110,
    wan:                    100,
    luma:                   35,
};

function estimateVideoCredits(durationStr: string, modelValue: string): number {
    const durationSec = Math.max(1, parseInt(durationStr, 10) || 5);
    const base = MODEL_BASE_CREDITS[modelValue] ?? MODEL_BASE_CREDITS['kling_21_pro'];
    const clips = Math.max(1, Math.ceil(durationSec / 5));
    return base * clips;
}

const DURATIONS = ['3s', '5s', '10s'];

const VIDEO_MODELS: ModelOption[] = [
    { value: 'kling_pro',         label: 'Kling v1.6 Pro',      badge: 'STANDARD',  badgeColor: '#6366f1', desc: 'Reliable quality · 720p output',               credits: MODEL_BASE_CREDITS.kling_pro,         creditsSuffix: '/5s' },
    { value: 'kling_21_pro',      label: 'Kling 2.1 Pro',       badge: 'SHARP',     badgeColor: '#8b5cf6', desc: 'Improved detail · 720p',                        credits: MODEL_BASE_CREDITS.kling_21_pro,      creditsSuffix: '/5s' },
    { value: 'kling_26_pro',      label: 'Kling 2.6 Pro 🔊',    badge: 'AUDIO',     badgeColor: '#06b6d4', desc: 'Native audio · improved motion',                credits: MODEL_BASE_CREDITS.kling_26_pro,      creditsSuffix: '/5s' },
    { value: 'kling_30_pro',      label: 'Kling 3.0 Pro 🔊',    badge: 'NEWEST',    badgeColor: '#f59e0b', desc: 'Latest Kling · audio · best quality',           credits: MODEL_BASE_CREDITS.kling_30_pro,      creditsSuffix: '/5s' },
    { value: 'pixverse_v6',       label: 'PixVerse V6 🔊',       badge: '1080P',     badgeColor: '#10b981', desc: '1080p · native audio · smooth motion',          credits: MODEL_BASE_CREDITS.pixverse_v6,       creditsSuffix: '/5s' },
    { value: 'pixverse_c1',       label: 'PixVerse C1 🔊',       badge: 'CINEMATIC', badgeColor: '#14b8a6', desc: 'Cinematic 1080p · native audio',                credits: MODEL_BASE_CREDITS.pixverse_c1,       creditsSuffix: '/5s' },
    { value: 'seedance_standard', label: 'Seedance 2.0 🔊',      badge: 'AUDIO',     badgeColor: '#ec4899', desc: 'ByteDance · audio · director camera',           credits: MODEL_BASE_CREDITS.seedance_standard, creditsSuffix: '/5s' },
    { value: 'seedance_fast',     label: 'Seedance 2.0 Fast 🔊', badge: 'FAST',      badgeColor: '#84cc16', desc: 'Fast generation · audio included',              credits: MODEL_BASE_CREDITS.seedance_fast,     creditsSuffix: '/5s' },
    { value: 'luma',              label: 'Luma Dream Machine',   badge: 'SMOOTH',    badgeColor: '#a78bfa', desc: 'Cinematic smooth motion',                       credits: MODEL_BASE_CREDITS.luma,              creditsSuffix: '/5s' },
    { value: 'wan',               label: 'Wan v2.6',             badge: '1080P',     badgeColor: '#0ea5e9', desc: 'High resolution · up to 15s',                   credits: MODEL_BASE_CREDITS.wan,               creditsSuffix: '/5s' },
    { value: 'minimax',           label: 'MiniMax Video-01',     badge: 'PRECISE',   badgeColor: '#f97316', desc: 'Precise prompt following',                      credits: MODEL_BASE_CREDITS.minimax,           creditsSuffix: '/5s' },
];

/** These models require a reference / end-frame image — only shown when referenceImage is set. */
const REFERENCE_MODELS: ModelOption[] = [
    { value: 'pixverse_c1_transition', label: 'PixVerse C1 Transition 🔊', badge: 'MORPH',   badgeColor: '#14b8a6', desc: 'Cinematic morph · start → end frame · 1080p · audio', credits: MODEL_BASE_CREDITS.pixverse_c1_transition, creditsSuffix: '/5s' },
    { value: 'seedance_ref',           label: 'Seedance 2.0 Ref 🔊',       badge: 'REF',     badgeColor: '#ec4899', desc: 'ByteDance reference-guided generation · audio',        credits: MODEL_BASE_CREDITS.seedance_ref,           creditsSuffix: '/5s' },
    { value: 'seedance_fast_ref',      label: 'Seedance Fast Ref 🔊',       badge: 'FAST·REF',badgeColor: '#84cc16', desc: 'Fast reference-guided generation · audio',             credits: MODEL_BASE_CREDITS.seedance_fast_ref,      creditsSuffix: '/5s' },
];

const _REFERENCE_MODEL_VALUES = new Set(REFERENCE_MODELS.map(m => m.value));

interface Props {
    onGenerate: (data: { image: File; motion: number; duration: string; prompt: string; videoModel: string; referenceImage?: File | null }) => void;
    loading: boolean;
}

export default function ImageToVideo({ onGenerate, loading }: Props) {
    const [image, setImage] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [refImage, setRefImage] = useState<File | null>(null);
    const [refImageUrl, setRefImageUrl] = useState<string | null>(null);
    const [motion, setMotion] = useState(50);
    const [duration, setDuration] = useState('5s');
    const [prompt, setPrompt] = useState('');
    const [videoModel, setVideoModel] = useState('kling_pro');

    // When reference image is removed, auto-switch away from reference-only models
    const clearRefImage = useCallback(() => {
        setRefImage(null);
        setRefImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
        if (_REFERENCE_MODEL_VALUES.has(videoModel)) setVideoModel('kling_pro');
    }, [videoModel]);

    const allModels: ModelOption[] = refImage
        ? [...REFERENCE_MODELS, ...VIDEO_MODELS]
        : VIDEO_MODELS;

    const estimatedCredits = useMemo(() => estimateVideoCredits(duration, videoModel), [duration, videoModel]);

    const onDrop = useCallback((files: File[]) => {
        if (files[0]) {
            setImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(files[0]); });
            setImage(files[0]);
        }
    }, []);

    const onRefDrop = useCallback((files: File[]) => {
        if (files[0]) {
            setRefImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(files[0]); });
            setRefImage(files[0]);
            // Auto-select the most intuitive reference model so users don't have to hunt
            setVideoModel(prev => _REFERENCE_MODEL_VALUES.has(prev) ? prev : 'pixverse_c1_transition');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop, accept: { 'image/*': [] }, maxFiles: 1,
    });

    const { getRootProps: getRefRootProps, getInputProps: getRefInputProps, isDragActive: isRefDragActive } = useDropzone({
        onDrop: onRefDrop, accept: { 'image/*': [] }, maxFiles: 1,
    });

    const isRefModel = _REFERENCE_MODEL_VALUES.has(videoModel);

    const motionLabel = motion < 30 ? 'Subtle' : motion < 65 ? 'Medium' : 'Dynamic';
    const motionColor = motion < 30 ? '#10b981' : motion < 65 ? '#f59e0b' : '#ef4444';

    return (
        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Two-panel image card: Start Frame + End Frame ─────────────── */}
            <div className="card" style={{ padding: 20 }}>

                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <label className="text-label" style={{ margin: 0 }}>Images</label>
                    {refImage ? (
                        <span style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                            padding: '3px 8px', borderRadius: 6,
                            background: 'rgba(20,184,166,0.12)', color: '#14b8a6',
                            border: '1px solid rgba(20,184,166,0.3)',
                        }}>
                            <Unlock size={10} />
                            3 extra models unlocked
                        </span>
                    ) : (
                        <span style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
                            padding: '3px 8px', borderRadius: 6,
                            background: 'rgba(99,102,241,0.08)', color: 'var(--text-muted)',
                            border: '1px solid var(--border)',
                        }}>
                            <Lock size={10} />
                            Add end frame to unlock transition models
                        </span>
                    )}
                </div>

                {/* Two panels side by side */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>

                    {/* ── Panel 1: Start Frame (required) ── */}
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 7 }}>
                            Start Frame <span style={{ color: '#ef4444' }}>*</span>
                        </div>
                        {!imageUrl ? (
                            <div
                                {...getRootProps()}
                                className={`dropzone ${isDragActive ? 'active' : ''}`}
                                style={{ height: 150, gap: 8, borderRadius: 10, padding: '10px 6px' }}
                            >
                                <input {...getInputProps()} />
                                <div style={{
                                    width: 38, height: 38, borderRadius: 10,
                                    background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Upload size={18} color="var(--accent)" />
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>Upload image</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>PNG · JPG · WEBP</div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '2px solid var(--accent)', height: 150 }}>
                                <img src={imageUrl} alt="Start" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
                                    padding: '14px 8px 6px',
                                }}>
                                    <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>Start Frame</span>
                                </div>
                                <button onClick={() => { setImage(null); setImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; }); }} style={{
                                    position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.55)',
                                    border: 'none', borderRadius: 99, width: 24, height: 24,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                }}>
                                    <X size={11} color="#fff" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* ── Arrow connector ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 99,
                            background: refImage ? 'rgba(20,184,166,0.12)' : 'var(--bg-subtle)',
                            border: `1.5px solid ${refImage ? 'rgba(20,184,166,0.4)' : 'var(--border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.25s',
                        }}>
                            <ArrowRight size={14} color={refImage ? '#14b8a6' : 'var(--text-muted)'} />
                        </div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                            VIDEO
                        </span>
                    </div>

                    {/* ── Panel 2: End Frame (optional) ── */}
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', color: refImage ? '#14b8a6' : 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                            End Frame
                            <span style={{
                                fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 3,
                                background: 'rgba(139,92,246,0.12)', color: '#8b5cf6',
                                border: '1px solid rgba(139,92,246,0.25)',
                            }}>OPTIONAL</span>
                        </div>
                        {!refImageUrl ? (
                            <div
                                {...getRefRootProps()}
                                className={`dropzone ${isRefDragActive ? 'active' : ''}`}
                                style={{
                                    height: 150, gap: 8, borderRadius: 10, padding: '10px 6px',
                                    borderStyle: 'dashed',
                                    borderColor: isRefDragActive ? '#14b8a6' : 'rgba(139,92,246,0.4)',
                                    background: isRefDragActive ? 'rgba(20,184,166,0.05)' : 'rgba(139,92,246,0.03)',
                                }}
                            >
                                <input {...getRefInputProps()} />
                                <div style={{
                                    width: 38, height: 38, borderRadius: 10,
                                    background: 'rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    <Upload size={18} color="#8b5cf6" />
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 3 }}>End / Reference</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                        Transition or<br />reference style
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '2px solid #14b8a6', height: 150 }}>
                                <img src={refImageUrl} alt="End" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                <div style={{
                                    position: 'absolute', bottom: 0, left: 0, right: 0,
                                    background: 'linear-gradient(to top, rgba(0,0,0,0.65), transparent)',
                                    padding: '14px 8px 6px',
                                }}>
                                    <span style={{ fontSize: 10, color: '#5eead4', fontWeight: 600 }}>End / Reference</span>
                                </div>
                                <button
                                    onClick={() => { clearRefImage(); }}
                                    style={{
                                        position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.55)',
                                        border: 'none', borderRadius: 99, width: 24, height: 24,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                    }}
                                >
                                    <X size={11} color="#fff" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* What do you want to do? — shown only when ref image is uploaded */}
                {refImage && (
                    <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                            What do you want to do?
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

                            {/* Option A — Transition */}
                            <button
                                type="button"
                                onClick={() => setVideoModel('pixverse_c1_transition')}
                                style={{
                                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                                    textAlign: 'left', fontFamily: 'inherit',
                                    border: videoModel === 'pixverse_c1_transition'
                                        ? '2px solid #14b8a6'
                                        : '1.5px solid var(--border)',
                                    background: videoModel === 'pixverse_c1_transition'
                                        ? 'rgba(20,184,166,0.08)'
                                        : 'var(--bg-subtle)',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <div style={{ fontSize: 18, marginBottom: 6 }}>🎬</div>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: videoModel === 'pixverse_c1_transition' ? '#14b8a6' : 'var(--text-primary)', marginBottom: 4 }}>
                                    Morph / Transition
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                    Video smoothly morphs from my <strong>start image</strong> to the <strong>end image</strong>
                                </div>
                                <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: '#14b8a6' }}>
                                    → PixVerse C1 Transition
                                </div>
                            </button>

                            {/* Option B — Reference Style */}
                            <button
                                type="button"
                                onClick={() => setVideoModel('seedance_ref')}
                                style={{
                                    padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                                    textAlign: 'left', fontFamily: 'inherit',
                                    border: (videoModel === 'seedance_ref' || videoModel === 'seedance_fast_ref')
                                        ? '2px solid #ec4899'
                                        : '1.5px solid var(--border)',
                                    background: (videoModel === 'seedance_ref' || videoModel === 'seedance_fast_ref')
                                        ? 'rgba(236,72,153,0.07)'
                                        : 'var(--bg-subtle)',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <div style={{ fontSize: 18, marginBottom: 6 }}>🎨</div>
                                <div style={{ fontSize: 12.5, fontWeight: 700, color: (videoModel === 'seedance_ref' || videoModel === 'seedance_fast_ref') ? '#ec4899' : 'var(--text-primary)', marginBottom: 4 }}>
                                    Reference Style
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                    Video is generated guided by the <strong>style & look</strong> of the reference image
                                </div>
                                <div style={{ marginTop: 8, fontSize: 10, fontWeight: 700, color: '#ec4899' }}>
                                    → Seedance 2.0 Reference
                                </div>
                            </button>
                        </div>

                        {/* Fast variant hint for Seedance */}
                        {(videoModel === 'seedance_ref' || videoModel === 'seedance_fast_ref') && (
                            <div style={{
                                marginTop: 8, padding: '8px 12px', borderRadius: 8,
                                background: 'rgba(236,72,153,0.06)', border: '1px solid rgba(236,72,153,0.2)',
                                fontSize: 11.5, color: 'var(--text-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}>
                                <span>Want faster results at higher cost?</span>
                                <button
                                    type="button"
                                    onClick={() => setVideoModel(videoModel === 'seedance_fast_ref' ? 'seedance_ref' : 'seedance_fast_ref')}
                                    style={{
                                        fontSize: 11, fontWeight: 700, cursor: 'pointer',
                                        color: '#ec4899', background: 'none', border: 'none',
                                        padding: 0, fontFamily: 'inherit',
                                    }}
                                >
                                    Switch to {videoModel === 'seedance_fast_ref' ? 'Standard (⚡160 cr/5s)' : 'Fast (⚡242 cr/5s)'}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Hint when no ref image yet */}
                {!refImage && (
                    <div style={{
                        marginTop: 14, padding: '9px 12px', borderRadius: 8,
                        background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                        fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6,
                    }}>
                        Upload an <strong style={{ color: 'var(--text-secondary)' }}>End Frame</strong> above to unlock two extra generation modes:
                        {' '}<strong style={{ color: 'var(--text-secondary)' }}>Morph / Transition</strong> and <strong style={{ color: 'var(--text-secondary)' }}>Reference Style</strong>.
                    </div>
                )}
            </div>

            {/* Motion control */}
            <div className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <label className="text-label">Motion Intensity</label>
                    <span style={{
                        fontSize: 12, fontWeight: 600, color: motionColor,
                        background: `${motionColor}18`, padding: '3px 10px', borderRadius: 99,
                    }}>{motionLabel}</span>
                </div>
                <input type="range" min={0} max={100} value={motion} onChange={e => setMotion(Number(e.target.value))} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Low</span>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>High</span>
                </div>
            </div>

            {/* Duration */}
            <div className="card" style={{ padding: 20 }}>
                <label className="text-label" style={{ display: 'block', marginBottom: 12 }}>Duration</label>
                <div style={{ display: 'flex', gap: 8 }}>
                    {DURATIONS.map(d => (
                        <button
                            key={d}
                            onClick={() => setDuration(d)}
                            className={`pill ${duration === d ? 'active' : ''}`}
                            style={{ flex: 1, justifyContent: 'center' }}
                        >
                            {d}
                        </button>
                    ))}
                </div>
            </div>


            {/* Video Model */}
            <div className="card" style={{ padding: 20 }}>
                <ModelDropdown models={allModels} value={videoModel} onChange={setVideoModel} />
            </div>

            {/* Motion prompt */}
            <div className="card" style={{ padding: 20 }}>
                <label className="text-label" style={{ display: 'block', marginBottom: 10 }}>Motion Style</label>
                <textarea
                    className="studio-input"
                    rows={3}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe the motion... e.g., slow camera pull back with gentle particle drift"
                />
            </div>

            {_REFERENCE_MODEL_VALUES.has(videoModel) && !refImage && (
                <div style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.25)',
                    fontSize: 12.5, color: '#a78bfa', fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 8,
                }}>
                    <Lock size={13} />
                    This model requires an End Frame image. Upload one in the Images section above.
                </div>
            )}

            <button
                className="btn-primary"
                onClick={() => image && onGenerate({ image, motion, duration, prompt, videoModel, referenceImage: refImage })}
                disabled={loading || !image || (_REFERENCE_MODEL_VALUES.has(videoModel) && !refImage)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
                <Video size={16} />
                <span>{loading ? 'Generating Video...' : 'Generate Video'}</span>
                {!loading && (
                    <span style={{
                        marginLeft: 4, fontSize: 12, fontWeight: 700,
                        background: 'rgba(255,255,255,0.15)',
                        padding: '2px 8px', borderRadius: 99,
                        display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                        <Zap size={11} fill="currentColor" />
                        {estimatedCredits} credits
                    </span>
                )}
            </button>
        </div>
    );
}
