'use client';

import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Box } from 'lucide-react';
import ModelDropdown, { type ModelOption } from '@/components/studio/ModelDropdown';
import {
    KreaDockRoot,
    KreaDockPrompt,
    KreaDockToolbar,
    KreaDockChipRow,
    KreaDockSubmit,
} from '@/components/studio/KreaDock';

const MODELS_3D: ModelOption[] = [
    {
        value: 'trellis',
        label: 'Trellis',
        badge: 'FAST',
        badgeColor: '#8b5cf6',
        desc: 'Image → 3D mesh · versatile quality',
        credits: 28,
    },
    {
        value: 'trellis_2',
        label: 'Trellis 2',
        badge: 'BEST',
        badgeColor: '#a855f7',
        desc: 'Newer Trellis · higher fidelity',
        credits: 36,
    },
    {
        value: 'reconviagen',
        label: 'ReconViaGen 0.5',
        badge: 'GLB',
        badgeColor: '#06b6d4',
        desc: 'PBR GLB output · strong from clear photos',
        credits: 40,
    },
];

interface Props {
    onGenerate: (data: { image: File; prompt: string; model: string }) => void;
    loading: boolean;
}

export default function ImageTo3D({ onGenerate, loading }: Props) {
    const [image, setImage] = useState<File | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('Product or object for 3D reconstruction');
    const [model, setModel] = useState('trellis');

    const onDrop = useCallback((files: File[]) => {
        if (files[0]) {
            setImageUrl((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return URL.createObjectURL(files[0]);
            });
            setImage(files[0]);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1,
    });

    const clearImage = () => {
        setImage(null);
        setImageUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
    };

    const canGenerate = !loading && !!image && prompt.trim().length > 0;
    const credits = useMemo(() => MODELS_3D.find((m) => m.value === model)?.credits ?? 28, [model]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!imageUrl ? (
                <div
                    {...getRootProps()}
                    style={{
                        border: `2px dashed ${isDragActive ? '#8b5cf6' : 'rgba(255,255,255,0.15)'}`,
                        borderRadius: 16,
                        padding: '28px 20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: 'rgba(139,92,246,0.06)',
                    }}
                >
                    <input {...getInputProps()} />
                    <Upload size={28} color="#8b5cf6" style={{ marginBottom: 10 }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e5e5e5' }}>Drop a reference image</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                        Clear subject, good lighting- Trellis uses a single view.
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        position: 'relative',
                        borderRadius: 16,
                        overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: '#141414',
                    }}
                >
                    <img src={imageUrl} alt="Source" style={{ width: '100%', maxHeight: 160, objectFit: 'contain' }} />
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            clearImage();
                        }}
                        style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            border: 'none',
                            borderRadius: 8,
                            padding: 6,
                            background: 'rgba(0,0,0,0.65)',
                            color: '#fff',
                            cursor: 'pointer',
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            <KreaDockRoot>
                <KreaDockPrompt
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Short label or notes (required for billing metadata)…"
                    rows={2}
                />
                <KreaDockToolbar>
                    <KreaDockChipRow>
                        <ModelDropdown
                            models={MODELS_3D}
                            value={model}
                            onChange={setModel}
                            label=""
                            variant="dock"
                        />
                        <span
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'var(--text-muted)',
                                marginLeft: 4,
                            }}
                        >
                            ~{credits} credits
                        </span>
                    </KreaDockChipRow>
                    <KreaDockSubmit
                        disabled={!canGenerate}
                        loading={loading}
                        onClick={() => image && onGenerate({ image, prompt: prompt.trim(), model })}
                        title="Generate 3D"
                    />
                </KreaDockToolbar>
            </KreaDockRoot>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    padding: '0 4px 4px',
                }}
            >
                <Box size={14} style={{ flexShrink: 0, opacity: 0.7 }} />
                <span>Output is a downloadable GLB or mesh file. Preview it in an external 3D viewer after download.</span>
            </div>
        </div>
    );
}
