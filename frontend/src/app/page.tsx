'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Zap, Layers, Play, ArrowRight, Film, ImageIcon, Video, Cpu } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';
import { modelsAPI } from '@/lib/api';

const products = [
  {
    title: 'Text → Video',
    desc: 'Describe your vision, and AI brings it to life.',
    icon: <Video className="w-5 h-5" />,
    type: 'text_to_video',
  },
  {
    title: 'Image → Video',
    desc: 'Easily animate any product image into a cinematic ad.',
    icon: <Film className="w-5 h-5" />,
    type: 'image_to_video',
  },
  {
    title: 'Text → Image',
    desc: 'Generate gorgeous, photorealistic ad concepts.',
    icon: <ImageIcon className="w-5 h-5" />,
    type: 'text_to_image',
  },
  {
    title: 'Image → Image',
    desc: 'Transform your existing assets with AI stylization.',
    icon: <Layers className="w-5 h-5" />,
    type: 'image_to_image',
  },
];

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  quality_score: number;
  cost_per_unit: number;
  minimum_tier: string;
}

export default function LandingPage() {
  const router = useRouter();
  const [isAuth, setIsAuth] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [heroPrompt, setHeroPrompt] = useState('');

  useEffect(() => {
    setIsAuth(isAuthenticated());
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const res = await modelsAPI.list();
      setModels(res.data);
    } catch {
      console.error('Failed to load models');
    } finally {
      setModelsLoading(false);
    }
  };

  const handleImagineClick = () => {
    if (!isAuth) {
      router.push('/login');
    } else {
      const url = `/editor?task_type=text_to_video${heroPrompt ? `&prompt=${encodeURIComponent(heroPrompt)}` : ''}`;
      router.push(url);
    }
  };

  const getQualityLabel = (score: number) => {
    if (score >= 9) return 'Ultra';
    if (score >= 7) return 'High HQ';
    if (score >= 5) return 'Medium';
    return 'Base';
  };

  const getCostLabel = (cost: number) => {
    if (cost >= 0.5) return 'Premium';
    if (cost >= 0.2) return 'Pro';
    if (cost > 0) return 'Standard';
    return 'Free';
  };

  return (
    <div className="min-h-screen font-sans">
      <div className="ambient-glow" />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-surface-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded bg-brand-500/10 border border-brand-500/20 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
              <Film className="w-4 h-4 text-brand-500" />
            </div>
            <span className="font-display font-medium text-lg tracking-tight">AdGen Studio</span>
          </Link>

          <div className="flex items-center gap-8">
            <Link href="#products" className="text-white/50 hover:text-white transition-colors text-sm font-medium">
              Capabilities
            </Link>
            <Link href="/pricing" className="text-white/50 hover:text-white transition-colors text-sm font-medium">
              Pricing
            </Link>
            <Link href="/contact" className="text-white/50 hover:text-white transition-colors text-sm font-medium">
              Contact
            </Link>
            
            {isAuth ? (
              <Link href="/dashboard" className="btn-glow text-sm py-2 px-5 !rounded-lg">
                Enter Studio
              </Link>
            ) : (
              <div className="flex items-center gap-6">
                <Link href="/login" className="text-white/50 hover:text-white transition-colors text-sm font-medium">
                  Log in
                </Link>
                <Link href="/register" className="btn-glow text-sm py-2 px-5 !rounded-lg">
                  Get Started
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-48 pb-32 px-6 relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 font-mono text-xs font-semibold tracking-wider mb-8 uppercase"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AdGen V2 Engine
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-8xl font-display font-medium tracking-tighter mb-6"
        >
          Dream it.<br/>
          <span className="text-white/30">Generate it.</span>
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-4xl relative mt-8"
        >
          <div className="absolute -inset-2 bg-brand-500/10 blur-2xl opacity-50 rounded-3xl" />
          <div className="relative flex items-center bg-surface-900 border border-white/5 rounded-2xl p-2 shadow-2xl focus-within:border-brand-500/30 transition-colors">
             <input 
               type="text" 
               value={heroPrompt}
               onChange={(e) => setHeroPrompt(e.target.value)}
               placeholder="A neon sports car drifting through a cyberpunk city..." 
               className="flex-1 bg-transparent border-none outline-none text-white text-xl px-6 py-5 placeholder:text-white/20 font-sans"
               onKeyDown={(e) => e.key === 'Enter' && handleImagineClick()}
             />
             <button 
               onClick={handleImagineClick}
               className="btn-glow px-10 py-5 m-1 flex items-center gap-2 font-display text-lg tracking-wide rounded-xl shrink-0 text-surface-950 font-bold"
             >
               Imagine <Sparkles className="w-5 h-5 fill-surface-950" />
             </button>
          </div>
        </motion.div>
      </section>

      {/* ── Products Grid ── */}
      <section id="products" className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-2xl font-display font-medium tracking-tight mb-2">Vectors of Creation</h2>
            <p className="text-white/40 font-mono text-sm">/ pipelines</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {products.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Link href={isAuth ? `/editor?task_type=${p.type}` : '/login'} className="flex flex-col h-full bg-surface-900/40 border border-white/5 rounded-2xl p-6 group transition-all hover:border-brand-500/30 hover:bg-surface-800/60 hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-lg bg-surface-800 flex items-center justify-center mb-6 text-brand-500 group-hover:bg-brand-500/10 transition-colors">
                    {p.icon}
                  </div>
                  <h3 className="text-xl font-medium tracking-tight mb-2">{p.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed flex-1">{p.desc}</p>
                  <div className="mt-6 flex items-center gap-2 text-brand-500 text-xs font-mono font-medium opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all uppercase tracking-wider">
                    Launch <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Models Grid ── */}
      <section id="models" className="py-32 px-6 relative z-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-2xl font-display font-medium tracking-tight mb-2">Model Ecosystem</h2>
            <p className="text-white/40 font-mono text-sm">/ engines</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modelsLoading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="bg-surface-900/40 border border-white/5 rounded-2xl p-6 h-48 shimmer" />
              ))
            ) : models.length > 0 ? (
              models.map((model, i) => (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-surface-900/40 border border-white/5 rounded-2xl p-6 group hover:border-brand-500/30 hover:bg-surface-800/60 transition-colors flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-medium tracking-tight flex items-center gap-3">
                      <Cpu className="w-5 h-5 text-brand-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                      {model.name}
                    </h3>
                    <span className="text-[10px] font-mono tracking-widest px-2 py-1 rounded bg-surface-800/50 text-white/50 uppercase">
                      {model.provider}
                    </span>
                  </div>
                  <p className="text-white/40 text-sm mb-8 flex-1 leading-relaxed">
                    {model.description || 'No description available.'}
                  </p>
                  
                  <div className="flex items-center gap-6 text-sm pt-4 border-t border-white/5">
                    <div>
                      <span className="text-white/20 block font-mono text-[10px] uppercase tracking-widest mb-1">Qual</span>
                      <span className="font-medium text-white/80 text-xs">{getQualityLabel(model.quality_score)}</span>
                    </div>
                    {model.cost_per_unit > 0 && (
                      <div>
                        <span className="text-white/20 block font-mono text-[10px] uppercase tracking-widest mb-1">Tier</span>
                        <span className="font-medium text-brand-500 text-xs">{getCostLabel(model.cost_per_unit)}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))
            ) : (
                <div className="col-span-full py-12 text-center text-white/30 font-mono text-sm">
                  {'>'} no active models found
                </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 px-6 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-white/30 text-sm font-mono tracking-wide">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Film className="w-2.5 h-2.5 text-brand-500" />
            </div>
            <span>AdGen Studio</span>
          </div>
          <p>&copy; 2026</p>
        </div>
      </footer>
    </div>
  );
}
