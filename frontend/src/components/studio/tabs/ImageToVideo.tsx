'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Video, X } from 'lucide-react';

const DURATIONS = ['3s', '5s', '10s'];

const VIDEO_MODELS = [
    { value: 'kling_pro',    label: 'Kling v1.6 Pro',    desc: 'Reliable · 720p · $0.70/5s' },
    { value: 'kling_21_pro', label: 'Kling 2.1 Pro ✨',  desc: 'Newer · sharper · $0.49/5s' },
    { value: 'seedance_fast',label: 'Seedance 2.0 Fast', desc: 'Audio included · up to 15s · $1.21/5s' },
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

    const onDrop = useCallback((files: File[]) => {
        if (files[0]) {
            setImage(files[0]);
            setImageUrl(URL.createObjectURL(files[0]));
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
                        <button onClick={() => { setImage(null); setImageUrl(null); }} style={{
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
                    {VIDEO_MODELS.map(m => (
                        <button
                            key={m.value}
                            onClick={() => setVideoModel(m.value)}
                            style={{
                                padding: '10px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                                border: videoModel === m.value ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                                background: videoModel === m.value ? 'var(--bg-accent-soft)' : 'var(--bg-subtle)',
                                fontFamily: 'inherit', transition: 'all 0.15s',
                            }}
                        >
                            <div style={{ fontSize: 13, fontWeight: 600, color: videoModel === m.value ? 'var(--accent)' : 'var(--text-primary)' }}>{m.label}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</div>
                        </button>
                    ))}
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
            >
                <Video size={16} />
                {loading ? 'Generating Video...' : 'Generate Video'}
            </button>
        </div>
    );
}
