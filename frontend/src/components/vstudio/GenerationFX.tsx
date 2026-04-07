'use client';

import React from 'react';
import { motion } from 'framer-motion';

export const GenerationFX: React.FC = () => {
    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-30">
            <div className="relative flex items-center justify-center mb-8">
                {/* Waveform Animation */}
                <div className="flex gap-1 h-12 items-center">
                    {[...Array(20)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="w-1 bg-white/40 rounded-full"
                            animate={{
                                height: [12, 32, 16, 44, 20],
                            }}
                            transition={{
                                duration: 1.5,
                                repeat: Infinity,
                                delay: i * 0.05,
                                ease: 'easeInOut',
                            }}
                        />
                    ))}
                </div>

                {/* Glow Shimmer */}
                <motion.div
                    className="absolute inset-x-[-100px] h-[300px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent opacity-0"
                    animate={{
                        opacity: [0, 0.5, 0],
                        translateX: ['-100%', '100%'],
                    }}
                    transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white/80 font-display text-sm tracking-widest uppercase"
            >
                Lumina is crafting your vision...
            </motion.div>

            {/* Fake Progress Bar */}
            <div className="mt-6 w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-white/40"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2.5, ease: 'linear' }}
                />
            </div>
        </div>
    );
};
