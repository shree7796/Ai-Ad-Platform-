'use client';

import { useState, useMemo } from 'react';
import { Lightbulb, MicVocal, Music2, Clock } from 'lucide-react';
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

// value encodes "scenes_secPerScene" — parsed by the component
const LENGTH_OPTIONS: ChipOption[] = [
    { value: '3_5',   label: '~15s',     desc: '3 scenes · 5s each · quick story'          },
    { value: '5_5',   label: '~25s',     desc: '5 scenes · 5s each · short YouTube video'  },
    { value: '8_5',   label: '~40s',     desc: '8 scenes · 5s each · standard story'       },
    { value: '12_5',  label: '~1 min',   desc: '12 scenes · 5s each · long-form narrative' },
    { value: '16_5',  label: '~1.3 min', desc: '16 scenes · 5s each · extended video'      },
    { value: '20_5',  label: '~1.7 min', desc: '20 scenes · 5s each · epic story'          },
    { value: '5_10',  label: '~50s',     desc: '5 scenes · 10s each · cinematic clips'     },
    { value: '8_10',  label: '~1.3 min', desc: '8 scenes · 10s each · immersive story'     },
    { value: '12_10', label: '~2 min',   desc: '12 scenes · 10s each · full short film'    },
    { value: '16_10', label: '~2.7 min', desc: '16 scenes · 10s each · extended film'      },
    { value: '20_10', label: '~3.3 min', desc: '20 scenes · 10s each · epic film'          },
];

const SUGGESTIONS = [
    'A lone astronaut discovers a crystal planet that is alive and sending her a message.',
    'An old clockmaker repairs a watch that shows its owner their greatest regret - and how to fix it.',
    'A marine biologist and a singing whale must stop a corporation from draining the ocean.',
    'An AI learns to paint sunsets, creating a masterpiece so beautiful it stops an entire city.',
    'A girl finds a door that opens to a parallel world where she never existed.',
];

function parseLength(val: string): { scenes: number; dur: number } {
    const [s, d] = val.split('_').map(Number);
    return { scenes: s || 5, dur: d || 5 };
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
    const [prompt, setPrompt]         = useState('');
    const [length, setLength]         = useState('5_5');
    const [voice, setVoice]           = useState('fable');
    const [music, setMusic]           = useState('cinematic');
    const [videoModel, setVideoModel] = useState('kling_21_pro');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const { scenes: sceneNum, dur: durNum } = parseLength(length);

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

                        {/* Video length — one dropdown replaces scene count + clip duration + total */}
                        <ChipDropdown
                            icon={<Clock size={14} strokeWidth={1.75} />}
                            value={length}
                            options={LENGTH_OPTIONS}
                            onChange={setLength}
                            disabled={loading}
                        />

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
