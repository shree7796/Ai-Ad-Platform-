'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Film, Plus, Clock, CheckCircle2, XCircle, Loader2,
  LogOut, Sparkles, User, LayoutDashboard, History, ChevronRight, Play, Settings
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
  pending: { icon: Clock, color: 'text-white/40', label: 'PENDING' },
  processing: { icon: Loader2, color: 'text-brand-500', label: 'PROCESSING' },
  completed: { icon: CheckCircle2, color: 'text-brand-400', label: 'VALIDATED' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'FAILED' },
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
      toast.error('NETWORK_ERROR: UNABLE TO RETRIEVE ARTIFACTS');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
    toast.success('SESSION_TERMINATED');
  };

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
            <span className="font-display font-black text-2xl tracking-tighter uppercase italic">ADGEN<span className="text-brand-500">.</span>STUDIO</span>
          </Link>

          <div className="flex items-center gap-12">
            <div className="hidden md:flex items-center gap-10">
              <Link href="/explore" className="text-white/40 hover:text-white transition-all text-[10px] font-black tracking-[0.2em] uppercase italic">Explore</Link>
              <Link href="/editor" className="text-white/40 hover:text-white transition-all text-[10px] font-black tracking-[0.2em] uppercase italic">Studio</Link>
              <Link href="/pricing" className="text-white/40 hover:text-white transition-all text-[10px] font-black tracking-[0.2em] uppercase italic">Price</Link>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-8">
              <button onClick={handleLogout} className="text-white/20 hover:text-red-400 transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
              <Link href="/settings" className="w-12 h-12 rounded-2xl border border-white/[0.05] bg-surface-950 flex items-center justify-center p-0.5 shadow-2xl hover:border-white/10 transition-all">
                <div className="w-full h-full rounded-2xl bg-white/[0.02] flex items-center justify-center">
                  <User className="w-5 h-5 text-white/20" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-10 py-32 z-10 relative">

        {/* Dashboard Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-32 gap-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 font-mono text-[9px] font-black tracking-[0.3em] uppercase italic">
              SESSION_ACTIVE // {user?.email || 'ANONYMOUS_ROOT'}
            </div>
            <h1 className="text-7xl md:text-9xl font-display font-black tracking-tighter uppercase italic leading-[0.8]">CONTROL<br /><span className="text-white/10">CENTER</span>.</h1>
            <p className="text-white/20 text-xs font-black tracking-[0.2em] uppercase italic">
              {projects.length} NEURAL_ARTIFACTS // {projects.filter(p => p.status === 'completed').length} READY_FOR_DEPLOYMENT
            </p>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-glow h-24 px-16 rounded-[2rem] flex items-center justify-center gap-5 text-base font-black uppercase tracking-widest shadow-2xl italic group"
          >
            <Plus className="w-7 h-7 stroke-[3] group-hover:rotate-90 transition-transform" /> NEW GENERATION
          </button>
        </div>

        {/* Gallery Section */}
        <div className="space-y-16">
          <div className="flex items-center gap-12 border-b border-white/[0.03] pb-8">
            <button className="text-[10px] font-black uppercase tracking-[0.3em] text-white border-b-2 border-brand-500 pb-8 -mb-[34px] italic transition-all">Vault History</button>
            <button className="text-[10px] font-black uppercase tracking-[0.3em] text-white/10 hover:text-white/30 transition-all pb-8 -mb-[34px] italic">Global Trends</button>
            <button className="text-[10px] font-black uppercase tracking-[0.3em] text-white/10 hover:text-white/30 transition-all pb-8 -mb-[34px] italic">System Cloud</button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 pt-12">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="shimmer aspect-[4/5] rounded-[3.5rem]" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto py-48 text-center space-y-12"
            >
              <div className="w-32 h-32 rounded-[2.5rem] bg-white/[0.01] border border-white/[0.03] flex items-center justify-center mx-auto relative group">
                <div className="absolute inset-0 bg-brand-500/5 blur-[60px] group-hover:bg-brand-500/10 transition-colors" />
                <Sparkles className="w-12 h-12 text-white/05 group-hover:text-brand-500 transition-all relative z-10" />
              </div>
              <div>
                <h3 className="text-4xl font-display font-black tracking-tighter mb-6 uppercase italic">NEURAL ARCHIVE EMPTY</h3>
                <p className="text-white/10 text-[10px] font-black uppercase tracking-[0.4em] leading-relaxed max-w-md mx-auto italic">
                  Initiate your first generation sequence to populate your private cloud vault.
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="btn-glow inline-flex items-center gap-5 px-12 py-6 rounded-[1.5rem]"
              >
                <Plus className="w-6 h-6" /> START FIRST PROJECT
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-12 pt-12">
              {projects.map((project, i) => {
                const status = statusConfig[project.status] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="group"
                  >
                    <Link href={`/editor?project=${project.id}`} className="block">
                      {/* Media Card */}
                      <div className="relative aspect-[4/5] rounded-[3.5rem] bg-white/[0.01] border border-white/[0.03] overflow-hidden mb-8 transition-all duration-700 group-hover:border-brand-500/30 group-hover:shadow-[0_20px_40px_-15px_rgba(139,92,246,0.15)] group-hover:-translate-y-2">
                        {project.output_video_url ? (
                          <>
                            {(project.task_type?.includes('image') || project.output_video_url.endsWith('.jpg') || project.output_video_url.endsWith('.png')) ? (
                              <img src={project.output_video_url} alt="Result" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                            ) : (
                              <video
                                src={project.output_video_url}
                                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                muted
                                onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                                onMouseOut={(e) => {
                                  const v = e.target as HTMLVideoElement;
                                  v.pause();
                                  v.currentTime = 0;
                                }}
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 group-hover:opacity-40 transition-opacity" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                              <div className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center shadow-2xl">
                                <Play className="w-8 h-8 ml-1 fill-current" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-surface-950">
                            {project.status === 'processing' ? (
                              <div className="text-center space-y-6">
                                <div className="relative w-20 h-20 mx-auto">
                                  <div className="absolute inset-0 rounded-full border-4 border-white/[0.02]" />
                                  <div className="absolute inset-0 rounded-full border-t-4 border-brand-500 animate-spin" />
                                </div>
                                <span className="block text-brand-400 text-[10px] font-black uppercase tracking-[0.4em] italic leading-none">{status.label}</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-6 opacity-05">
                                <Film className="w-16 h-16" />
                                <span className="text-[10px] font-black uppercase tracking-[0.5em] italic">NULL_BUFFER</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Status badge overlaid */}
                        <div className="absolute top-10 left-10 flex items-center gap-3 px-4 py-2 rounded-xl bg-surface-950/80 backdrop-blur-md border border-white/5 shadow-2xl">
                          <StatusIcon className={`w-4 h-4 ${status.color} ${project.status === 'processing' ? 'animate-spin' : ''}`} />
                          <span className={`text-[10px] uppercase font-black tracking-[0.2em] ${status.color} italic`}>
                            {status.label}
                          </span>
                        </div>
                      </div>

                      {/* Info below card */}
                      <div className="px-4">
                        <h3 className="font-display font-black text-2xl tracking-tighter truncate uppercase italic text-white/40 group-hover:text-white transition-colors duration-500">
                          {project.title}
                        </h3>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.2em] italic">
                            {new Date(project.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          <span className="text-[10px] font-black text-brand-500/20 uppercase tracking-[0.2em] italic group-hover:text-brand-400 transition-colors duration-500">
                            OPEN_STUDIO →
                          </span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
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

          <div className="hidden lg:flex gap-16 font-black text-[10px] tracking-[0.4em] text-white/10 uppercase italic">
            <Link href="#" className="hover:text-brand-400 transition-colors">Portal_X</Link>
            <Link href="#" className="hover:text-brand-400 transition-colors">API_Registry</Link>
            <Link href="#" className="hover:text-brand-400 transition-colors">Node_Status</Link>
          </div>

          <p className="font-mono text-[9px] text-white/05 tracking-[0.5em] uppercase italic">
            LOCAL_VAULT_DEVOLUTION // 2026
          </p>
        </div>
      </footer>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}
