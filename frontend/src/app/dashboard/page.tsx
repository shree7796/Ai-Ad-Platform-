'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Film, Plus, Clock, CheckCircle2, XCircle, Loader2,
  LogOut, Sparkles, User, LayoutDashboard, History, ChevronRight, Play
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI } from '@/lib/api';
import { getUser, clearAuth, isAuthenticated } from '@/lib/auth';
import CreateProjectModal from '@/components/CreateProjectModal';

interface Project {
  id: string;
  title: string;
  status: string;
  task_type?: string | null;
  input_media_type: string | null;
  output_video_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
  pending: { icon: Clock, color: 'text-white/40', label: 'Pending' },
  processing: { icon: Loader2, color: 'text-brand-500', label: 'Processing' },
  completed: { icon: CheckCircle2, color: 'text-accent-emerald', label: 'Completed' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
};

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const user = getUser();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await projectsAPI.list();
      setProjects(res.data);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
    toast.success('Signed out');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      <div className="ambient-glow" />

      {/* ── Studio Header ── */}
      <header className="h-16 border-b border-white/5 bg-surface-950/50 backdrop-blur-md flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Film className="w-4 h-4 text-brand-500" />
            </div>
            <span className="font-display font-medium">Studio</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 font-mono text-xs uppercase tracking-widest">
            Dashboard
          </div>
        </div>

        <div className="flex items-center gap-6">
          <Link href="/pricing" className="text-white/50 hover:text-white transition-colors text-xs font-mono uppercase tracking-widest">Pricing</Link>
          <Link href="/contact" className="text-white/50 hover:text-white transition-colors text-xs font-mono uppercase tracking-widest">Contact</Link>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-mono text-white/40 hover:text-white transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
          <div className="w-8 h-8 rounded-full bg-surface-800 border border-white/5 flex items-center justify-center">
             <User className="w-4 h-4 text-white/50" />
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 z-10">
        
        {/* Header Options */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-display font-medium mb-2">Your Generations</h1>
            <p className="text-white/40 font-mono text-sm tracking-wide uppercase">
              {projects.length} Total Assets &bull; {projects.filter(p => p.status === 'completed').length} Completed
            </p>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-glow inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>

        {/* Gallery Grid */}
        <div className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="shimmer aspect-video rounded-xl" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-16 text-center max-w-2xl mx-auto"
            >
              <div className="w-20 h-20 rounded-full bg-surface-950/50 border border-white/5 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-brand-500 opacity-50" />
              </div>
              <h3 className="text-2xl font-display font-medium mb-3">No creations yet</h3>
              <p className="text-white/40 mb-8 max-w-sm mx-auto font-mono text-sm uppercase tracking-widest leading-relaxed">
                Start your creative journey by generating your first AI-powered video or image.
              </p>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-glow inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create First Project
              </button>
            </motion.div>
          ) : (

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {projects.map((project, i) => {
                const status = statusConfig[project.status] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="group"
                  >
                    <Link href={`/editor?project=${project.id}`} className="block">
                      {/* Media Card */}
                      <div className="relative aspect-video rounded-xl bg-surface-900 border border-white/5 overflow-hidden mb-3 group-hover:border-brand-500/50 transition-colors">
                        {project.output_video_url ? (
                          <>
                            {(project.task_type?.includes('image') || project.output_video_url.endsWith('.jpg') || project.output_video_url.endsWith('.png')) ? (
                               <img src={project.output_video_url} alt="Result" className="w-full h-full object-cover" />
                            ) : (
                              <video
                                src={project.output_video_url}
                                className="w-full h-full object-cover scale-105 group-hover:scale-100 transition-transform duration-500"
                                muted
                                onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                                onMouseOut={(e) => {
                                  const v = e.target as HTMLVideoElement;
                                  v.pause();
                                  v.currentTime = 0;
                                }}
                              />
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center backdrop-blur-sm">
                                <Play className="w-5 h-5 ml-1" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-surface-950">
                            {project.status === 'processing' ? (
                               <div className="text-center">
                                 <Loader2 className="w-8 h-8 text-brand-500 animate-spin mx-auto mb-2 opacity-50" />
                                 <span className="text-brand-500 text-xs font-mono uppercase tracking-widest">{status.label}</span>
                               </div>
                            ) : (
                              <Film className="w-8 h-8 text-white/10" />
                            )}
                          </div>
                        )}
                        
                        {/* Status badge overlaid */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-950/80 backdrop-blur-md border border-white/10">
                           <StatusIcon className={`w-3 h-3 ${status.color} ${project.status === 'processing' ? 'animate-spin' : ''}`} />
                           <span className={`text-[10px] uppercase font-mono tracking-wider ${status.color}`}>
                             {project.status === 'completed' ? 'Done' : status.label}
                           </span>
                        </div>
                      </div>

                      {/* Info below card */}
                      <div>
                        <h3 className="font-medium text-[15px] truncate text-white/90 group-hover:text-white transition-colors">
                          {project.title}
                        </h3>
                        <p className="text-xs text-white/30 font-mono mt-1">
                          {new Date(project.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <CreateProjectModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}
