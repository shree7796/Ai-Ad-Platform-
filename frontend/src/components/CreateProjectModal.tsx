'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Film, Image as ImageIcon, Sparkles, ArrowRight, Loader2 } from 'lucide-react';
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
      toast.error('Please enter a project name');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('task_type', taskType);
      
      const res = await projectsAPI.create(formData);
      const projectId = res.data.id;
      
      toast.success('Project created');
      onClose();
      router.push(`/editor?project=${projectId}`);
    } catch (error) {
      console.error('Create project error:', error);
      toast.error('Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-surface-950/80 backdrop-blur-xl"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg glass-card p-8 overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-accent-violet" />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 font-mono text-[10px] uppercase tracking-widest mb-4">
                <Sparkles className="w-3 h-3" /> New Project
              </div>
              <h2 className="text-3xl font-display font-medium">Create Your Vision</h2>
              <p className="text-white/40 mt-2">Scale your creativity with AI-powered production.</p>
            </div>

            <div className="space-y-6">
              {/* Project Title */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-white/50 ml-1">
                  Project Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Summer Campaign 2024"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-surface-900 border border-white/5 rounded-xl px-4 py-3 focus:border-brand-500/50 outline-none transition-colors text-white placeholder:text-white/20"
                  autoFocus
                />
              </div>

              {/* Task Type Selection */}
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase tracking-widest text-white/50 ml-1">
                  What are you creating?
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Image Card */}
                  <button
                    onClick={() => setTaskType('text_to_image')}
                    className={`flex flex-col items-start p-4 rounded-xl border transition-all ${
                      taskType === 'text_to_image'
                        ? 'bg-brand-500/10 border-brand-500/50 ring-1 ring-brand-500/50'
                        : 'bg-surface-900 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className={`p-2 rounded-lg mb-3 ${taskType === 'text_to_image' ? 'bg-brand-500 text-white' : 'bg-white/5 text-white/40'}`}>
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm">Image Generation</span>
                    <span className="text-[11px] text-white/30 text-left mt-1">High-quality AI renders</span>
                  </button>

                  {/* Video Card */}
                  <button
                    onClick={() => setTaskType('image_to_video')}
                    className={`flex flex-col items-start p-4 rounded-xl border transition-all ${
                      taskType === 'image_to_video'
                        ? 'bg-brand-500/10 border-brand-500/50 ring-1 ring-brand-500/50'
                        : 'bg-surface-900 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className={`p-2 rounded-lg mb-3 ${taskType === 'image_to_video' ? 'bg-brand-500 text-white' : 'bg-white/5 text-white/40'}`}>
                      <Film className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm">Video Generation</span>
                    <span className="text-[11px] text-white/30 text-left mt-1">Cinematic motion clips</span>
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleCreate}
                disabled={loading}
                className="w-full btn-glow flex items-center justify-center gap-2 group mt-4 h-12"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Continue to Studio
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
