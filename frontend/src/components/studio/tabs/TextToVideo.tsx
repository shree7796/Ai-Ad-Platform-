'use client';

import { useState, useMemo } from 'react';
import { Lightbulb, Clock, Video, Clapperboard } from 'lucide-react';
import ModelDropdown, { ModelOption } from '@/components/studio/ModelDropdown';
import ChipDropdown, { type ChipOption } from '@/components/studio/ChipDropdown';
import AspectRatioSelector from '@/components/studio/AspectRatioSelector';
import { KreaDockRoot, KreaDockPrompt, KreaDockToolbar, KreaDockChipRow, KreaDockSubmit } from '@/components/studio/KreaDock';

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

const STYLE_OPTIONS: ChipOption[] = [
    { value: 'Cinematic',   label: 'Cinematic',   desc: 'Film-quality look · dramatic lighting'  },
    { value: 'Realistic',   label: 'Realistic',   desc: 'True-to-life · natural colors'          },
    { value: 'Animation',   label: 'Animation',   desc: 'Animated look · stylized motion'        },
    { value: 'Product Ad',  label: 'Product Ad',  desc: 'Clean product showcase · studio light'  },
];

const CAMERA_OPTIONS: ChipOption[] = [
    { value: 'Static', label: 'Static', desc: 'Fixed camera · no movement'         },
    { value: 'Pan',    label: 'Pan',    desc: 'Horizontal sweep across scene'       },
    { value: 'Zoom',   label: 'Zoom',   desc: 'Push in or pull out slowly'          },
    { value: 'Dolly',  label: 'Dolly',  desc: 'Camera tracks forward through scene' },
];

const DURATION_OPTIONS: ChipOption[] = [
    { value: '3s',  label: '3s',  desc: 'Short clip · fast generation' },
    { value: '5s',  label: '5s',  desc: 'Standard length clip'         },
    { value: '10s', label: '10s', desc: 'Longer clip · more action'    },
];


const VIDEO_MODELS: ModelOption[] = [
    { value: 'kling_pro',         label: 'Kling v1.6 Pro',      badge: 'STANDARD',  badgeColor: '#0a84ff', desc: 'Reliable quality · 720p output',               credits: MODEL_BASE_CREDITS.kling_pro,         creditsSuffix: '/5s' },
    { value: 'kling_21_pro',      label: 'Kling 2.1 Pro',       badge: 'SHARP',     badgeColor: '#409cff', desc: 'Improved detail · 720p',                        credits: MODEL_BASE_CREDITS.kling_21_pro,      creditsSuffix: '/5s' },
    { value: 'kling_26_pro',      label: 'Kling 2.6 Pro 🔊',    badge: 'AUDIO',     badgeColor: '#06b6d4', desc: 'Native audio · improved motion',                credits: MODEL_BASE_CREDITS.kling_26_pro,      creditsSuffix: '/5s' },
    { value: 'kling_30_pro',      label: 'Kling 3.0 Pro 🔊',    badge: 'NEWEST',    badgeColor: '#f59e0b', desc: 'Latest Kling · audio · best quality',           credits: MODEL_BASE_CREDITS.kling_30_pro,      creditsSuffix: '/5s' },
    { value: 'pixverse_v6',       label: 'PixVerse V6 🔊',       badge: '1080P',     badgeColor: '#10b981', desc: '1080p · native audio · smooth motion',          credits: MODEL_BASE_CREDITS.pixverse_v6,       creditsSuffix: '/5s' },
    { value: 'pixverse_c1',       label: 'PixVerse C1 🔊',       badge: 'CINEMATIC', badgeColor: '#14b8a6', desc: 'Cinematic 1080p · native audio',                credits: MODEL_BASE_CREDITS.pixverse_c1,       creditsSuffix: '/5s' },
    { value: 'seedance_standard', label: 'Seedance 2.0 🔊',      badge: 'AUDIO',     badgeColor: '#ec4899', desc: 'ByteDance · audio · director camera',           credits: MODEL_BASE_CREDITS.seedance_standard, creditsSuffix: '/5s' },
    { value: 'seedance_fast',     label: 'Seedance 2.0 Fast 🔊', badge: 'FAST',      badgeColor: '#84cc16', desc: 'Fast generation · audio included',              credits: MODEL_BASE_CREDITS.seedance_fast,     creditsSuffix: '/5s' },
    { value: 'luma',              label: 'Luma Dream Machine',   badge: 'SMOOTH',    badgeColor: '#5ac8fa', desc: 'Cinematic smooth motion',                       credits: MODEL_BASE_CREDITS.luma,              creditsSuffix: '/5s' },
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
    const [showSuggestions, setShowSuggestions] = useState(false);

    const estimatedCredits = useMemo(() => estimateCredits(duration, videoModel), [duration, videoModel]);

    const runGenerate = () => {
        const p = prompt.trim();
        if (p) onGenerate({ prompt: p, style, camera, duration, ratio, videoModel });
    };


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <KreaDockRoot>
                <KreaDockPrompt
                    rows={3}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Describe a video and click generate…"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            runGenerate();
                        }
                    }}
                />
                {showSuggestions && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 2px 10px' }}>
                        {SUGGESTIONS.map(s => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => { setPrompt(s); setShowSuggestions(false); }}
                                className="krea-dock-chip"
                                style={{ whiteSpace: 'normal', textAlign: 'left', lineHeight: 1.35, maxWidth: '100%' }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                )}
                <div className="section-label" style={{ marginTop: 2, marginBottom: 6 }}>
                    Aspect ratio
                </div>
                <AspectRatioSelector value={ratio} onChange={setRatio} />
                <KreaDockToolbar>
                    <KreaDockChipRow>
                        <ModelDropdown models={VIDEO_MODELS} value={videoModel} onChange={setVideoModel} label="" variant="dock" />
                        <ChipDropdown
                            icon={<Clapperboard size={14} strokeWidth={1.75} />}
                            value={style}
                            options={STYLE_OPTIONS}
                            onChange={setStyle}
                        />
                        <ChipDropdown
                            icon={<Video size={14} strokeWidth={1.75} />}
                            value={camera}
                            options={CAMERA_OPTIONS}
                            onChange={setCamera}
                        />
                        <ChipDropdown
                            icon={<Clock size={14} strokeWidth={1.75} />}
                            value={duration}
                            options={DURATION_OPTIONS}
                            onChange={setDuration}
                        />
                        <button
                            type="button"
                            className="krea-dock-chip"
                            data-on={showSuggestions ? 'true' : undefined}
                            onClick={() => setShowSuggestions(v => !v)}
                        >
                            <Lightbulb size={14} strokeWidth={1.75} />
                            Ideas
                        </button>
                    </KreaDockChipRow>
                    <KreaDockSubmit
                        disabled={!prompt.trim()}
                        loading={loading}
                        onClick={runGenerate}
                        title={`Generate (${estimatedCredits} credits)`}
                    />
                </KreaDockToolbar>
            </KreaDockRoot>
        </div>
    );
}
