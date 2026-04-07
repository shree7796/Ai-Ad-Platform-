'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type VideoMode = 'idle' | 'input-active' | 'loading' | 'generated' | 'error';

interface VideoLayerProps {
    mode: VideoMode;
    source?: string;
    previousSource?: string;
    isFocusMode?: boolean;
}

const AMBIENT_VIDEOS = [
    'https://videos.pexels.com/video-files/4165682/4165682-uhd_2560_1440_30fps.mp4',
    'https://videos.pexels.com/video-files/3129595/3129595-uhd_2560_1440_30fps.mp4',
    'https://videos.pexels.com/video-files/3129957/3129957-uhd_2560_1440_30fps.mp4'
];

export const VideoLayer: React.FC<VideoLayerProps> = ({ mode, source, previousSource, isFocusMode }) => {
    const [ambientIndex, setAmbientIndex] = useState(0);
    const [nextAmbientIndex, setNextAmbientIndex] = useState(1);
    const [isTransitioningAmbient, setIsTransitioningAmbient] = useState(false);

    // Rotate ambient videos every 15s
    useEffect(() => {
        if (mode !== 'idle' && mode !== 'input-active') return;

        const interval = setInterval(() => {
            setIsTransitioningAmbient(true);
            setTimeout(() => {
                setAmbientIndex((prev) => (prev + 1) % AMBIENT_VIDEOS.length);
                setNextAmbientIndex((prev) => (prev + 1) % AMBIENT_VIDEOS.length);
                setIsTransitioningAmbient(false);
            }, 2000); // 2s crossfade
        }, 15000);

        return () => clearInterval(interval);
    }, [mode]);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-[#0f0f11]">
            <AnimatePresence mode="wait">
                {(mode === 'idle' || mode === 'input-active') && (
                    <motion.div
                        key={`ambient-${ambientIndex}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2, ease: 'easeInOut' }}
                        className="absolute inset-0"
                    >
                        <video
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="h-full w-full object-cover"
                            src={AMBIENT_VIDEOS[ambientIndex]}
                        />
                    </motion.div>
                )}

                {(mode === 'generated' || mode === 'loading') && source && (
                    <motion.div
                        key={source}
                        initial={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
                        animate={{
                            opacity: 1,
                            scale: isFocusMode ? 1.05 : 1,
                            filter: 'blur(0px)'
                        }}
                        transition={{
                            duration: 0.8,
                            ease: [0.16, 1, 0.3, 1],
                            delay: mode === 'generated' ? 0.3 : 0 // Cinematic reveal delay
                        }}
                        className="absolute inset-0"
                    >
                        <video
                            autoPlay
                            muted
                            loop
                            playsInline
                            className={`h-full w-full object-cover transition-all duration-700 ${mode === 'loading' ? 'brightness-50' : 'brightness-100'
                                }`}
                            src={source}
                        />
                    </motion.div>
                )}

                {mode === 'error' && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    >
                        {/* Previous content remains visible but blurred */}
                        <div className="text-center p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
                            <p className="text-white/80 text-lg">Something went wrong. Let's try again.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Cinematic Overlays */}
            <div className="absolute inset-0 pointer-events-none z-10">
                {/* Vignette */}
                <div className={`absolute inset-0 bg-radial-vignette transition-opacity duration-700 ${isFocusMode ? 'opacity-90' : 'opacity-60'}`} />

                {/* Grain */}
                <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay animate-grain" />
            </div>
        </div>
    );
};
