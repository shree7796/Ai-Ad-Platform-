'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, RefreshCw, ImageIcon, Play, Pause, Loader2, Sparkles } from 'lucide-react';

export type OutputType = 'image' | 'video' | 'none';

interface Props {
    type: OutputType;
    src: string | null;
    loading: boolean;
    onRegenerate?: () => void;
}

function SkeletonBlock({ h = 200 }: { h?: number }) {
    return <div className="skeleton" style={{ height: h, borderRadius: 12 }} />;
}

function EmptyState() {
    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: 32, textAlign: 'center', gap: 16,
        }}>
            <div style={{
                width: 64, height: 64, borderRadius: 20,
                background: 'var(--bg-subtle)',
                border: '1.5px dashed var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <Sparkles size={26} color="var(--text-muted)" strokeWidth={1.5} />
            </div>
            <div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    Output will appear here
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: 220 }}>
                    Fill in the workspace on the left and click Generate to see your creation.
                </div>
            </div>
        </div>
    );
}

function LoadingState({ type }: { type: OutputType }) {
    const isVideo = type === 'video';
    return (
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Progress indicator */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px', borderRadius: 12,
                background: 'var(--bg-accent-soft)', border: '1px solid rgba(99, 102, 241, 0.2)',
            }}>
                <Loader2 size={16} color="var(--accent)" style={{ animation: 'spin 1.2s linear infinite' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>
                    {isVideo ? 'Generating high-fidelity video...' : 'Synthesizing creative image...'}
                </span>
            </div>
            <SkeletonBlock h={isVideo ? 220 : 240} />
            {isVideo && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <SkeletonBlock h={8} />
                    </div>
                    <SkeletonBlock h={32} />
                </>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
                <SkeletonBlock h={38} />
                <SkeletonBlock h={38} />
            </div>
        </div>
    );
}

export default function OutputPanel({ type, src, loading, onRegenerate }: Props) {
    const [playing, setPlaying] = useState(false);

    const handleDownload = () => {
        if (!src) return;
        const filename = type === 'video' ? 'klypse-output.mp4' : 'klypse-output.png';
        // Use the server-side proxy so cross-origin MinIO URLs trigger a proper file download.
        const proxyUrl = `/api/media-download?url=${encodeURIComponent(src)}&filename=${encodeURIComponent(filename)}`;
        const a = document.createElement('a');
        a.href = proxyUrl;
        a.download = filename;
        a.click();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header */}
            <div style={{
                padding: '20px 20px 16px',
                borderBottom: '1px solid var(--border-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Output Preview</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {src ? (type === 'video' ? 'Video ready' : 'Image ready') : 'Waiting for generation'}
                    </div>
                </div>
                {src && (
                    <div style={{
                        width: 10, height: 10, borderRadius: 99, background: '#10b981',
                        boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)',
                    }} />
                )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflow: 'hidden auto' }}>
                {loading ? (
                    <LoadingState type={type} />
                ) : !src ? (
                    <EmptyState />
                ) : (
                    <div className="anim-fade-in" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Preview */}
                        {type === 'image' ? (
                            <div style={{
                                borderRadius: 12, overflow: 'hidden',
                                border: '1px solid var(--border)',
                                boxShadow: 'var(--shadow-sm)',
                                position: 'relative'
                            }}>
                                <img src={src} alt="Generated" style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'contain', background: 'var(--bg-subtle)' }} />
                                {/* Synthesis Scanline */}
                                <motion.div
                                    animate={{
                                        top: ['-20%', '120%']
                                    }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 2.5,
                                        ease: "linear"
                                    }}
                                    style={{
                                        position: 'absolute', left: 0, right: 0, height: '2px',
                                        background: 'linear-gradient(to right, transparent, var(--accent), transparent)',
                                        boxShadow: '0 0 15px var(--accent)',
                                        zIndex: 10,
                                        opacity: 0.3,
                                    }}
                                />
                            </div>
                        ) : (
                            <div style={{
                                borderRadius: 12, overflow: 'hidden',
                                border: '1px solid var(--border)',
                                boxShadow: 'var(--shadow-sm)',
                                position: 'relative',
                                background: '#000',
                            }}>
                                <video
                                    src={src}
                                    style={{ width: '100%', display: 'block', maxHeight: 320 }}
                                    loop
                                    playsInline
                                    id="output-video"
                                />
                                {/* Synthesis Scanline */}
                                <motion.div
                                    animate={{
                                        left: ['-20%', '120%']
                                    }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 3,
                                        ease: "linear"
                                    }}
                                    style={{
                                        position: 'absolute', top: 0, bottom: 0, width: '2px',
                                        background: 'linear-gradient(to bottom, transparent, var(--accent), transparent)',
                                        boxShadow: '0 0 15px var(--accent)',
                                        zIndex: 10,
                                        opacity: 0.3,
                                    }}
                                />
                                <div
                                    style={{
                                        position: 'absolute', inset: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => {
                                        const v = document.getElementById('output-video') as HTMLVideoElement;
                                        if (v) { playing ? v.pause() : v.play(); setPlaying(!playing); }
                                    }}
                                >
                                    {!playing && (
                                        <div style={{
                                            width: 60, height: 60, borderRadius: 99,
                                            background: 'rgba(255,255,255,0.1)',
                                            backdropFilter: 'blur(12px)',
                                            border: '1px solid rgba(255,255,255,0.2)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                                        }}>
                                            <Play size={24} color="#fff" fill="#fff" style={{ marginLeft: 4 }} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Metadata */}
                        <div style={{
                            display: 'flex', gap: 8, flexWrap: 'wrap',
                        }}>
                            {[type === 'image' ? '1024×1024 px' : '5s · 16:9', 'HD quality', 'AI generated'].map(tag => (
                                <span key={tag} style={{
                                    fontSize: 11.5, fontWeight: 500, color: 'var(--text-muted)',
                                    background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                                    padding: '4px 10px', borderRadius: 99,
                                }}>{tag}</span>
                            ))}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn-primary" onClick={handleDownload} style={{ flex: 1 }}>
                                <Download size={15} />
                                Download
                            </button>
                            <button className="btn-secondary" onClick={onRegenerate} style={{ flex: 1 }}>
                                <RefreshCw size={15} />
                                Regenerate
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer info */}
            {!loading && !src && (
                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid var(--border-light)',
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                }}>
                    <ImageIcon size={14} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }} />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>
                        Each generation uses credits. Download your results before regenerating.
                    </p>
                </div>
            )}
        </div>
    );
}
