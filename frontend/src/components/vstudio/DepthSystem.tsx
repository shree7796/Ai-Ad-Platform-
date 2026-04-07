'use client';

import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export const DepthSystem: React.FC<{ isFocusMode: boolean }> = ({ isFocusMode }) => {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
    const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            const x = (clientX / window.innerWidth - 0.5) * 20;
            const y = (clientY / window.innerHeight - 0.5) * 20;
            mouseX.set(x);
            mouseY.set(y);
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[1]">
            {/* Parallax Layer */}
            <motion.div
                style={{ x: springX, y: springY }}
                className="absolute inset-[-40px] opacity-20 pointer-events-none"
            >
                <div className="absolute inset-0 bg-radial-vignette scale-110" />
            </motion.div>

            {/* Static Overlays */}
            <div className={`absolute inset-0 bg-black/20 transition-opacity duration-1000 ${isFocusMode ? 'opacity-60' : 'opacity-0'}`} />
        </div>
    );
};
