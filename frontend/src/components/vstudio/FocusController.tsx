'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FocusControllerProps {
    children: React.ReactNode;
    isFocusMode: boolean;
    appState: 'idle' | 'input-active' | 'loading' | 'generated' | 'error';
    onExitFocus: () => void;
}

export const FocusController: React.FC<FocusControllerProps> = ({
    children,
    isFocusMode,
    appState,
    onExitFocus
}) => {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onExitFocus();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onExitFocus]);

    return (
        <div className="relative z-20 h-full w-full">
            <AnimatePresence>
                {!isFocusMode && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{
                            opacity: appState === 'loading' ? 0 : 1,
                            filter: appState === 'input-active' ? 'blur(4px)' : 'blur(0px)'
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full w-full pointer-events-auto"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>

            {isFocusMode && (
                <div
                    className="fixed inset-0 z-50 cursor-zoom-out"
                    onClick={onExitFocus}
                />
            )}
        </div>
    );
};
