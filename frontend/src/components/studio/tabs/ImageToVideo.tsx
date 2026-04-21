'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Video, X, Zap } from 'lucide-react';

const MODEL_BASE_CREDITS: Record<string, number> = {
    kling_standard:  10,
    kling_pro:       10,
    kling_21_pro:    22,
    kling_21_master: 60,
    seedance_fast:   55,
    minimax:         110,
    wan:             15,
    luma:            35,
};

function estimateVideoCredits(durationStr: string, modelValue: string): number {
    const durationSec = Math.max(1, parseInt(durationStr, 10) || 5);
    const base = MODEL_BASE_CREDITS[modelValue] ?? MODEL_BASE_CREDITS['kling_21_pro'];
    const clips = Math.max(1, Math.ceil(durationSec / 5));
    return base * clips;
}

const DURATIONS = ['3s', '5s', '10s'];

const VIDEO_MODELS = [
    { value: 'kling_pro',     label: 'Kling v1.6 Pro',    badge: 'STANDARD', badgeColor: '#6366f1', desc: 'Reliable quality · 720p output' },
    { value: 'kling_21_pro',  label: 'Kling 2.1 Pro ✨',  badge: 'SHARP',    badgeColor: '#8b5cf6', desc: 'Newer model · improved detail' },
    { value: 'seedance_fast', label: 'Seedance 2.0 Fast', badge: 'AUDIO',    badgeColor: '#10b981', desc: 'Audio included · up to 15s' },
];

interface Props {
    onGenerate: (data: { image: File; motion: number; duration: string; prompt: string; videoModel: string }) => void;
    loading: boolean;
}

export default function ImageToVideo({ onGenerate, loading }: Props) {
    const [image, setImage] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [motion, setMotion] = useState(50);
    const [duration, setDuration] = useState('5s');
    const [prompt, setPrompt] = useState('');
    const [videoModel, setVideoModel] = useState('kling_pro');
    const estimatedCredits = useMemo(() => estimateVideoCredits(duration, videoModel), [duration, videoModel]);

    const onDrop = useCallback((files: File[]) => {
        if (files[0]) {
            setImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(files[0]); });
            setImage(files[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop, accept: { 'image/*': [] }, maxFiles: 1,
    });

    const motionLabel = motion < 30 ? 'Subtle' : motion < 65 ? 'Medium' : 'Dynamic';
    const motionColor = motion < 30 ? '#10b981' : motion < 65 ? '#f59e0b' : '#ef4444';

    return (
        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Upload */}
            <div className="card" style={{ padding: 20 }}>
                <label className="text-label" style={{ display: 'block', marginBottom: 12 }}>Source Image</label>
                {!imageUrl ? (
                    <div
                        {...getRootProps()}
                        className={`dropzone ${isDragActive ? 'active' : ''}`}
                        style={{ height: 180, gap: 12 }}
                    >
                        <input {...getInputProps()} />
                        <div style={{
                            width: 48, height: 48, borderRadius: 12,
                            background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Upload size={22} color="var(--accent)" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Upload image to animate</div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>PNG, JPG, WEBP up to 20 MB</div>
                        </div>
                    </div>
                ) : (
                    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        <img src={imageUrl} alt="Source" style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }} />
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                            padding: '20px 12px 10px',
                        }}>
                            <span style={{ fontSize: 12, color: '#fff', fontWeight: 500 }}>{image?.name}</span>
                        </div>
                        <button onClick={() => { setImage(null); setImageUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null; }); }} style={{
                            position: 'absolute', top: 8, right: 8, background: 'rgba(255,255,255,0.9)',
                            border: '1px solid var(--border)', borderRadius: 99, width: 28, height: 28,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}>
                            <X size={13} />
                        </button>
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
                <label className="text-label" style={{ display: 'block', marginBottom: 12 }}>AI Model</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {VIDEO_MODELS.map(m => {
                        const active = videoModel === m.value;
                        const modelCredits = MODEL_BASE_CREDITS[m.value] ?? 22;
                        return (
                            <button
                                key={m.value}
                                onClick={() => setVideoModel(m.value)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '11px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                                    border: active ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                                    background: active ? 'var(--bg-accent-soft)' : 'var(--bg-subtle)',
                                    fontFamily: 'inherit', transition: 'all 0.15s', width: '100%',
                                }}
                            >
                                {/* Selection indicator */}
                                <div style={{
                                    width: 16, height: 16, borderRadius: 99, flexShrink: 0,
                                    border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                                    background: active ? 'var(--accent)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {active && <div style={{ width: 5, height: 5, borderRadius: 99, background: '#fff' }} />}
                                </div>
                                {/* Text */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                        <span style={{ fontSize: 13, fontWeight: 700, color: active ? 'var(--accent)' : 'var(--text-primary)' }}>
                                            {m.label}
                                        </span>
                                        <span style={{
                                            fontSize: 9, fontWeight: 800, letterSpacing: '0.05em',
                                            padding: '2px 5px', borderRadius: 4,
                                            background: `${m.badgeColor}20`, color: m.badgeColor,
                                            border: `1px solid ${m.badgeColor}40`,
                                        }}>
                                            {m.badge}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{m.desc}</div>
                                </div>
                                {/* Credit cost */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0,
                                    fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
                                    color: active ? 'var(--accent)' : 'var(--text-muted)',
                                    background: active ? 'rgba(99,102,241,0.12)' : 'var(--bg-muted)',
                                    border: `1px solid ${active ? 'rgba(99,102,241,0.25)' : 'var(--border)'}`,
                                    borderRadius: 6, padding: '3px 7px',
                                }}>
                                    <Zap size={10} fill="currentColor" />
                                    {modelCredits} credits / 5s
                                </div>
                            </button>
                        );
                    })}
                </div>
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

            <button
                className="btn-primary"
                onClick={() => image && onGenerate({ image, motion, duration, prompt, videoModel })}
                disabled={loading || !image}
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
