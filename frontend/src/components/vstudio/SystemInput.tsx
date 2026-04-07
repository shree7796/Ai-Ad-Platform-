'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Video as VideoIcon, Send, Sparkles, Clock, Layers, ChevronUp } from 'lucide-react';

interface SystemInputProps {
    onGenerate: (prompt: string) => void;
    isLoading: boolean;
    onFocusChange: (isFocused: boolean) => void;
}

const SUGGESTIONS = [
    "A futuristic city at sunset, drone shot",
    "Cyberpunk street with neon rain",
    "Abstract flow of digital particles"
];

export const SystemInput: React.FC<SystemInputProps> = ({ onGenerate, isLoading, onFocusChange }) => {
    const [prompt, setPrompt] = useState('');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (prompt.trim() && !isLoading) {
            onGenerate(prompt);
        }
    };

    return (
        <div className="fixed bottom-12 left-1/2 -translate-x-1/2 w-full max-w-3xl px-6 z-40">
            <AnimatePresence>
                {!isLoading && prompt === '' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="flex gap-2 justify-center mb-6"
                    >
                        {SUGGESTIONS.map((s, i) => (
                            <button
                                key={i}
                                onClick={() => setPrompt(s)}
                                className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs hover:bg-white/10 hover:text-white/80 transition-all backdrop-blur-md"
                            >
                                {s}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={`relative group transition-all duration-500 ${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                {/* Input Bar */}
                <div className="bg-white/10 backdrop-blur-2xl border border-white/20 rounded-full p-2 flex items-center gap-2 shadow-2xl overflow-hidden">
                    <button className="p-3 text-white/40 hover:text-white transition-colors">
                        <ImageIcon size={20} />
                    </button>

                    <form onSubmit={handleSubmit} className="flex-1">
                        <input
                            ref={inputRef}
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onFocus={() => onFocusChange(true)}
                            onBlur={() => onFocusChange(false)}
                            placeholder="Describe your vision..."
                            className="w-full bg-transparent border-none outline-none text-white text-sm placeholder:text-white/30 px-2 h-12"
                        />
                    </form>

                    <div className="flex items-center gap-1 pr-1">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className={`p-3 rounded-full transition-all ${showAdvanced ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white'}`}
                        >
                            <ChevronUp size={20} className={`transition-transform duration-500 ${showAdvanced ? 'rotate-180' : ''}`} />
                        </button>

                        <button
                            onClick={handleSubmit}
                            disabled={!prompt.trim() || isLoading}
                            className={`p-3 rounded-full transition-all duration-500 ${prompt.trim()
                                    ? 'bg-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.5)] scale-105 active:scale-95'
                                    : 'bg-white/5 text-white/20'
                                }`}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>

                {/* Advanced Controls Dropdown */}
                <AnimatePresence>
                    {showAdvanced && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: -12, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            className="absolute bottom-full left-0 right-0 mb-4 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 shadow-2xl"
                        >
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <label className="text-white/40 text-[10px] uppercase tracking-widest mb-4 block">Duration</label>
                                    <div className="flex gap-2">
                                        {['5s', '10s', '15s'].map(d => (
                                            <button key={d} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors">
                                                {d}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-white/40 text-[10px] uppercase tracking-widest mb-4 block">Style Preset</label>
                                    <div className="flex gap-2">
                                        {['Cinematic', 'Anime', 'Real'].map(s => (
                                            <button key={s} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/5 text-white/60 text-xs hover:bg-white/10 transition-colors">
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
