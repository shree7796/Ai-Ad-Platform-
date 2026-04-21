'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Lightbulb, Zap, Cpu } from 'lucide-react';

const IMAGE_MODELS = [
    {
        value: 'flux-dev',
        label: 'Flux Dev',
        badge: 'DEFAULT',
        badgeColor: 'var(--accent)',
        desc: 'Best quality · product & scene preservation',
        credits: 2,
    },
    {
        value: 'nano-banana',
        label: 'Nano Banana v1',
        badge: 'FAST',
        badgeColor: '#10b981',
        desc: 'Quick & affordable · Google Imagen diffusion',
        credits: 1,
    },
    {
        value: 'nano-banana-2',
        label: 'Nano Banana 2',
        badge: 'BEST',
        badgeColor: '#f59e0b',
        desc: 'Reasoning-guided · complex scenes · 4K',
        credits: 2,
    },
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

export default function TextToImage({ onGenerate, loading }: Props) {
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('Realistic');
    const [ratio, setRatio] = useState('1:1');
    const [model, setModel] = useState('flux-dev');
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const selectedModel = useMemo(() => IMAGE_MODELS.find(m => m.value === model) ?? IMAGE_MODELS[0], [model]);

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
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="card" style={{ padding: 20 }}
            >
                <label className="text-label" style={{ display: 'block', marginBottom: 10 }}>Prompt</label>
                <textarea
                    className="studio-input"
                    rows={4}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe what you want to create..."
                />
                <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Lightbulb size={13} color="var(--text-muted)" />
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Suggestions</span>
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
                                    transition: 'all 0.15s',
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

            {/* AI Model */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.08 }}
                className="card" style={{ padding: 20 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                    <Cpu size={14} color="var(--accent)" />
                    <span className="text-label">AI Model</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {IMAGE_MODELS.map(m => {
                        const active = model === m.value;
                        return (
                            <button
                                key={m.value}
                                onClick={() => setModel(m.value)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '11px 14px', borderRadius: 10,
                                    cursor: 'pointer', textAlign: 'left', width: '100%',
                                    border: active ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                                    background: active ? 'var(--bg-accent-soft)' : 'var(--bg-subtle)',
                                    fontFamily: 'inherit', transition: 'all 0.18s',
                                }}
                            >
                                {/* Radio indicator */}
                                <div style={{
                                    width: 16, height: 16, borderRadius: 99, flexShrink: 0,
                                    border: `2px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                                    background: active ? 'var(--accent)' : 'transparent',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {active && <div style={{ width: 5, height: 5, borderRadius: 99, background: '#fff' }} />}
                                </div>
                                {/* Label + desc */}
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
                                    {m.credits} credit{m.credits !== 1 ? 's' : ''}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            {/* Style */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="card" style={{ padding: 20 }}
            >
                <label className="text-label" style={{ display: 'block', marginBottom: 12 }}>Style</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {STYLES.map(s => (
                        <button key={s} onClick={() => setStyle(s)} className={`pill ${style === s ? 'active' : ''}`}>{s}</button>
                    ))}
                </div>
            </motion.div>

            {/* Aspect ratio */}
            <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="card" style={{ padding: 20 }}
            >
                <label className="text-label" style={{ display: 'block', marginBottom: 12 }}>Aspect Ratio</label>
                <div style={{ display: 'flex', gap: 10 }}>
                    {RATIOS.map(r => {
                        const [w, h] = r.split(':').map(Number);
                        const baseH = 44;
                        const baseW = (w / h) * baseH;
                        return (
                            <button
                                key={r}
                                onClick={() => setRatio(r)}
                                style={{
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', gap: 8, cursor: 'pointer',
                                    background: 'none', border: 'none', fontFamily: 'inherit',
                                }}
                            >
                                <div style={{
                                    width: Math.min(baseW, 60), height: baseH, borderRadius: 6,
                                    border: ratio === r ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                                    background: ratio === r ? 'var(--bg-accent-soft)' : 'var(--bg-subtle)',
                                    transition: 'all 0.15s',
                                }} />
                                <span style={{
                                    fontSize: 12.5, fontWeight: ratio === r ? 600 : 400,
                                    color: ratio === r ? 'var(--accent)' : 'var(--text-muted)',
                                }}>{r}</span>
                            </button>
                        );
                    })}
                </div>
            </motion.div>

            {/* Generate */}
            <button
                className="btn-primary"
                onClick={() => prompt.trim() && onGenerate({ prompt, style, ratio, model })}
                disabled={loading || !prompt.trim()}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
                <Wand2 size={16} />
                <span>{loading ? 'Generating...' : 'Generate Image'}</span>
                {!loading && (
                    <span style={{
                        marginLeft: 4, fontSize: 12, fontWeight: 700,
                        background: 'rgba(255,255,255,0.15)',
                        padding: '2px 8px', borderRadius: 99,
                        display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                        <Zap size={11} fill="currentColor" />
                        {selectedModel.credits} credit{selectedModel.credits !== 1 ? 's' : ''}
                    </span>
                )}
            </button>
        </div>
    );
}
