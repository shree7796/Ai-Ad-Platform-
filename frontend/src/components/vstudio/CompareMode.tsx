'use client';

import React, { useState } from 'react';
import { motion, useMotionValue } from 'framer-motion';

interface CompareModeProps {
    original: string;
    generated: string;
}

export const CompareMode: React.FC<CompareModeProps> = ({ original, generated }) => {
    const [sliderPos, setSliderPos] = useState(50);
    const dragX = useMotionValue(0);

    return (
        <div className="absolute inset-0 z-20 overflow-hidden cursor-col-resize select-none">
            {/* Original Image/Video */}
            <img src={original} className="absolute inset-0 h-full w-full object-cover" alt="Original" />

            {/* Generated Video (Clipped) */}
            <div
                className="absolute inset-0 h-full w-full object-cover overflow-hidden border-r-2 border-white/50"
                style={{ width: `${sliderPos}%` }}
            >
                <video
                    src={generated}
                    autoPlay
                    muted
                    loop
                    className="absolute inset-0 h-full w-screen object-cover"
                />
                <div className="absolute top-8 left-8 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white uppercase tracking-widest border border-white/10">
                    Generated
                </div>
            </div>

            {!generated && (
                <div className="absolute top-8 right-8 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-white uppercase tracking-widest border border-white/10">
                    Original
                </div>
            )}

            {/* Slider Handle */}
            <motion.div
                className="absolute top-0 bottom-0 w-1 bg-white/50 z-30"
                style={{ left: `${sliderPos}%` }}
                onPan={(_, info) => {
                    const newPos = Math.max(0, Math.min(100, (info.point.x / window.innerWidth) * 100));
                    setSliderPos(newPos);
                }}
            >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-2xl flex items-center justify-center pointer-events-none">
                    <div className="flex gap-1">
                        <div className="w-0.5 h-4 bg-black/20 rounded-full" />
                        <div className="w-0.5 h-4 bg-black/20 rounded-full" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
