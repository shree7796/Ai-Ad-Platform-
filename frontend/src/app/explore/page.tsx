'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Sparkles, Play, Search, Filter, ArrowRight, Zap, Flame, Star, Clock, ChevronRight } from 'lucide-react';

const trendingAds = [
    { id: 1, title: 'NEURAL_LEATHER_V4', style: 'Cinematic', creator: 'USER_88', views: '12K', img: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=800' },
    { id: 2, title: 'QUANTUM_WATCH_O1', style: 'Minimal', creator: 'ARCH_ROOT', views: '45K', img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=800' },
    { id: 3, title: 'PLASMA_JUICE_GEN', style: '3D Render', creator: 'STIM_CORE', views: '8K', img: 'https://images.unsplash.com/photo-1615485290382-441e4d0c9cb5?auto=format&fit=crop&q=80&w=800' },
    { id: 4, title: 'CYBER_PERFUME_S2', style: 'Cyberpunk', creator: 'NEO_VOID', views: '22K', img: 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?auto=format&fit=crop&q=80&w=800' },
];

const categories = [
    { name: 'TRENDING_NODE', icon: Flame, count: '142' },
    { name: 'TOP_RATED_ARTIFACT', icon: Star, count: '89' },
    { name: 'RECENT_GENERATIONS', icon: Clock, count: '512' },
    { name: 'EXPERIMENTAL_PIPELINE', icon: Zap, count: '24' },
];

export default function ExplorePage() {
    return (
        <div className="min-h-screen flex flex-col font-sans selection:bg-brand-500/30 overflow-x-hidden bg-black text-white">
            <div className="ambient-glow" />
            <div className="ambient-glow-bottom opacity-50" />

            {/* ── Navbar ── */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/[0.03] bg-surface-950/40 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-10 h-24 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-blue-600 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-110 transition-transform duration-500">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-display font-black text-2xl tracking-tighter uppercase italic text-white/90">ADGEN<span className="text-brand-500">.</span>STUDIO</span>
                    </Link>

                    <div className="flex items-center gap-12">
                        <div className="hidden md:flex items-center gap-10">
                            <Link href="/explore" className="text-white transition-all text-[10px] font-black tracking-[0.2em] uppercase italic border-b-2 border-brand-500 pb-1">Explore</Link>
                            <Link href="/dashboard" className="text-white/40 hover:text-white transition-all text-[10px] font-black tracking-[0.2em] uppercase italic">Vault</Link>
                            <Link href="/pricing" className="text-white/40 hover:text-white transition-all text-[10px] font-black tracking-[0.2em] uppercase italic">Price</Link>
                        </div>
                        <Link href="/editor" className="btn-glow px-10 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] italic transition-all">
                            START CREATING
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ── Header ── */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-10 py-32 z-10 relative">
                <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-32 gap-12">
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-3 px-6 py-2 rounded-xl bg-white/[0.03] border border-white/05 text-white/20 font-mono text-[9px] font-black tracking-[0.4em] uppercase italic">
                            GLOBAL_INDEX_SYNCHRONIZED
                        </div>
                        <h1 className="text-7xl md:text-9xl font-display font-black tracking-tighter uppercase italic leading-[0.8]">
                            DISCOVER<br /><span className="text-white/10 italic -skew-x-12">NEURAL_MODELS</span>.
                        </h1>
                    </div>

                    <div className="relative group lg:w-96">
                        <div className="absolute inset-0 bg-brand-500/10 blur-3xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                        <div className="relative h-20 bg-surface-950/40 border border-white/05 rounded-2xl flex items-center px-8 gap-5 backdrop-blur-xl">
                            <Search className="w-5 h-5 text-white/20" />
                            <input
                                placeholder="SEARCH_ARTIFACTS..."
                                className="bg-transparent border-none outline-none text-[11px] font-black tracking-[0.3em] uppercase italic text-white placeholder:text-white/10 w-full"
                            />
                            <button className="w-10 h-10 rounded-xl bg-white/03 border border-white/05 flex items-center justify-center hover:bg-white/05">
                                <Filter className="w-4 h-4 text-white/20" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Categories Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-32">
                    {categories.map((cat, i) => (
                        <motion.button
                            key={cat.name}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="p-10 rounded-[2.5rem] bg-white/[0.01] border border-white/03 transition-all duration-500 hover:border-brand-500/20 hover:bg-white/[0.03] flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 rounded-2xl bg-white/02 border border-white/05 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <cat.icon className="w-5 h-5 text-brand-500" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] italic text-white/40 group-hover:text-white transition-colors">{cat.name}</p>
                                    <p className="text-[9px] font-bold text-white/10 uppercase tracking-widest italic">{cat.count} ITEMS</p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/10 group-hover:translate-x-1 transition-transform" />
                        </motion.button>
                    ))}
                </div>

                {/* Main Feed */}
                <div className="space-y-16">
                    <div className="flex items-center justify-between border-b border-white/03 pb-8">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.5em] italic text-white">TRENDING_SEQUENCES</h3>
                        <div className="flex items-center gap-10">
                            <Link href="/editor" className="text-[9px] font-black uppercase tracking-[0.3em] italic text-brand-400 hover:text-brand-300 transition-all flex items-center gap-3">
                                ALL_ARTIFACTS <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                        {trendingAds.map((ad, i) => (
                            <motion.div
                                key={ad.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="group"
                            >
                                <div className="aspect-[4/5] rounded-[3.5rem] bg-white/[0.01] border border-white/05 overflow-hidden mb-8 relative transition-all duration-700 hover:border-brand-500/30 hover:-translate-y-2 hover:shadow-2xl">
                                    <img src={ad.img} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-60 group-hover:opacity-100" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 pointer-events-none">
                                        <div className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center">
                                            <Play className="w-8 h-8 ml-1 fill-current" />
                                        </div>
                                    </div>

                                    <div className="absolute top-10 right-10 flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-950/80 backdrop-blur-md border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[9px] font-black tracking-widest text-white/40 italic">{ad.views} RENDERS</span>
                                    </div>
                                </div>
                                <div className="px-5">
                                    <h4 className="text-2xl font-display font-black tracking-tighter uppercase italic text-white/40 group-hover:text-white transition-colors duration-500">{ad.title}</h4>
                                    <div className="flex items-center justify-between mt-4">
                                        <span className="text-[9px] font-black text-white/05 uppercase tracking-[0.3em] italic">{ad.creator}</span>
                                        <span className="text-[9px] font-black text-brand-500 uppercase tracking-[0.4em] italic opacity-40 group-hover:opacity-100 transition-opacity">#{ad.style}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Templates Banner */}
                <div className="mt-48 rounded-[5rem] bg-gradient-to-br from-brand-500/10 to-blue-600/05 border border-brand-500/20 p-16 md:p-32 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-brand-500/20 blur-[180px] opacity-10" />
                    <div className="relative z-10 flex flex-col items-center text-center max-w-4xl mx-auto space-y-12">
                        <span className="text-[10px] font-black text-brand-400 uppercase tracking-[0.6em] italic animate-pulse">SYSTEM_RECOMMENDATION</span>
                        <h2 className="text-6xl md:text-8xl font-display font-black tracking-tighter uppercase italic leading-[0.8]">
                            SCALE_BY_<br /><span className="text-white/10 italic">TEMPLATE</span>.
                        </h2>
                        <p className="text-white/20 text-lg font-bold tracking-[0.1em] uppercase italic max-w-2xl leading-relaxed">
                            Adopt pre-calibrated neural archetypes to ensure 100% conversion fidelity across all global marketing nodes.
                        </p>
                        <button className="btn-glow h-24 px-20 rounded-[2.5rem] flex items-center gap-8 group">
                            <span className="text-[12px] font-black uppercase tracking-[0.4em] italic">VIEW_COLLECTIONS</span>
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-3 transition-transform" />
                        </button>
                    </div>
                </div>
            </main>

            {/* ── Footer ── */}
            <footer className="py-32 px-10 border-t border-white/[0.02] relative z-10 flex justify-center">
                <div className="max-w-7xl w-full flex flex-col md:flex-row items-center justify-between gap-16">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center shadow-2xl">
                            <Sparkles className="w-6 h-6 text-brand-500" />
                        </div>
                        <span className="font-display font-black tracking-tighter text-3xl italic">ADGEN<span className="text-white/10">.STUDIO</span></span>
                    </div>

                    <p className="font-mono text-[9px] text-white/05 tracking-[0.5em] uppercase italic">
                        GLOBAL_INDEX_DEVOLUTION // 2026
                    </p>
                </div>
            </footer>
        </div>
    );
}
