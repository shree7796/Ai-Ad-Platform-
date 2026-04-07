'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Film, Clock, CheckCircle2, XCircle, Loader2,
  LayoutDashboard, Sparkles, History as HistoryIcon,
  Play, Download, Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { projectsAPI } from '@/lib/api';
import { isAuthenticated } from '@/lib/auth';

interface Project {
  id: string;
  title: string;
  status: string;
  input_media_type: string | null;
  output_video_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const res = await projectsAPI.list(1, 50);
      setProjects(res.data);
    } catch {
      toast.error('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project?')) return;
    try {
      await projectsAPI.delete(id);
      setProjects(projects.filter((p) => p.id !== id));
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-accent-emerald" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-accent-amber animate-spin" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-white/40" />;
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Sidebar ── */}
      <aside className="w-64 border-r border-white/5 bg-surface-900/50 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center">
              <Film className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold">AdGen AI</span>
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium">
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <Link href="/editor" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-colors text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Create New
          </Link>
          <Link href="/history" className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-brand-500/10 text-brand-300 text-sm font-medium">
            <HistoryIcon className="w-4 h-4" />
            History
          </Link>
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-display font-bold mb-2">Generation History</h1>
          <p className="text-white/40 text-sm mb-8">All your past video generations</p>

          {/* Video preview modal */}
          {selectedVideo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
              onClick={() => setSelectedVideo(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="w-full max-w-3xl"
                onClick={(e) => e.stopPropagation()}
              >
                <video
                  src={selectedVideo}
                  className="w-full rounded-2xl aspect-video bg-black"
                  controls
                  autoPlay
                />
              </motion.div>
            </motion.div>
          )}

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="shimmer h-56 rounded-xl" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <HistoryIcon className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No history yet</h3>
              <p className="text-white/40 text-sm mb-6">
                Start generating to see your history here
              </p>
              <Link href="/editor" className="btn-glow inline-flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4" />
                Create Your First Ad
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project, i) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card-hover overflow-hidden group"
                >
                  {/* Thumbnail / Video Preview */}
                  <div className="aspect-video bg-surface-800 relative overflow-hidden">
                    {project.output_video_url ? (
                      <>
                        <video
                          src={project.output_video_url}
                          className="w-full h-full object-cover"
                          muted
                          onMouseOver={(e) => (e.target as HTMLVideoElement).play()}
                          onMouseOut={(e) => {
                            const v = e.target as HTMLVideoElement;
                            v.pause();
                            v.currentTime = 0;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setSelectedVideo(project.output_video_url!)}
                            className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                          >
                            <Play className="w-5 h-5 text-white ml-0.5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-8 h-8 text-white/10" />
                      </div>
                    )}

                    {/* Status badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs">
                      {statusIcon(project.status)}
                      <span className="capitalize">{project.status}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-medium text-sm truncate mb-1">{project.title}</h3>
                    <p className="text-white/30 text-xs">
                      {new Date(project.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3">
                      {project.output_video_url && (
                        <a
                          href={project.output_video_url}
                          download
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500/10 text-brand-300 text-xs hover:bg-brand-500/20 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </a>
                      )}
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
