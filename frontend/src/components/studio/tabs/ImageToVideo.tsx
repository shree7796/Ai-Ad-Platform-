'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Video, X, ArrowRight, Lock, Unlock, Clock } from 'lucide-react';
import ModelDropdown, { ModelOption } from '@/components/studio/ModelDropdown';
import ChipDropdown, { type ChipOption } from '@/components/studio/ChipDropdown';
import { KreaDockRoot, KreaDockPrompt, KreaDockToolbar, KreaDockChipRow, KreaDockSubmit } from '@/components/studio/KreaDock';

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

const DURATION_OPTIONS: ChipOption[] = [
    { value: '3s',  label: '3s',  desc: 'Short clip · fast generation' },
    { value: '5s',  label: '5s',  desc: 'Standard length clip'         },
    { value: '10s', label: '10s', desc: 'Longer clip · more action'    },
];

const MOTION_OPTIONS: ChipOption[] = [
    { value: '15',  label: 'Subtle',  desc: 'Gentle, minimal movement'     },
    { value: '50',  label: 'Medium',  desc: 'Balanced natural motion'      },
    { value: '85',  label: 'Dynamic', desc: 'High energy, strong movement' },
];

const VIDEO_MODELS: ModelOption[] = [
    { value: 'kling_pro',         label: 'Kling v1.6 Pro',      badge: 'STANDARD',  badgeColor: '#0a84ff', desc: 'Reliable quality · 720p output',               credits: MODEL_BASE_CREDITS.kling_pro,         creditsSuffix: '/5s' },
    { value: 'kling_21_pro',      label: 'Kling 2.1 Pro',       badge: 'SHARP',     badgeColor: '#409cff', desc: 'Improved detail · 720p',                        credits: MODEL_BASE_CREDITS.kling_21_pro,      creditsSuffix: '/5s' },
    { value: 'kling_26_pro',      label: 'Kling 2.6 Pro 🔊',    badge: 'AUDIO',     badgeColor: '#06b6d4', desc: 'Native audio · improved motion',                credits: MODEL_BASE_CREDITS.kling_26_pro,      creditsSuffix: '/5s' },
    { value: 'kling_30_pro',      label: 'Kling 3.0 Pro 🔊',    badge: 'NEWEST',    badgeColor: '#f59e0b', desc: 'Latest Kling · audio · best quality',           credits: MODEL_BASE_CREDITS.kling_30_pro,      creditsSuffix: '/5s' },
    { value: 'pixverse_v6',       label: 'PixVerse V6 🔊',       badge: '1080P',     badgeColor: '#10b981', desc: '1080p · native audio · smooth motion',          credits: MODEL_BASE_CREDITS.pixverse_v6,       creditsSuffix: '/5s' },
    { value: 'pixverse_c1',       label: 'PixVerse C1 🔊',       badge: 'CINEMATIC', badgeColor: '#14b8a6', desc: 'Cinematic 1080p · native audio',                credits: MODEL_BASE_CREDITS.pixverse_c1,       creditsSuffix: '/5s' },
    { value: 'seedance_standard', label: 'Seedance 2.0 🔊',      badge: 'AUDIO',     badgeColor: '#ec4899', desc: 'ByteDance · audio · director camera',           credits: MODEL_BASE_CREDITS.seedance_standard, creditsSuffix: '/5s' },
    { value: 'seedance_fast',     label: 'Seedance 2.0 Fast 🔊', badge: 'FAST',      badgeColor: '#84cc16', desc: 'Fast generation · audio included',              credits: MODEL_BASE_CREDITS.seedance_fast,     creditsSuffix: '/5s' },
    { value: 'luma',              label: 'Luma Dream Machine',   badge: 'SMOOTH',    badgeColor: '#5ac8fa', desc: 'Cinematic smooth motion',                       credits: MODEL_BASE_CREDITS.luma,              creditsSuffix: '/5s' },
    { value: 'wan',               label: 'Wan v2.6',             badge: '1080P',     badgeColor: '#0ea5e9', desc: 'High resolution · up to 15s',                   credits: MODEL_BASE_CREDITS.wan,               creditsSuffix: '/5s' },
    { value: 'minimax',           label: 'MiniMax Video-01',     badge: 'PRECISE',   badgeColor: '#f97316', desc: 'Precise prompt following',                      credits: MODEL_BASE_CREDITS.minimax,           creditsSuffix: '/5s' },
];

const REFERENCE_MODELS: ModelOption[] = [
    { value: 'pixverse_c1_transition', label: 'PixVerse C1 Transition 🔊', badge: 'MORPH',    badgeColor: '#14b8a6', desc: 'Cinematic morph · start → end frame · 1080p · audio', credits: MODEL_BASE_CREDITS.pixverse_c1_transition, creditsSuffix: '/5s' },
    { value: 'seedance_ref',           label: 'Seedance 2.0 Ref 🔊',       badge: 'REF',      badgeColor: '#ec4899', desc: 'ByteDance reference-guided generation · audio',        credits: MODEL_BASE_CREDITS.seedance_ref,           creditsSuffix: '/5s' },
    { value: 'seedance_fast_ref',      label: 'Seedance Fast Ref 🔊',       badge: 'FAST·REF', badgeColor: '#84cc16', desc: 'Fast reference-guided generation · audio',             credits: MODEL_BASE_CREDITS.seedance_fast_ref,      creditsSuffix: '/5s' },
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
            setVideoModel(prev => _REFERENCE_MODEL_VALUES.has(prev) ? prev : 'pixverse_c1_transition');
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': [] }, maxFiles: 1 });
    const { getRootProps: getRefRootProps, getInputProps: getRefInputProps, isDragActive: isRefDragActive } = useDropzone({ onDrop: onRefDrop, accept: { 'image/*': [] }, maxFiles: 1 });

    const isRefModel = _REFERENCE_MODEL_VALUES.has(videoModel);
    const motionValue = motion < 30 ? '15' : motion < 65 ? '50' : '85';
    const handleMotionChange = (v: string) => setMotion(Number(v));

    const dropZoneBase = {
        height: 140, display: 'flex', flexDirection: 'column' as const,
        alignItems: 'center', justifyContent: 'center', gap: 8,
        borderRadius: 'var(--radius-md)', border: '1.5px dashed var(--border-medium)',
        background: 'var(--bg-input)', cursor: 'pointer', transition: 'all 0.15s',
        textAlign: 'center' as const, padding: 12,
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

            {/* ── Images ──────────────────────────────────── */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <label className="section-label" style={{ marginBottom: 0 }}>Images</label>
                    {refImage ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 600, color: '#14b8a6', background: 'rgba(20,184,166,0.1)', padding: '2px 8px', borderRadius: 99 }}>
                            <Unlock size={9} /> 3 transition models unlocked
                        </span>
                    ) : (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, color: 'var(--text-muted)' }}>
                            <Lock size={9} /> Add end frame for transitions
                        </span>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                    {/* Start frame */}
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 6 }}>
                            Start <span style={{ color: '#ef4444' }}>*</span>
                        </div>
                        {!imageUrl ? (
                            <div {...getRootProps()} style={{ ...dropZoneBase, borderColor: isDragActive ? 'var(--accent)' : 'var(--border-medium)', background: isDragActive ? 'rgba(10,132,255,0.06)' : 'var(--bg-input)' }}>
                                <input {...getInputProps()} />
                                <Upload size={16} color={isDragActive ? 'var(--accent)' : 'var(--text-muted)'} />
                                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>Upload image</div>
                                <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>PNG · JPG</div>
                            </div>
                        ) : (
                            <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1.5px solid var(--accent)', height: 140 }}>
                                <img src={imageUrl} alt="Start" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', padding: '12px 8px 5px' }}>
                                    <span style={{ fontSize: 9.5, color: '#fff', fontWeight: 600 }}>Start Frame</span>
                                </div>
                                <button onClick={() => { setImage(null); setImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; }); }} style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 99, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <X size={10} color="#fff" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Arrow */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 99, background: refImage ? 'rgba(20,184,166,0.1)' : 'var(--bg-subtle)', border: `1px solid ${refImage ? 'rgba(20,184,166,0.35)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                            <ArrowRight size={12} color={refImage ? '#14b8a6' : 'var(--text-muted)'} />
                        </div>
                        <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>VIDEO</span>
                    </div>

                    {/* End frame */}
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: refImage ? '#14b8a6' : 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                            End
                            <span style={{ fontSize: 8, fontWeight: 600, padding: '1px 4px', borderRadius: 3, background: 'rgba(10,132,255,0.12)', color: '#409cff' }}>OPT</span>
                        </div>
                        {!refImageUrl ? (
                            <div {...getRefRootProps()} style={{ ...dropZoneBase, borderColor: isRefDragActive ? '#14b8a6' : 'rgba(10,132,255,0.35)', background: isRefDragActive ? 'rgba(20,184,166,0.04)' : 'rgba(10,132,255,0.04)' }}>
                                <input {...getRefInputProps()} />
                                <Upload size={16} color={isRefDragActive ? '#14b8a6' : '#0a84ff'} />
                                <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)' }}>End / Reference</div>
                                <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>Transition or<br />reference style</div>
                            </div>
                        ) : (
                            <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1.5px solid #14b8a6', height: 140 }}>
                                <img src={refImageUrl} alt="End" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', padding: '12px 8px 5px' }}>
                                    <span style={{ fontSize: 9.5, color: '#5eead4', fontWeight: 600 }}>End Frame</span>
                                </div>
                                <button onClick={() => { clearRefImage(); }} style={{ position: 'absolute', top: 5, right: 5, background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 99, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                    <X size={10} color="#fff" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Ref model intent selector */}
                {refImage && (
                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <button type="button" onClick={() => setVideoModel('pixverse_c1_transition')} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', border: videoModel === 'pixverse_c1_transition' ? '1.5px solid #14b8a6' : '1px solid var(--border-medium)', background: videoModel === 'pixverse_c1_transition' ? 'rgba(20,184,166,0.06)' : 'var(--bg-subtle)', transition: 'all 0.15s' }}>
                            <div style={{ fontSize: 16, marginBottom: 4 }}>🎬</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: videoModel === 'pixverse_c1_transition' ? '#14b8a6' : 'var(--text-primary)', marginBottom: 3 }}>Morph / Transition</div>
                            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>Start image morphs to end image</div>
                        </button>
                        <button type="button" onClick={() => setVideoModel('seedance_ref')} style={{ padding: '10px 12px', borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', border: (videoModel === 'seedance_ref' || videoModel === 'seedance_fast_ref') ? '1.5px solid #ec4899' : '1px solid var(--border-medium)', background: (videoModel === 'seedance_ref' || videoModel === 'seedance_fast_ref') ? 'rgba(236,72,153,0.05)' : 'var(--bg-subtle)', transition: 'all 0.15s' }}>
                            <div style={{ fontSize: 16, marginBottom: 4 }}>🎨</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: (videoModel === 'seedance_ref' || videoModel === 'seedance_fast_ref') ? '#ec4899' : 'var(--text-primary)', marginBottom: 3 }}>Reference Style</div>
                            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>Style guided by reference</div>
                        </button>
                    </div>
                )}
            </div>

            {isRefModel && !refImage && (
                <div style={{ padding: '10px 14px', borderRadius: 14, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', fontSize: 12, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Lock size={12} />
                    This model requires an End Frame. Upload one above.
                </div>
            )}

            <KreaDockRoot>
                <KreaDockPrompt
                    rows={3}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe motion and click generate…"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            if (image && !(_REFERENCE_MODEL_VALUES.has(videoModel) && !refImage)) {
                                onGenerate({ image, motion, duration, prompt, videoModel, referenceImage: refImage });
                            }
                        }
                    }}
                />
                <KreaDockToolbar>
                    <KreaDockChipRow>
                        <ModelDropdown models={allModels} value={videoModel} onChange={setVideoModel} label="" variant="dock" />
                        <ChipDropdown
                            icon={<Clock size={14} strokeWidth={1.75} />}
                            value={duration}
                            options={DURATION_OPTIONS}
                            onChange={setDuration}
                        />
                        <ChipDropdown
                            icon={<Video size={14} strokeWidth={1.75} />}
                            value={motionValue}
                            options={MOTION_OPTIONS}
                            onChange={handleMotionChange}
                        />
                    </KreaDockChipRow>
                    <KreaDockSubmit
                        disabled={!image || (_REFERENCE_MODEL_VALUES.has(videoModel) && !refImage)}
                        loading={loading}
                        onClick={() => image && onGenerate({ image, motion, duration, prompt, videoModel, referenceImage: refImage })}
                        title={`Generate video (${estimatedCredits} credits)`}
                    />
                </KreaDockToolbar>
            </KreaDockRoot>
        </div>
    );
}
