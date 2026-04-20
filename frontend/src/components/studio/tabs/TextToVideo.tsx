'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Film, Lightbulb } from 'lucide-react';

const STYLES = ['Cinematic', 'Realistic', 'Animation', 'Product Ad'];
const CAMERA = ['Static', 'Pan', 'Zoom', 'Dolly'];
const DURATIONS = ['3s', '5s', '10s'];
const RATIOS = ['16:9', '9:16', '1:1'];
const VIDEO_MODELS = [
    { value: 'kling_pro',     label: 'Kling v1.6 Pro',    desc: 'Reliable · 720p · $0.70/5s' },
    { value: 'kling_21_pro',  label: 'Kling 2.1 Pro ✨',  desc: 'Newer · sharper · $0.49/5s' },
    { value: 'seedance_fast', label: 'Seedance 2.0 Fast', desc: 'Audio included · up to 15s · $1.21/5s' },
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
            >
                <Film size={16} />
                {loading ? 'Generating Video...' : 'Generate Video'}
            </button>
        </div>
    );
}
