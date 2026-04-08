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
            {/* Animated Vector Background */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-20">
              <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                 <defs>
                   <pattern id="vector-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                     <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.1" className="text-brand-500/30" />
                     <circle cx="0" cy="0" r="0.2" fill="currentColor" className="text-brand-500/50" />
                   </pattern>
                 </defs>
                 <rect width="100" height="100" fill="url(#vector-grid)" />
                 <motion.circle 
                   animate={{ 
                     cx: [20, 80, 50, 20], 
                     cy: [20, 50, 80, 20],
                     opacity: [0.3, 0.6, 0.3]
                   }}
                   transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                   r="30" fill="url(#grad1)" className="opacity-10" 
                 />
                 <defs>
                   <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                     <stop offset="0%" style={{ stopColor: '#0066FF', stopOpacity: 1 }} />
                     <stop offset="100%" style={{ stopColor: '#0066FF', stopOpacity: 0 }} />
                   </radialGradient>
                 </defs>
              </svg>
            </div>

            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-accent-violet z-10" />
            
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors z-20"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-10 mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 font-mono text-[10px] uppercase tracking-widest mb-4">
                <Sparkles className="w-3 h-3" /> Vectors of Creation
              </div>
              <h2 className="text-3xl font-display font-medium">Create Your Vision</h2>
              <p className="text-white/40 mt-2">Scale your creativity with AI-powered production.</p>
            </div>

            <div className="relative z-10 space-y-6">
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
                  className="w-full bg-surface-950/50 border border-white/5 rounded-xl px-4 py-3 focus:border-brand-500/50 outline-none transition-colors text-white placeholder:text-white/20 backdrop-blur-sm"
                  autoFocus
                />
              </div>

              {/* Task Type Selection */}
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase tracking-widest text-white/50 ml-1">
                  Choose your creation path
                </label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Image Card */}
                  <button
                    onClick={() => setTaskType('text_to_image')}
                    className={`group/card relative flex flex-col items-start p-4 rounded-xl border overflow-hidden transition-all h-32 ${
                      taskType === 'text_to_image'
                        ? 'border-brand-500/50 ring-1 ring-brand-500/50 shadow-lg shadow-brand-500/10'
                        : 'bg-surface-900/50 border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Background Preview */}
                    <div className="absolute inset-0 z-0">
                      <img 
                        src="/assets/text_to_image_preview.png" 
                        alt="" 
                        className={`w-full h-full object-cover transition-all duration-700 ${
                          taskType === 'text_to_image' ? 'opacity-40 scale-110 rotate-1' : 'opacity-10 grayscale group-hover/card:opacity-20 group-hover/card:scale-105'
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/60 to-transparent" />
                    </div>

                    <div className="relative z-10">
                      <div className={`p-2 rounded-lg mb-2 transition-colors ${taskType === 'text_to_image' ? 'bg-brand-500 text-white' : 'bg-white/5 text-white/40'}`}>
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-sm block">Text to Image</span>
                      <span className="text-[10px] text-white/40 text-left mt-1 line-clamp-2">High-definition AI-generated artwork</span>
                    </div>
                  </button>

                  {/* Video Card */}
                  <button
                    onClick={() => setTaskType('image_to_video')}
                    className={`group/card relative flex flex-col items-start p-4 rounded-xl border overflow-hidden transition-all h-32 ${
                      taskType === 'image_to_video'
                        ? 'border-brand-500/50 ring-1 ring-brand-500/50 shadow-lg shadow-brand-500/10'
                        : 'bg-surface-900/50 border-white/5 hover:border-white/10'
                    }`}
                  >
                    {/* Background Preview */}
                    <div className="absolute inset-0 z-0">
                      <img 
                        src="/assets/text_to_video_preview.png" 
                        alt="" 
                        className={`w-full h-full object-cover transition-all duration-700 ${
                          taskType === 'image_to_video' ? 'opacity-40 scale-110 -rotate-1' : 'opacity-10 grayscale group-hover/card:opacity-20 group-hover/card:scale-105'
                        }`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/60 to-transparent" />
                    </div>

                    <div className="relative z-10">
                      <div className={`p-2 rounded-lg mb-2 transition-colors ${taskType === 'image_to_video' ? 'bg-brand-500 text-white' : 'bg-white/5 text-white/40'}`}>
                        <Film className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-sm block">Image to Video</span>
                      <span className="text-[10px] text-white/40 text-left mt-1 line-clamp-2">Cinematic motion and starfield dynamics</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleCreate}
                disabled={loading}
                className="relative z-10 w-full btn-glow flex items-center justify-center gap-2 group mt-4 h-12 overflow-hidden"
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
