'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Film, Lightbulb, Zap } from 'lucide-react';
import ModelDropdown, { ModelOption } from '@/components/studio/ModelDropdown';

/**
 * Per-model base credit cost for one 5-second clip (mirrors credits.yaml).
 * Duration multiplier: ceil(durationSec / 5) × base cost.
 */
const MODEL_BASE_CREDITS: Record<string, number> = {
    kling_standard:    10,
    kling_pro:         98,
    kling_21_pro:      98,
    kling_21_master:   60,
    kling_26_pro:      98,
    kling_30_pro:      140,
    seedance_fast:     242,
    seedance_standard: 160,
    pixverse_v6:       50,
    pixverse_c1:       40,
    minimax:           110,
    wan:               100,
    luma:              35,
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
                <ModelDropdown models={VIDEO_MODELS} value={videoModel} onChange={setVideoModel} />
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
