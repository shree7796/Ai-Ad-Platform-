'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Wand2, X, ArrowLeftRight } from 'lucide-react';

const STYLE_OPTIONS = ['None', 'Watercolor', 'Oil Painting', 'Sketch', 'Pixel Art', 'Impressionist', 'Minimalist'];

interface Props {
    onGenerate: (data: {
        image: File;
        prompt: string;
        enhance: boolean;
        bgRemove: boolean;
        style: string;
        heroCinematic: boolean;
    }) => void;
    loading: boolean;
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
            <div>
                <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</div>
            </div>
            <div
                className={`toggle-track ${value ? 'on' : ''}`}
                onClick={() => onChange(!value)}
                role="switch"
                aria-checked={value}
            >
                <div className="toggle-thumb" />
            </div>
        </div>
    );
}

export default function ImageToImage({ onGenerate, loading }: Props) {
    const [image, setImage] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [enhance, setEnhance] = useState(false);
    const [bgRemove, setBgRemove] = useState(false);
    const [style, setStyle] = useState('None');
    const [heroCinematic, setHeroCinematic] = useState(true);
    const [comparePos, setComparePos] = useState(50);

    const onDrop = useCallback((files: File[]) => {
        if (files[0]) {
            setImage(files[0]);
            setImageUrl(URL.createObjectURL(files[0]));
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop, accept: { 'image/*': [] }, maxFiles: 1,
    });

    const clearImage = () => { setImage(null); setImageUrl(null); };

    return (
        <div className="anim-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Upload */}
            <div className="card" style={{ padding: 20 }}>
                <label className="text-label" style={{ display: 'block', marginBottom: 12 }}>Source Image</label>
                {!imageUrl ? (
                    <div
                        {...getRootProps()}
                        className={`dropzone ${isDragActive ? 'active' : ''}`}
                        style={{ height: 200, gap: 12 }}
                    >
                        <input {...getInputProps()} />
                        <div style={{
                            width: 52, height: 52, borderRadius: 14,
                            background: 'var(--bg-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <Upload size={24} color="var(--accent)" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                                Drop image here
                            </div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                                or click to browse — PNG, JPG, WEBP
                            </div>
                        </div>
                    </div>
                ) : (
                    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)' }}>
                        {/* Before/After Compare */}
                        <div
                            className="compare-container"
                            style={{ height: 220 }}
                            onMouseMove={e => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setComparePos(Math.round(((e.clientX - rect.left) / rect.width) * 100));
                            }}
                        >
                            <img src={imageUrl} alt="Original" style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }} />
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: `${100 - comparePos}%`, bottom: 0,
                                background: 'rgba(99,102,241,0.12)', backdropFilter: 'saturate(1.6)',
                                pointerEvents: 'none', transition: 'right 0.05s',
                            }} />
                            <div style={{
                                position: 'absolute', top: '50%', left: `${comparePos}%`,
                                transform: 'translate(-50%, -50%)',
                                width: 2, height: '100%', background: 'var(--accent)',
                                boxShadow: '0 0 8px rgba(99,102,241,0.5)',
                            }}>
                                <div style={{
                                    position: 'absolute', top: '50%', left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    background: 'var(--accent)', borderRadius: 99,
                                    padding: '4px 8px', display: 'flex', alignItems: 'center',
                                }}>
                                    <ArrowLeftRight size={14} color="#fff" />
                                </div>
                            </div>
                            <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.45)', padding: '3px 8px', borderRadius: 6, backdropFilter: 'blur(4px)' }}>BEFORE</div>
                            <div style={{ position: 'absolute', top: 8, right: 8, fontSize: 11, fontWeight: 600, color: '#fff', background: 'rgba(99,102,241,0.7)', padding: '3px 8px', borderRadius: 6, backdropFilter: 'blur(4px)' }}>AFTER</div>
                        </div>
                        <button onClick={clearImage} style={{
                            position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 99, width: 32, height: 32,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            color: '#fff'
                        }}>
                            <X size={15} />
                        </button>
                    </div>
                )}
            </div>

            {/* Edit options */}
            {imageUrl && (
                <div className="card" style={{ padding: '8px 20px' }}>
                    <Toggle label="Enhance Quality" value={enhance} onChange={setEnhance} />
                    <div className="divider" style={{ margin: '0' }} />
                    <Toggle label="Remove Background" value={bgRemove} onChange={setBgRemove} />
                    <div className="divider" style={{ margin: '0' }} />
                    <Toggle
                        label="Cinematic hero camera"
                        value={heroCinematic}
                        onChange={setHeroCinematic}
                    />
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '-4px 0 0 0', lineHeight: 1.45 }}>
                        Lets the AI adjust viewpoint (low front, head-on, ¾) for fire-poster shots like the references,
                        while keeping your model. Turn off to paste your cutout on a generated plate only.
                    </p>
                    <div className="divider" style={{ margin: '0' }} />
                    <div style={{ padding: '12px 0' }}>
                        <label className="text-label" style={{ display: 'block', marginBottom: 8 }}>Style Transfer</label>
                        <select className="studio-select" value={style} onChange={e => setStyle(e.target.value)}>
                            {STYLE_OPTIONS.map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {/* Optional prompt */}
            <div className="card" style={{ padding: 20 }}>
                <label className="text-label" style={{ display: 'block', marginBottom: 10 }}>
                    Guide Prompt <span style={{ fontWeight: 400, textTransform: 'none', color: 'var(--text-muted)', letterSpacing: 0 }}>(optional)</span>
                </label>
                <textarea
                    className="studio-input"
                    rows={3}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe changes or guide the transformation..."
                />
            </div>

            <button
                className="btn-primary"
                onClick={() => image && onGenerate({ image, prompt, enhance, bgRemove, style, heroCinematic })}
                disabled={loading || !image}
            >
                <Wand2 size={16} />
                {loading ? 'Processing...' : 'Transform Image'}
            </button>
        </div>
    );
}
