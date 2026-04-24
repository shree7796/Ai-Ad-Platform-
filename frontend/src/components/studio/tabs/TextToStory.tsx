'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Lightbulb, Users, MicVocal, Music2, Clock, Film, ChevronDown, Check, Zap } from 'lucide-react';
import {
    KreaDockRoot,
    KreaDockPrompt,
    KreaDockToolbar,
    KreaDockChipRow,
    KreaDockSubmit,
} from '@/components/studio/KreaDock';

// ── Data ──────────────────────────────────────────────────────────────────────

const STORY_MODELS = [
    { value: 'kling_21_pro', label: 'Kling 2.1 Pro',     credits: 98,  badge: 'RECOMMENDED', badgeColor: '#409cff', desc: 'Solid quality · stable scenes'        },
    { value: 'kling_30_pro', label: 'Kling 3.0 Pro 🔊',  credits: 140, badge: 'BEST',         badgeColor: '#f59e0b', desc: 'Best quality · native audio per clip' },
    { value: 'wan',          label: 'Wan v2.6',           credits: 100, badge: '1080P',        badgeColor: '#0ea5e9', desc: 'High resolution per scene'            },
    { value: 'luma',         label: 'Luma Dream Machine', credits: 35,  badge: 'SMOOTH',       badgeColor: '#5ac8fa', desc: 'Cinematic smooth motion'              },
    { value: 'minimax',      label: 'MiniMax Video-01',   credits: 110, badge: 'PRECISE',      badgeColor: '#f97316', desc: 'Precise prompt following'             },
];

const VOICES = [
    { value: 'fable',   label: 'Fable',   desc: 'Warm storytelling'   },
    { value: 'alloy',   label: 'Alloy',   desc: 'Balanced, neutral'   },
    { value: 'echo',    label: 'Echo',    desc: 'Crisp & clear'        },
    { value: 'onyx',    label: 'Onyx',    desc: 'Deep, authoritative' },
    { value: 'nova',    label: 'Nova',    desc: 'Bright, energetic'   },
    { value: 'shimmer', label: 'Shimmer', desc: 'Soft & gentle'       },
];

const SCENES = [3, 5, 8] as const;

const MUSIC_STYLES = [
    { value: 'cinematic',    label: 'Cinematic',     desc: 'Epic orchestral, dramatic builds'   },
    { value: 'emotional',    label: 'Emotional',     desc: 'Soft piano, heartfelt strings'       },
    { value: 'adventure',    label: 'Adventure',     desc: 'Upbeat, heroic, fast-paced'          },
    { value: 'ambient',      label: 'Ambient',       desc: 'Gentle background, peaceful'         },
    { value: 'suspense',     label: 'Suspense',      desc: 'Tense, mysterious, dark tones'       },
    { value: 'uplifting',    label: 'Uplifting',     desc: 'Positive, motivational, bright'      },
    { value: 'no_music',     label: 'No Music',      desc: 'Narration only, no background track' },
];

const SUGGESTIONS = [
    'A lone astronaut discovers a crystal planet that is alive and sending her a message.',
    'An old clockmaker repairs a watch that shows its owner their greatest regret — and how to fix it.',
    'A marine biologist and a singing whale must stop a corporation from draining the ocean.',
    'An AI learns to paint sunsets, creating a masterpiece so beautiful it stops an entire city.',
    'A girl finds a door that opens to a parallel world where she never existed.',
];

function estimateCredits(scenes: number, model: string): number {
    return (STORY_MODELS.find(m => m.value === model)?.credits ?? 98) * scenes + 40;
}

function cycleScenes(n: 3 | 5 | 8): 3 | 5 | 8 {
    return n === 3 ? 5 : n === 5 ? 8 : 3;
}

// ── Inline dropdown (renders below the toolbar row, no portal/overlay) ────────

type DropdownId = 'model' | 'voice' | 'music' | null;

function InlineDropdown({ open, children }: { open: boolean; children: React.ReactNode }) {
    if (!open) return null;
    return (
        <div style={{
            background: 'var(--bg-card, #16161e)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 10,
            marginTop: 4,
            marginBottom: 2,
            overflow: 'hidden',
        }}>
            {children}
        </div>
    );
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StoryGenerateData {
    prompt: string; sceneCount: number; voice: string;
    videoModel: string; generateMusic: boolean; musicPrompt: string;
}

interface Props {
    onGenerate: (data: StoryGenerateData) => void;
    loading: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TextToStory({ onGenerate, loading }: Props) {
    const [prompt, setPrompt]         = useState('');
    const [sceneCount, setSceneCount] = useState<3 | 5 | 8>(5);
    const [voice, setVoice]           = useState('fable');
    const [videoModel, setVideoModel] = useState('kling_21_pro');
    const [musicStyle, setMusicStyle] = useState('cinematic');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [openDd, setOpenDd]         = useState<DropdownId>(null);

    const credits = useMemo(() => estimateCredits(sceneCount, videoModel), [sceneCount, videoModel]);
    const selModel = STORY_MODELS.find(m => m.value === videoModel) ?? STORY_MODELS[0];
    const selVoice = VOICES.find(v => v.value === voice) ?? VOICES[0];
    const selMusic = MUSIC_STYLES.find(m => m.value === musicStyle) ?? MUSIC_STYLES[0];

    const toggle = (id: DropdownId) => setOpenDd(d => d === id ? null : id);

    const runGenerate = () => {
        const p = prompt.trim();
        if (!p) return;
        const noMusic = musicStyle === 'no_music';
        onGenerate({
            prompt: p, sceneCount, voice, videoModel,
            generateMusic: !noMusic,
            musicPrompt: noMusic ? '' : selMusic.desc,
        });
    };

    // Close dropdown on outside click
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!openDd) return;
        const handler = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpenDd(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [openDd]);

    return (
        <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <KreaDockRoot>
                <KreaDockPrompt
                    rows={3}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Write your story or script here — then hit generate to turn it into a narrated video…"
                    onKeyDown={e => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            runGenerate();
                        }
                    }}
                />

                {/* Story suggestions */}
                {showSuggestions && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 2px 10px' }}>
                        {SUGGESTIONS.map(s => (
                            <button key={s} type="button" className="krea-dock-chip"
                                style={{ whiteSpace: 'normal', textAlign: 'left', lineHeight: 1.35, maxWidth: '100%' }}
                                onClick={() => { setPrompt(s); setShowSuggestions(false); }}>
                                {s}
                            </button>
                        ))}
                    </div>
                )}

                <KreaDockToolbar>
                    <KreaDockChipRow>

                        {/* ── Model dropdown trigger ── */}
                        <button type="button" className="krea-dock-chip"
                            data-on={openDd === 'model' ? 'true' : undefined}
                            onClick={() => toggle('model')}
                        >
                            <Film size={14} strokeWidth={1.75} />
                            {selModel.label}
                            <ChevronDown size={12} strokeWidth={2}
                                style={{ transform: openDd === 'model' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                        </button>

                        {/* ── Scenes cycle ── */}
                        <button type="button" className="krea-dock-chip"
                            title="Click to change scenes"
                            onClick={() => setSceneCount(cycleScenes)}>
                            <Users size={14} strokeWidth={1.75} />
                            {sceneCount} scenes
                        </button>

                        {/* ── Duration (read-only) ── */}
                        <span className="krea-dock-chip" style={{ pointerEvents: 'none', opacity: 0.6 }}>
                            <Clock size={14} strokeWidth={1.75} />
                            ~{sceneCount * 5}s
                        </span>

                        {/* ── Voice dropdown trigger ── */}
                        <button type="button" className="krea-dock-chip"
                            data-on={openDd === 'voice' ? 'true' : undefined}
                            onClick={() => toggle('voice')}
                        >
                            <MicVocal size={14} strokeWidth={1.75} />
                            {selVoice.label}
                            <ChevronDown size={12} strokeWidth={2}
                                style={{ transform: openDd === 'voice' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                        </button>

                        {/* ── Music dropdown trigger ── */}
                        <button type="button" className="krea-dock-chip"
                            data-on={openDd === 'music' ? 'true' : undefined}
                            onClick={() => toggle('music')}
                        >
                            <Music2 size={14} strokeWidth={1.75} />
                            {selMusic.label}
                            <ChevronDown size={12} strokeWidth={2}
                                style={{ transform: openDd === 'music' ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
                        </button>

                        {/* ── Ideas toggle ── */}
                        <button type="button" className="krea-dock-chip"
                            data-on={showSuggestions ? 'true' : undefined}
                            onClick={() => setShowSuggestions(v => !v)}>
                            <Lightbulb size={14} strokeWidth={1.75} />
                            Ideas
                        </button>

                    </KreaDockChipRow>

                    <KreaDockSubmit
                        disabled={!prompt.trim()}
                        loading={loading}
                        onClick={runGenerate}
                        title={`Generate story · ${credits} credits`}
                    />
                </KreaDockToolbar>

                {/* ── Model dropdown panel (renders BELOW toolbar, never overlaps) ── */}
                <InlineDropdown open={openDd === 'model'}>
                    {STORY_MODELS.map(m => (
                        <button key={m.value} type="button" onClick={() => { setVideoModel(m.value); setOpenDd(null); }}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                padding: '9px 14px', border: 'none', textAlign: 'left',
                                background: videoModel === m.value ? 'rgba(255,255,255,0.06)' : 'transparent',
                                cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                            <span style={{ width: 16, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                                {videoModel === m.value && <Check size={12} color="#0a84ff" strokeWidth={2.5} />}
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>{m.label}</span>
                                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                                        background: m.badgeColor + '18', color: m.badgeColor, letterSpacing: '0.04em' }}>
                                        {m.badge}
                                    </span>
                                </span>
                                <span style={{ fontSize: 11.5, color: '#6b7280' }}>{m.desc}</span>
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: '#6b7280', flexShrink: 0 }}>
                                <Zap size={9} fill="currentColor" />
                                {m.credits}/scene
                            </span>
                        </button>
                    ))}
                </InlineDropdown>

                {/* ── Voice dropdown panel ── */}
                <InlineDropdown open={openDd === 'voice'}>
                    {VOICES.map(v => (
                        <button key={v.value} type="button" onClick={() => { setVoice(v.value); setOpenDd(null); }}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                padding: '9px 14px', border: 'none', textAlign: 'left',
                                background: voice === v.value ? 'rgba(255,255,255,0.06)' : 'transparent',
                                cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                            <span style={{ width: 16, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                                {voice === v.value && <Check size={12} color="#0a84ff" strokeWidth={2.5} />}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb', flex: 1 }}>{v.label}</span>
                            <span style={{ fontSize: 11.5, color: '#6b7280' }}>{v.desc}</span>
                        </button>
                    ))}
                </InlineDropdown>

                {/* ── Music style dropdown panel ── */}
                <InlineDropdown open={openDd === 'music'}>
                    {MUSIC_STYLES.map(m => (
                        <button key={m.value} type="button" onClick={() => { setMusicStyle(m.value); setOpenDd(null); }}
                            style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                                padding: '9px 14px', border: 'none', textAlign: 'left',
                                background: musicStyle === m.value ? 'rgba(255,255,255,0.06)' : 'transparent',
                                cursor: 'pointer', fontFamily: 'inherit',
                            }}>
                            <span style={{ width: 16, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                                {musicStyle === m.value && <Check size={12} color="#0a84ff" strokeWidth={2.5} />}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: m.value === 'no_music' ? '#6b7280' : '#e5e7eb', flex: 1 }}>
                                {m.label}
                            </span>
                            <span style={{ fontSize: 11.5, color: '#6b7280' }}>{m.desc}</span>
                        </button>
                    ))}
                </InlineDropdown>

            </KreaDockRoot>
        </div>
    );
}
