'use client';

import { useState, useMemo } from 'react';
import { Lightbulb, Users, MicVocal, Music2, Clock, Timer } from 'lucide-react';
import ModelDropdown, { type ModelOption } from '@/components/studio/ModelDropdown';
import ChipDropdown, { type ChipOption } from '@/components/studio/ChipDropdown';
import {
    KreaDockRoot,
    KreaDockPrompt,
    KreaDockToolbar,
    KreaDockChipRow,
    KreaDockSubmit,
} from '@/components/studio/KreaDock';

// ── Models (portal dropdown - same as TextToVideo) ────────────────────────────

const STORY_MODELS: ModelOption[] = [
    { value: 'kling_21_pro', label: 'Kling 2.1 Pro',     badge: 'RECOMMENDED', badgeColor: '#409cff', desc: 'Solid quality · stable scenes',            credits: 98,  creditsSuffix: '/scene' },
    { value: 'kling_30_pro', label: 'Kling 3.0 Pro 🔊',  badge: 'BEST',        badgeColor: '#f59e0b', desc: 'Best quality · native audio per clip',     credits: 140, creditsSuffix: '/scene' },
    { value: 'wan',          label: 'Wan v2.6',           badge: '1080P',       badgeColor: '#0ea5e9', desc: 'High resolution per scene',                credits: 100, creditsSuffix: '/scene' },
    { value: 'luma',         label: 'Luma Dream Machine', badge: 'SMOOTH',      badgeColor: '#5ac8fa', desc: 'Cinematic smooth motion',                  credits: 35,  creditsSuffix: '/scene' },
    { value: 'minimax',      label: 'MiniMax Video-01',   badge: 'PRECISE',     badgeColor: '#f97316', desc: 'Precise prompt following',                 credits: 110, creditsSuffix: '/scene' },
];

// ── ChipDropdown options ──────────────────────────────────────────────────────

const VOICE_OPTIONS: ChipOption[] = [
    { value: 'fable',   label: 'Fable',   desc: 'Warm storytelling'    },
    { value: 'alloy',   label: 'Alloy',   desc: 'Balanced, neutral'    },
    { value: 'echo',    label: 'Echo',    desc: 'Crisp & clear'        },
    { value: 'onyx',    label: 'Onyx',    desc: 'Deep, authoritative'  },
    { value: 'nova',    label: 'Nova',    desc: 'Bright, energetic'    },
    { value: 'shimmer', label: 'Shimmer', desc: 'Soft & gentle'        },
];

const MUSIC_OPTIONS: ChipOption[] = [
    { value: 'cinematic', label: 'Cinematic', desc: 'Epic orchestral, dramatic builds'    },
    { value: 'emotional', label: 'Emotional', desc: 'Soft piano, heartfelt strings'       },
    { value: 'adventure', label: 'Adventure', desc: 'Upbeat, heroic, fast-paced'          },
    { value: 'ambient',   label: 'Ambient',   desc: 'Gentle background, peaceful'         },
    { value: 'suspense',  label: 'Suspense',  desc: 'Tense, mysterious, dark tones'       },
    { value: 'uplifting', label: 'Uplifting', desc: 'Positive, motivational, bright'      },
    { value: 'no_music',  label: 'No Music',  desc: 'Narration only, no background track' },
];

const SCENE_OPTIONS: ChipOption[] = [
    { value: '3',  label: '3 scenes',  desc: '~15–30s · quick story'           },
    { value: '5',  label: '5 scenes',  desc: '~25–50s · short YouTube video'   },
    { value: '8',  label: '8 scenes',  desc: '~40s–1.3min · standard story'    },
    { value: '12', label: '12 scenes', desc: '~1–2 min · long-form narrative'  },
    { value: '16', label: '16 scenes', desc: '~1.3–2.7 min · extended video'   },
    { value: '20', label: '20 scenes', desc: '~1.7–3.3 min · epic story'       },
];

const DURATION_OPTIONS: ChipOption[] = [
    { value: '5',  label: '5s / scene',  desc: 'Fast generation · shorter clips' },
    { value: '10', label: '10s / scene', desc: 'Longer clips · more cinematic'   },
];

const SUGGESTIONS = [
    'A lone astronaut discovers a crystal planet that is alive and sending her a message.',
    'An old clockmaker repairs a watch that shows its owner their greatest regret - and how to fix it.',
    'A marine biologist and a singing whale must stop a corporation from draining the ocean.',
    'An AI learns to paint sunsets, creating a masterpiece so beautiful it stops an entire city.',
    'A girl finds a door that opens to a parallel world where she never existed.',
];

function fmtDuration(scenes: number, secPerScene: number): string {
    const total = scenes * secPerScene;
    if (total < 60) return `~${total}s`;
    const mins = (total / 60).toFixed(1);
    return `~${mins} min`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StoryGenerateData {
    prompt: string; sceneCount: number; sceneDuration: number; voice: string;
    videoModel: string; generateMusic: boolean; musicPrompt: string;
}

interface Props {
    onGenerate: (data: StoryGenerateData) => void;
    loading: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TextToStory({ onGenerate, loading }: Props) {
    const [prompt, setPrompt]               = useState('');
    const [sceneCount, setSceneCount]       = useState('5');
    const [sceneDuration, setSceneDuration] = useState('5');
    const [voice, setVoice]                 = useState('fable');
    const [music, setMusic]                 = useState('cinematic');
    const [videoModel, setVideoModel]       = useState('kling_21_pro');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const sceneNum   = parseInt(sceneCount, 10);
    const durNum     = parseInt(sceneDuration, 10);
    const durLabel   = fmtDuration(sceneNum, durNum);

    const credits = useMemo(() => {
        const base = STORY_MODELS.find(m => m.value === videoModel)?.credits ?? 98;
        const durMult = durNum > 5 ? 2 : 1;
        return base * durMult * sceneNum + 40;
    }, [sceneNum, durNum, videoModel]);

    const runGenerate = () => {
        const p = prompt.trim();
        if (!p) return;
        const noMusic   = music === 'no_music';
        const musicDesc = MUSIC_OPTIONS.find(m => m.value === music)?.desc ?? '';
        onGenerate({
            prompt: p, sceneCount: sceneNum, sceneDuration: durNum,
            voice, videoModel,
            generateMusic: !noMusic,
            musicPrompt: noMusic ? '' : musicDesc,
        });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <KreaDockRoot>
                <KreaDockPrompt
                    rows={3}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="Write your story or script here - then hit generate to turn it into a narrated video…"
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

                        {/* Model - ModelDropdown (same as TextToVideo) */}
                        <ModelDropdown
                            models={STORY_MODELS}
                            value={videoModel}
                            onChange={setVideoModel}
                            label=""
                            variant="dock"
                        />

                        {/* Scenes - ChipDropdown (3 → 5 → 8 → 12 → 16 → 20) */}
                        <ChipDropdown
                            icon={<Users size={14} strokeWidth={1.75} />}
                            value={sceneCount}
                            options={SCENE_OPTIONS}
                            onChange={setSceneCount}
                            disabled={loading}
                        />

                        {/* Clip duration per scene */}
                        <ChipDropdown
                            icon={<Timer size={14} strokeWidth={1.75} />}
                            value={sceneDuration}
                            options={DURATION_OPTIONS}
                            onChange={setSceneDuration}
                            disabled={loading}
                        />

                        {/* Total duration - read-only */}
                        <span className="krea-dock-chip" style={{ pointerEvents: 'none', opacity: 0.6 }}>
                            <Clock size={14} strokeWidth={1.75} />
                            {durLabel}
                        </span>

                        {/* Voice - ChipDropdown (proper portal dropdown) */}
                        <ChipDropdown
                            icon={<MicVocal size={14} strokeWidth={1.75} />}
                            value={voice}
                            options={VOICE_OPTIONS}
                            onChange={setVoice}
                            disabled={loading}
                        />

                        {/* Music - ChipDropdown (proper portal dropdown) */}
                        <ChipDropdown
                            icon={<Music2 size={14} strokeWidth={1.75} />}
                            value={music}
                            options={MUSIC_OPTIONS}
                            onChange={setMusic}
                            disabled={loading}
                        />

                        {/* Ideas toggle */}
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
            </KreaDockRoot>
        </div>
    );
}
