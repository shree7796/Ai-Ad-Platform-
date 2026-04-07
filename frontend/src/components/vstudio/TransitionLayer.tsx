'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface TransitionLayerProps {
    mode: 'idle' | 'input-active' | 'loading' | 'generated' | 'error';
    isFocusMode: boolean;
}

export const TransitionLayer: React.FC<TransitionLayerProps> = ({ mode, isFocusMode }) => {
    return (
        <motion.div
            initial={false}
            animate={{
                backgroundColor: mode === 'input-active' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0)',
                backdropFilter: mode === 'loading' ? 'blur(10px) brightness(0.6)' : isFocusMode ? 'blur(0px)' : 'blur(0px)',
            }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-10 pointer-events-none"
        />
    );
};

type CinematicVariant = 'studio' | 'landing';

/** Landing keeps z below page content (z-20+) so hero video stays visible. Studio can sit above ambient layers. */
export const CinematicOverlay: React.FC<{ variant?: CinematicVariant }> = ({ variant = 'studio' }) => {
    const isLanding = variant === 'landing';
    return (
        <div
            className={`fixed inset-0 overflow-hidden pointer-events-none ${isLanding ? 'z-[8]' : 'z-[100]'}`}
        >
            <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none noise-bg" />
            <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${
                    isLanding
                        ? 'from-black/25 via-transparent to-black/45'
                        : 'from-black/40 via-transparent to-black/60'
                }`}
            />
            {/* Full-viewport blur reads as “no video” on marketing; keep for studio only. */}
            {!isLanding && (
                <div className="pointer-events-none absolute inset-0 backdrop-blur-[1px] mask-edge-blur" />
            )}
        </div>
    );
};
