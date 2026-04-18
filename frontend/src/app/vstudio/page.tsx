'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoLayer } from '@/components/vstudio/VideoLayer';
import { TransitionLayer, CinematicOverlay } from '@/components/vstudio/TransitionLayer';
import { FocusController } from '@/components/vstudio/FocusController';
import { GenerationFX } from '@/components/vstudio/GenerationFX';
import { SystemInput } from '@/components/vstudio/SystemInput';
import { DepthSystem } from '@/components/vstudio/DepthSystem';
import { VideoSlider } from '@/components/vstudio/VideoSlider';
import { Sparkles } from 'lucide-react';
import { studioThumbDataUri } from '@/lib/gradientMedia';
import {
    LOCAL_CLIP_ABSTRACT,
    LOCAL_CLIP_FLOWER,
    LOCAL_CLIP_FOREST,
    LOCAL_PROMO_CLIP,
    LOCAL_KIDS_TOY_CLIP,
} from '@/lib/landingVideoSources';
import { generationAPI, projectsAPI, formatApiError } from '@/lib/api';
import { BRAND_NAME } from '@/lib/brand';

type AppState = 'idle' | 'input-active' | 'loading' | 'generated' | 'error';

/** Five distinct locals; kids/toy clip appears only once (single thumb). */
const SAMPLE_VARIATIONS = [
    { id: '1', thumbnail: studioThumbDataUri(0), source: LOCAL_PROMO_CLIP },
    { id: '2', thumbnail: studioThumbDataUri(1), source: LOCAL_CLIP_FLOWER },
    { id: '3', thumbnail: studioThumbDataUri(2), source: LOCAL_CLIP_ABSTRACT },
    { id: '4', thumbnail: studioThumbDataUri(3), source: LOCAL_CLIP_FOREST },
    { id: '5', thumbnail: studioThumbDataUri(4), source: LOCAL_KIDS_TOY_CLIP },
    { id: '6', thumbnail: studioThumbDataUri(5), source: LOCAL_CLIP_FLOWER },
];

export default function VStudioPage() {
    const [state, setState] = useState<AppState>('idle');
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [activeVideo, setActiveVideo] = useState(SAMPLE_VARIATIONS[0]);
    const [entryPhase, setEntryPhase] = useState(0);

    // Staggered Entry Animation
    useEffect(() => {
        const sequence = [
            { time: 400, phase: 1 }, // Show Video Layer
            { time: 1000, phase: 2 }, // Show Hero
            { time: 1600, phase: 3 }, // Show Input
        ];

        sequence.forEach(({ time, phase }) => {
            setTimeout(() => setEntryPhase(phase), time);
        });
    }, []);

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const pollStatus = async (sceneId: string) => {
        const interval = setInterval(async () => {
            try {
                const res = await generationAPI.status(sceneId);
                const { status, output_video_url, error_message } = res.data;

                if (status === 'completed') {
                    clearInterval(interval);
                    setState('generated');
                    setActiveVideo({
                        id: sceneId,
                        thumbnail: studioThumbDataUri(Math.floor(Math.random() * 6)),
                        source: output_video_url,
                    });
                } else if (status === 'failed') {
                    clearInterval(interval);
                    setState('error');
                    setErrorMsg(error_message || 'Video generation failed.');
                }
            } catch (err) {
                clearInterval(interval);
                setState('error');
            }
        }, 2000);
    };

    const handleGenerate = useCallback(async (prompt: string) => {
        setState('loading');
        setErrorMsg(null);

        try {
            // 1. Create a project
            const formData = new FormData();
            formData.append('title', `Cinematic ${new Date().toLocaleTimeString()}`);
            formData.append('task_type', 'text_to_video');
            const projectRes = await projectsAPI.create(formData);
            const project_id = projectRes.data.id;

            // 2. Trigger Generation
            const genRes = await generationAPI.trigger({
                project_id,
                prompt,
                task_type: 'text_to_video',
                duration_seconds: 5,
                enhance_prompt: true,
            });

            const { scene_id } = genRes.data;

            // 3. Status Polling
            pollStatus(scene_id);

        } catch (e: unknown) {
            console.error('Generation Error:', e);
            setState('error');
            setErrorMsg(formatApiError(e, 'Failed to start generation.'));
        }
    }, []);

    return (
        <main className="relative h-screen w-screen bg-[#0f0f11] font-sans selection:bg-purple-500/30 overflow-hidden">
            {/* Core Video Engine */}
            <VideoLayer
                mode={state}
                source={activeVideo.source}
                isFocusMode={isFocusMode}
            />

            {/* Motion System */}
            <TransitionLayer mode={state} isFocusMode={isFocusMode} />
            <CinematicOverlay />
            <DepthSystem isFocusMode={isFocusMode} />

            {/* UI Elements */}
            <FocusController
                isFocusMode={isFocusMode}
                appState={state}
                onExitFocus={() => setIsFocusMode(false)}
            >
                {/* Hero Section */}
                <AnimatePresence>
                    {state === 'idle' && entryPhase >= 2 && (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-20 pointer-events-none"
                        >
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="flex items-center gap-3 mb-6 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md"
                            >
                                <Sparkles size={14} className="text-purple-400" />
                                <span className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-medium">New: Dream Machine v2</span>
                            </motion.div>

                            <h1 className="text-white text-6xl md:text-8xl font-display font-black tracking-tight mb-6 leading-none drop-shadow-2xl">
                                Create cinematic <br /> AI videos
                            </h1>
                            <p className="max-w-xl text-white/50 text-lg md:text-xl font-light leading-relaxed">
                                Generate, edit, and animate visuals from text, images, or video.
                                Focus on the story, we'll handle the pixels.
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Global Prompt System */}
                {entryPhase >= 3 && (
                    <SystemInput
                        onGenerate={handleGenerate}
                        isLoading={state === 'loading'}
                        onFocusChange={(focused) => setState(focused ? 'input-active' : 'idle')}
                    />
                )}

                {/* Focus Mode Hook */}
                <div
                    className="absolute inset-x-0 top-0 h-[70%] z-10 cursor-zoom-in"
                    onClick={() => state === 'generated' && setIsFocusMode(true)}
                />
            </FocusController>

            {/* Overlays / Non-Focus UI */}
            {!isFocusMode && (
                <>
                    <AnimatePresence>
                        {state === 'loading' && <GenerationFX />}
                    </AnimatePresence>

                    <VideoSlider
                        variations={SAMPLE_VARIATIONS}
                        activeId={activeVideo.id}
                        onSelect={setActiveVideo}
                        isVisible={state === 'generated'}
                    />
                </>
            )}

            {/* Floating Header Branding */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: entryPhase >= 2 ? 1 : 0 }}
                className="absolute top-8 left-8 z-50 flex items-center gap-4"
            >
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-2xl">
                    <div className="w-5 h-5 bg-black rounded-sm rotate-45" />
                </div>
                <div className="flex flex-col">
                    <span className="text-white font-display font-bold text-sm tracking-widest uppercase">{BRAND_NAME}</span>
                    <span className="text-white/20 text-[10px] tracking-tighter uppercase font-medium">Production Studio</span>
                </div>
            </motion.div>
        </main>
    );
}
