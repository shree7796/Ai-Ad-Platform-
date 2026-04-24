'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Download,
    RefreshCw,
    ImageIcon,
    Play,
    Loader2,
    Sparkles,
    ZoomIn,
    Video,
    Box,
    ExternalLink,
    Gamepad2,
} from 'lucide-react';

export type OutputType = 'image' | 'video' | 'model' | 'igaming' | 'none';

export type CanvasAccent = 'image' | 'video' | 'model' | 'igaming';

interface Props {
    type: OutputType;
    src: string | null;
    loading: boolean;
    onRegenerate?: () => void;
    /** Large centered hero title when canvas is empty (Krea-style). */
    toolTitle?: string;
    /** Muted line under the title. */
    toolSubtitle?: string;
    imageOrVideo?: CanvasAccent;
}

function KreaEmptyHero({
    title,
    subtitle,
    accent,
}: {
    title: string;
    subtitle: string;
    accent: CanvasAccent;
}) {
    const isVideo = accent === 'video';
    const isModel = accent === 'model';
    const isIgaming = accent === 'igaming';
    const gradient = isVideo
        ? 'linear-gradient(145deg, #fbbf24 0%, #f59e0b 38%, #ea580c 100%)'
        : isModel
          ? 'linear-gradient(155deg, #a855f7 0%, #7c3aed 45%, #5b21b6 100%)'
          : isIgaming
            ? 'linear-gradient(145deg, #064e3b 0%, #059669 45%, #10b981 100%)'
            : 'linear-gradient(165deg, #1a9bff 0%, #0a84ff 45%, #0071e3 100%)';
    const Icon = isVideo ? Video : isModel ? Box : Sparkles;

    return (
        <div
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 24px 56px',
                textAlign: 'center',
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 16,
                }}
            >
                <div
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: 14,
                        background: gradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 12px 36px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1) inset',
                        flexShrink: 0,
                    }}
                >
                    <Icon size={26} color="#ffffff" strokeWidth={1.65} />
                </div>
                <h2
                    style={{
                        margin: 0,
                        fontSize: 28,
                        fontWeight: 700,
                        color: '#ffffff',
                        letterSpacing: '-0.035em',
                        lineHeight: 1.15,
                        textAlign: 'left',
                    }}
                >
                    {title}
                </h2>
            </motion.div>
            <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.08, duration: 0.3 }}
                style={{
                    marginTop: 14,
                    marginBottom: 0,
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    lineHeight: 1.55,
                    maxWidth: 420,
                }}
            >
                {subtitle}
            </motion.p>
        </div>
    );
}

function LoadingState({ type }: { type: OutputType }) {
    const isVideo = type === 'video';
    const isModel = type === 'model';
    return (
        <div
            style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 20,
                padding: 40,
                textAlign: 'center',
            }}
        >
            <div className="canvas-placeholder" style={{ gap: 24 }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                    style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        background: 'rgba(255,255,255,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    <Loader2 size={24} color="#0a84ff" />
                </motion.div>
                <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#ffffff', marginBottom: 6 }}>
                        {type === 'video' ? 'Generating video…' : type === 'model' ? 'Building 3D model…' : type === 'igaming' ? 'Generating 4 game assets…' : 'Generating image…'}
                    </div>
                    <div style={{ fontSize: 14, color: '#888888', lineHeight: 1.6, maxWidth: 260 }}>
                        This may take a moment. Your result will appear here.
                    </div>
                </div>
                <div
                    style={{
                        width: '100%',
                        maxWidth: 240,
                        height: 3,
                        borderRadius: 99,
                        background: 'var(--progress-track)',
                        overflow: 'hidden',
                    }}
                >
                    <motion.div
                        animate={{ x: ['-100%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                        style={{
                            width: '50%',
                            height: '100%',
                            background: 'linear-gradient(90deg, transparent, #0a84ff, transparent)',
                            borderRadius: 99,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default function OutputPanel({
    type,
    src,
    loading,
    onRegenerate,
    toolTitle = 'Studio',
    toolSubtitle = 'Create with AI',
    imageOrVideo = 'image',
}: Props) {
    const [playing, setPlaying] = useState(false);
    const [zoom, setZoom] = useState(false);

    const handleDownload = (url?: string | null) => {
        const target = url ?? src;
        if (!target) return;
        const filename =
            type === 'video' ? 'lumina-output.mp4' : type === 'model' ? 'lumina-output.glb' : 'lumina-output.png';
        const proxyUrl = `/api/media-download?url=${encodeURIComponent(target)}&filename=${encodeURIComponent(filename)}`;
        const a = document.createElement('a');
        a.href = proxyUrl;
        a.download = filename;
        a.click();
    };

    // Parse iGaming multi-asset JSON payload
    type IgamingPkg = {
        primary: string;
        angle_left: string;
        angle_right: string;
        promo: string;
        template?: string;
        style?: string;
        views_generated?: number;
    };
    let igamingPkg: IgamingPkg | null = null;
    if (type === 'igaming' && src) {
        try { igamingPkg = JSON.parse(src) as IgamingPkg; } catch { /* raw url fallback */ }
    }

    const showChrome = loading || !!src;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                minHeight: 0,
                flex: 1,
                position: 'relative',
            }}
        >
            {showChrome && (
                <div className="studio-output-topbar">
                    <div className="studio-output-topbar-left">
                        <div className="studio-search-pill">
                            <span className="studio-search-pill-label">Output</span>
                            {src && (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: '#4ade80',
                                        background: 'rgba(74,222,128,0.12)',
                                        padding: '3px 9px',
                                        borderRadius: 99,
                                    }}
                                >
                                    <span
                                        style={{
                                            width: 5,
                                            height: 5,
                                            borderRadius: 99,
                                            background: '#4ade80',
                                            display: 'inline-block',
                                        }}
                                    />
                                    Ready
                                </span>
                            )}
                            {loading && (
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        fontSize: 11,
                                        fontWeight: 600,
                                        color: '#7cc4ff',
                                        background: 'var(--bg-accent-soft)',
                                        padding: '3px 9px',
                                        borderRadius: 99,
                                    }}
                                >
                                    <Loader2 size={10} style={{ animation: 'spin 1.2s linear infinite' }} />
                                    Processing
                                </span>
                            )}
                        </div>
                    </div>

                    {src && !loading && (
                        <div className="studio-output-topbar-right">
                            <button
                                className="btn-secondary"
                                onClick={() => setZoom(!zoom)}
                                style={{ padding: '7px 14px', fontSize: 12 }}
                            >
                                <ZoomIn size={13} />
                                {zoom ? 'Fit' : 'Zoom'}
                            </button>
                            <button
                                className="btn-secondary"
                                onClick={onRegenerate}
                                style={{ padding: '7px 14px', fontSize: 12 }}
                            >
                                <RefreshCw size={13} />
                                Redo
                            </button>
                            <button className="btn-primary" onClick={() => handleDownload()} style={{ padding: '7px 16px', fontSize: 12 }}>
                                <Download size={13} />
                                Download
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: loading || !src ? 0 : 32,
                    overflow: 'hidden',
                    position: 'relative',
                }}
            >
                <AnimatePresence mode="wait">
                    {loading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <LoadingState type={type} />
                        </motion.div>
                    ) : !src ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <KreaEmptyHero
                                title={toolTitle}
                                subtitle={toolSubtitle}
                                accent={imageOrVideo}
                            />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="result"
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                borderRadius: 'var(--radius-xl)',
                                overflow: 'hidden',
                                boxShadow: 'var(--shadow-xl)',
                                maxWidth: zoom ? '100%' : 640,
                                maxHeight: zoom ? '100%' : '80vh',
                                border: '1px solid var(--border)',
                                position: 'relative',
                                background: '#000',
                            }}
                        >
                            {type === 'igaming' && igamingPkg ? (
                                <div style={{
                                    padding: 16,
                                    background: 'rgba(6,78,59,0.12)',
                                    border: '1px solid rgba(5,150,105,0.25)',
                                    borderRadius: 12,
                                    maxWidth: zoom ? '90vw' : 640,
                                }}>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#10b981', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Gamepad2 size={15} />
                                        {igamingPkg.views_generated ?? 4} assets generated
                                        {igamingPkg.template && (
                                            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
                                                · {igamingPkg.template.replace(/_/g, ' ')} · {igamingPkg.style}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        {[
                                            { key: 'primary' as const,     label: 'Primary (Front)' },
                                            { key: 'angle_left' as const,  label: 'Left Angle'      },
                                            { key: 'angle_right' as const, label: 'Right Angle'     },
                                            { key: 'promo' as const,       label: 'Promo Scene'     },
                                        ].map(({ key, label }) => {
                                            const url = igamingPkg![key];
                                            return (
                                                <div key={key} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', background: '#111', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <img
                                                        src={url}
                                                        alt={label}
                                                        style={{ display: 'block', width: '100%', aspectRatio: '1/1', objectFit: 'cover' }}
                                                    />
                                                    <div style={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        left: 0,
                                                        right: 0,
                                                        padding: '16px 8px 6px',
                                                        background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                    }}>
                                                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>{label}</span>
                                                        <button
                                                            onClick={() => handleDownload(url)}
                                                            style={{
                                                                background: 'rgba(255,255,255,0.15)',
                                                                border: '1px solid rgba(255,255,255,0.2)',
                                                                borderRadius: 5,
                                                                padding: '3px 7px',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 3,
                                                                fontSize: 10,
                                                                color: '#fff',
                                                            }}
                                                        >
                                                            <Download size={9} />
                                                            Save
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : type === 'model' ? (
                                <div
                                    style={{
                                        padding: '36px 28px',
                                        textAlign: 'center',
                                        maxWidth: zoom ? '90vw' : 440,
                                        background: 'linear-gradient(180deg, rgba(139,92,246,0.12) 0%, rgba(26,26,26,0.95) 100%)',
                                        border: '1px solid rgba(139,92,246,0.25)',
                                    }}
                                >
                                    <Box size={48} color="#c4b5fd" style={{ margin: '0 auto 16px', opacity: 0.9 }} />
                                    <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                                        3D asset ready
                                    </div>
                                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 18px' }}>
                                        GLB or mesh is stored at a signed URL. Download it, or open in an online glTF viewer.
                                    </p>
                                    <a
                                        href={`https://gltf-viewer.donmccurdy.com/#model=${encodeURIComponent(src)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-secondary"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '10px 16px',
                                            fontSize: 13,
                                            textDecoration: 'none',
                                        }}
                                    >
                                        <ExternalLink size={14} />
                                        Open in viewer
                                    </a>
                                </div>
                            ) : type === 'image' ? (
                                <img
                                    src={src}
                                    alt="Generated"
                                    style={{
                                        display: 'block',
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'contain',
                                        maxWidth: zoom ? '90vw' : 640,
                                        maxHeight: zoom ? '90vh' : '75vh',
                                        background: 'var(--bg-subtle)',
                                    }}
                                />
                            ) : (
                                <div style={{ position: 'relative' }}>
                                    <video
                                        src={src}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            maxWidth: zoom ? '90vw' : 640,
                                            maxHeight: zoom ? '90vh' : '75vh',
                                        }}
                                        loop
                                        playsInline
                                        id="output-video"
                                    />
                                    <div
                                        style={{
                                            position: 'absolute',
                                            inset: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                        }}
                                        onClick={() => {
                                            const v = document.getElementById('output-video') as HTMLVideoElement;
                                            if (v) {
                                                playing ? v.pause() : v.play();
                                                setPlaying(!playing);
                                            }
                                        }}
                                    >
                                        {!playing && (
                                            <div
                                                style={{
                                                    width: 56,
                                                    height: 56,
                                                    borderRadius: 99,
                                                    background: 'rgba(255,255,255,0.12)',
                                                    backdropFilter: 'blur(12px)',
                                                    border: '1px solid rgba(255,255,255,0.2)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                                }}
                                            >
                                                <Play size={22} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {src && !loading && (
                <div
                    style={{
                        padding: '11px 20px',
                        borderTop: '1px solid var(--border)',
                        background: 'rgba(26, 26, 26, 0.94)',
                        backdropFilter: 'blur(12px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        flexShrink: 0,
                    }}
                >
                    <ImageIcon size={12} color="var(--text-muted)" />
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {type === 'image'
                            ? '1024 × 1024 px · AI Generated'
                            : type === 'model'
                              ? 'GLB / mesh · AI Generated'
                              : type === 'igaming'
                                ? '4 assets · Multi-angle · AI Generated'
                                : '5s · 16:9 · AI Generated'}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Each generation uses credits- download before regenerating.
                    </span>
                </div>
            )}
        </div>
    );
}
