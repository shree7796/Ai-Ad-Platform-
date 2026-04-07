'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wand2, Lightbulb } from 'lucide-react';

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
    onGenerate: (data: { prompt: string; style: string; ratio: string }) => void;
    loading: boolean;
}

export default function TextToImage({ onGenerate, loading }: Props) {
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState('Realistic');
    const [ratio, setRatio] = useState('1:1');
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleGenerate = () => {
        if (!prompt.trim()) return;
        onGenerate({ prompt, style, ratio });
    };

    return (
        <div
            className="anim-fade-in glow-container"
            onMouseMove={handleMouseMove}
            style={{
                display: 'flex', flexDirection: 'column', gap: 24,
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
                <label className="text-label" style={{ display: 'block', marginBottom: 10 }}>Prompt</label>
                <textarea
                    className="studio-input"
                    rows={4}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe what you want to create..."
                />

                {/* Suggestion chips */}
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

            {/* Style selector */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="card"
                style={{ padding: 20 }}
            >
                <label className="text-label" style={{ display: 'block', marginBottom: 12 }}>Style</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {STYLES.map(s => (
                        <button
                            key={s}
                            onClick={() => setStyle(s)}
                            className={`pill ${style === s ? 'active' : ''}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Aspect ratio */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="card"
                style={{ padding: 20 }}
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
                                    width: Math.min(baseW, 60),
                                    height: baseH,
                                    borderRadius: 6,
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
            <button className="btn-primary" onClick={handleGenerate} disabled={loading || !prompt.trim()}>
                <Wand2 size={16} />
                {loading ? 'Generating...' : 'Generate Image'}
            </button>
        </div>
    );
}
