'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Film, Image as ImageIcon, Sparkles, ArrowRight, Loader2, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { projectsAPI } from '@/lib/api';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [taskType, setTaskType] = useState<'text_to_image' | 'image_to_video'>('image_to_video');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a project title');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('task_type', taskType);

      const res = await projectsAPI.create(formData);
      const projectId = res.data.id;

      toast.success('Sequence Initialized');
      onClose();
      router.push(`/editor?project=${projectId}`);
    } catch (error) {
      console.error('Create project error:', error);
      toast.error('Failed to initialize session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-surface-950/80 backdrop-blur-2xl"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            className="relative w-full max-w-xl bg-surface-950 border border-white/5 rounded-[3rem] p-10 md:p-14 overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-brand-500 via-blue-500 to-purple-600" />
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/10 blur-[100px] rounded-full" />

            <button
              onClick={onClose}
              className="absolute top-8 right-8 p-3 rounded-2xl bg-white/5 text-white/20 hover:text-white transition-all hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 font-mono text-[10px] uppercase font-black tracking-[0.2em] mb-6">
                <Zap className="w-3 h-3 fill-current" /> Initialize Sequence
              </div>
              <h2 className="text-4xl font-display font-black tracking-tighter uppercase italic">NEW PRODUCTION</h2>
              <p className="text-white/20 mt-3 text-xs font-bold tracking-widest uppercase italic">Configure your neural generation pipeline settings.</p>
            </div>

            <div className="space-y-10">
              {/* Project Title */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-1">
                  ARTIFACT IDENTIFIER
                </label>
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 to-blue-500 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition-opacity" />
                  <input
                    type="text"
                    placeholder="ENTER PROJECT NAME..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="relative w-full bg-surface-900 border border-white/5 rounded-2xl px-6 py-5 focus:border-brand-500/50 outline-none transition-all text-sm font-black tracking-widest uppercase text-white placeholder:text-white/10"
                    autoFocus
                  />
                </div>
              </div>

              {/* Task Type Selection */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-1">
                  PIPELINE TYPE
                </label>
                <div className="grid grid-cols-2 gap-6">
                  {/* Image Card */}
                  <button
                    onClick={() => setTaskType('text_to_image')}
                    className={`flex flex-col items-start p-6 md:p-8 rounded-[2rem] border-2 transition-all duration-500 group ${taskType === 'text_to_image'
                        ? 'bg-brand-500 border-brand-500 shadow-2xl shadow-brand-500/20'
                        : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                      }`}
                  >
                    <div className={`p-4 rounded-2xl mb-6 transition-colors ${taskType === 'text_to_image' ? 'bg-white text-brand-500' : 'bg-white/5 text-white/40 group-hover:text-white'}`}>
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <span className={`font-black text-sm uppercase tracking-tight italic ${taskType === 'text_to_image' ? 'text-white' : 'text-white/40'}`}>Image Gen</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 italic ${taskType === 'text_to_image' ? 'text-white/60' : 'text-white/20'}`}>Static Renders</span>
                  </button>

                  {/* Video Card */}
                  <button
                    onClick={() => setTaskType('image_to_video')}
                    className={`flex flex-col items-start p-6 md:p-8 rounded-[2rem] border-2 transition-all duration-500 group ${taskType === 'image_to_video'
                        ? 'bg-brand-500 border-brand-500 shadow-2xl shadow-brand-500/20'
                        : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                      }`}
                  >
                    <div className={`p-4 rounded-2xl mb-6 transition-colors ${taskType === 'image_to_video' ? 'bg-white text-brand-500' : 'bg-white/5 text-white/40 group-hover:text-white'}`}>
                      <Film className="w-6 h-6" />
                    </div>
                    <span className={`font-black text-sm uppercase tracking-tight italic ${taskType === 'image_to_video' ? 'text-white' : 'text-white/40'}`}>Video Gen</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest mt-1 italic ${taskType === 'image_to_video' ? 'text-white/60' : 'text-white/20'}`}>Cinematic Clips</span>
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-6">
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full btn-glow h-20 rounded-[1.5rem] flex items-center justify-center gap-4 group transition-all"
                >
                  {loading ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <span className="text-sm font-black uppercase tracking-[0.2em] italic">Open Studio</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
