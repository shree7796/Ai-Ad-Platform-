'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Film, Lightbulb, Zap } from 'lucide-react';

/**
 * Per-model base credit cost for one 5-second clip (mirrors credits.yaml).
 * Duration multiplier: ceil(durationSec / 5) × base cost.
 */
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

function estimateCredits(durationStr: string, modelValue: string): number {
    const durationSec = Math.max(1, parseInt(durationStr, 10) || 5);
    const base = MODEL_BASE_CREDITS[modelValue] ?? MODEL_BASE_CREDITS['kling_21_pro'];
    const clips = Math.max(1, Math.ceil(durationSec / 5));
    return base * clips;
}

const STYLES = ['Cinematic', 'Realistic', 'Animation', 'Product Ad'];
const CAMERA = ['Static', 'Pan', 'Zoom', 'Dolly'];
const DURATIONS = ['3s', '5s', '10s'];
const RATIOS = ['16:9', '9:16', '1:1'];
const VIDEO_MODELS = [
    { value: 'kling_pro',     label: 'Kling v1.6 Pro',    badge: 'STANDARD', badgeColor: '#6366f1', desc: 'Reliable quality · 720p output' },
    { value: 'kling_21_pro',  label: 'Kling 2.1 Pro ✨',  badge: 'SHARP',    badgeColor: '#8b5cf6', desc: 'Newer model · improved detail' },
    { value: 'seedance_fast', label: 'Seedance 2.0 Fast', badge: 'AUDIO',    badgeColor: '#10b981', desc: 'Audio included · up to 15s' },
];
const SUGGESTIONS = [
    'A product bottle rotating on a white pedestal with soft studio lighting',
    'Ocean waves crashing on a rocky shore at sunset',
    'A busy Tokyo street at night, neon reflections in the rain',
    'Flying through clouds into a bright blue sky',
    'Close-up of coffee being poured into a ceramic cup in slow motion',
];

interface Props {
    onGenerate: (data: { prompt: string; style: string; camera: string; duration: string; ratio: string; videoModel: string }) => void;
    loading: boolean;
}

export default function TextToVideo({ onGenerate, loading }: Props) {
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('Cinematic');
    const [camera, setCamera] = useState('Static');
    const [duration, setDuration] = useState('5s');
    const [ratio, setRatio] = useState('16:9');
    const [videoModel, setVideoModel] = useState('kling_pro');
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const estimatedCredits = useMemo(() => estimateCredits(duration, videoModel), [duration, videoModel]);

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    return (
        <div
            className="anim-fade-in glow-container"
            onMouseMove={handleMouseMove}
            style={{
                display: 'flex', flexDirection: 'column', gap: 20,
                '--mouse-x': `${mousePos.x}px`,
                '--mouse-y': `${mousePos.y}px`
            } as any}
        >
            <div className="glow-overlay" />

            {/* Prompt */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="card"
                style={{ padding: 20 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <label className="text-label">Scene Prompt</label>
                    <span style={{
                        fontSize: 10, fontWeight: 700, color: 'var(--accent)',
                        background: 'var(--bg-accent-soft)', padding: '3px 10px', borderRadius: 99, letterSpacing: '0.04em',
                    }}>KEY FEATURE</span>
                </div>
                <textarea
                    className="studio-input"
                    rows={5}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe the video scene... Be specific about the subject, action, mood, and lighting."
                />
                {/* Suggestions */}
                <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Lightbulb size={13} color="var(--text-muted)" />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Scene ideas</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {SUGGESTIONS.map(s => (
                            <button
                                key={s}
                                onClick={() => setPrompt(s)}
                                style={{
                                    fontSize: 12, padding: '5px 11px', borderRadius: 99,
                                    border: '1.5px solid var(--border)', background: 'var(--bg-subtle)',
                                    color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit',
                                    transition: 'all 0.15s', textAlign: 'left',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
                                    (e.currentTarget as HTMLElement).style.color = 'var(--accent)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                                }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </motion.div>

            {/* Style presets */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="card"
                style={{ padding: 20 }}
            >
                <label className="text-label" style={{ display: 'block', marginBottom: 12 }}>Style Preset</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {STYLES.map(s => (
                        <button key={s} onClick={() => setStyle(s)} className={`pill ${style === s ? 'active' : ''}`}>{s}</button>
                    ))}
                </div>
            </motion.div>

            {/* Camera motion */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="card"
                style={{ padding: 20 }}
            >
                <label className="text-label" style={{ display: 'block', marginBottom: 12 }}>Camera Motion</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                    {CAMERA.map(c => (
                        <button
                            key={c}
                            onClick={() => setCamera(c)}
                            style={{
                                padding: '10px 8px', borderRadius: 10, cursor: 'pointer',
                                border: camera === c ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                                background: camera === c ? 'var(--bg-accent-soft)' : 'var(--bg-subtle)',
                                color: camera === c ? 'var(--accent)' : 'var(--text-secondary)',
                                fontSize: 13, fontWeight: camera === c ? 700 : 500,
                                fontFamily: 'inherit', transition: 'all 0.15s',
                            }}
                        >
                            {c}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Video Model */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="card"
                style={{ padding: 20 }}
            >
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
            </motion.div>

            {/* Duration & Ratio */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
            >
                <div className="card" style={{ padding: 20 }}>
                    <label className="text-label" style={{ display: 'block', marginBottom: 12 }}>Duration</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {DURATIONS.map(d => (
                            <button
                                key={d}
                                onClick={() => setDuration(d)}
                                className={`pill ${duration === d ? 'active' : ''}`}
                                style={{ justifyContent: 'center' }}
                            >{d}</button>
                        ))}
                    </div>
                </div>
                <div className="card" style={{ padding: 20 }}>
                    <label className="text-label" style={{ display: 'block', marginBottom: 12 }}>Aspect Ratio</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {RATIOS.map(r => (
                            <button
                                key={r}
                                onClick={() => setRatio(r)}
                                className={`pill ${ratio === r ? 'active' : ''}`}
                                style={{ justifyContent: 'center' }}
                            >{r}</button>
                        ))}
                    </div>
                </div>
            </motion.div>

            <button
                className="btn-primary"
                onClick={() => prompt.trim() && onGenerate({ prompt, style, camera, duration, ratio, videoModel })}
                disabled={loading || !prompt.trim()}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
                <Film size={16} />
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
