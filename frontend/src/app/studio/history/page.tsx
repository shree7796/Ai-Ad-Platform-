'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Sidebar from '@/components/studio/Sidebar';
import StudioIconRail from '@/components/studio/StudioIconRail';
import { projectsAPI, formatApiError } from '@/lib/api';
import {
  Search, Download, ExternalLink,
  Image as ImageIcon, Film, Loader2,
  AlertCircle, Trash2, RefreshCw,
  Wand2, Repeat2, Clapperboard, Type, Box,
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  task_type: string | null;
  status: string;
  output_video_url: string | null;
  thumbnail_url: string | null;
  input_media_type: string | null;
  created_at: string;
}

// ── Tab config ──────────────────────────────────────────────────────────────
type TabKey = 'all' | 'text_to_image' | 'image_to_image' | 'image_to_video' | 'text_to_video' | 'image_to_3d' | 'text_to_story';

const TABS: { key: TabKey; label: string; icon: React.ElementType; color: string; accentBg: string }[] = [
  { key: 'all',            label: 'All',            icon: Film,        color: 'var(--accent)',  accentBg: 'var(--accent)' },
  { key: 'text_to_image',  label: 'Text to Image',   icon: Wand2,       color: '#10b981',        accentBg: '#10b981' },
  { key: 'image_to_image', label: 'Image to Image',  icon: Repeat2,     color: '#0a84ff',        accentBg: '#0a84ff' },
  { key: 'image_to_video', label: 'Image to Video',  icon: Clapperboard, color: '#f59e0b',       accentBg: '#f59e0b' },
  { key: 'text_to_video',  label: 'Text to Video',   icon: Type,        color: '#ef4444',        accentBg: '#ef4444' },
  { key: 'image_to_3d',    label: 'Image to 3D',     icon: Box,         color: '#a855f7',        accentBg: '#a855f7' },
  { key: 'text_to_story',  label: 'Story Studio',    icon: Film,        color: '#dc2626',        accentBg: '#dc2626' },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
function isVideoTask(t: string | null) {
  return ['text_to_video', 'image_to_video', 'video_to_video', 'text_to_story'].includes(t ?? '');
}

function is3dTask(t: string | null) {
  return t === 'image_to_3d';
}

function downloadExtension(taskType: string | null, url: string) {
  if (is3dTask(taskType)) {
    return url.toLowerCase().includes('.obj') ? 'obj' : 'glb';
  }
  return isVideoTask(taskType) ? 'mp4' : 'png';
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function downloadMedia(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch {
    window.open(url, '_blank');
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 28 } },
};

// ── Component ────────────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await projectsAPI.list(1, 100);
      const data = res.data;
      setProjects(Array.isArray(data) ? data : (data?.items ?? []));
    } catch (err) {
      setError(formatApiError(err, 'Failed to load history.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const handleDelete = async (projectId: string) => {
    if (!confirm('Delete this generation? This cannot be undone.')) return;
    setDeleting(projectId);
    try {
      await projectsAPI.delete(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      toast.success('Deleted.');
    } catch (err) {
      toast.error(formatApiError(err, 'Could not delete.'));
    } finally {
      setDeleting(null);
    }
  };

  const handleDownload = async (project: Project) => {
    const url = project.output_video_url;
    if (!url) { toast.error('Output file not ready yet.'); return; }
    setDownloading(project.id);
    const ext = downloadExtension(project.task_type, url);
    await downloadMedia(url, `lumina-${project.id.slice(0, 8)}.${ext}`);
    setDownloading(null);
  };

  // Per-tab counts (completed only)
  const countFor = (key: TabKey) =>
    key === 'all'
      ? projects.filter(p => p.status === 'completed').length
      : projects.filter(p => p.status === 'completed' && p.task_type === key).length;

  // Filter by tab + search
  const displayed = projects.filter(p => {
    if (activeTab !== 'all' && p.task_type !== activeTab) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.title?.toLowerCase().includes(q) || (p.task_type ?? '').toLowerCase().includes(q);
  });

  const activeTabCfg = TABS.find(t => t.key === activeTab)!;

  // Stats for active tab
  const tabCompleted = displayed.filter(p => p.status === 'completed').length;
  const tabPending   = displayed.filter(p => p.status === 'pending' || p.status === 'processing').length;
  const tabFailed    = displayed.filter(p => p.status === 'failed').length;

  return (
    <div className="studio-layout studio-layout--triple">
      <StudioIconRail />
      <Sidebar />
      <main className="studio-main studio-main--document">

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 style={{
              fontSize: 24, fontWeight: 800, color: 'var(--text-primary)',
              fontFamily: 'var(--font-display, Montserrat), sans-serif',
              letterSpacing: '-0.03em', marginBottom: 4,
            }}>
              Your History
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>
              Browse all your generated content by type
            </p>
          </motion.div>

          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search prompts…"
                style={{
                  padding: '9px 12px 9px 34px', borderRadius: 10,
                  background: 'var(--bg-muted)', border: '1px solid var(--border)',
                  color: 'var(--text-primary)', fontSize: 13, width: 210, outline: 'none',
                }}
              />
            </div>
            <button
              onClick={loadProjects}
              style={{
                padding: '9px 14px', borderRadius: 10, background: 'var(--bg-muted)',
                border: '1px solid var(--border)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'inherit',
              }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{
          display: 'flex', gap: 8, marginBottom: 24,
          overflowX: 'auto', paddingBottom: 4,
        }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const count = loading ? null : countFor(tab.key);
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                whileTap={{ scale: 0.96 }}
                style={{
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '9px 16px', borderRadius: 12, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                  transition: 'all 0.18s',
                  border: isActive ? `1.5px solid ${tab.color}` : '1.5px solid var(--border)',
                  background: isActive ? `${tab.color}18` : 'var(--bg-muted)',
                  color: isActive ? tab.color : 'var(--text-secondary)',
                }}
              >
                <Icon size={14} />
                {tab.label}
                {count !== null && (
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '1px 7px',
                    borderRadius: 99, marginLeft: 2,
                    background: isActive ? `${tab.color}28` : 'var(--bg-elevated, rgba(255,255,255,0.06))',
                    color: isActive ? tab.color : 'var(--text-muted)',
                    minWidth: 20, textAlign: 'center',
                  }}>
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* ── Stats for active tab ── */}
        {!loading && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}
          >
            {[
              { label: 'Completed', value: tabCompleted, color: activeTabCfg.color },
              { label: 'In Queue', value: tabPending, color: '#f59e0b' },
              { label: 'Failed', value: tabFailed, color: '#ef4444' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: `${s.color}16`, border: `1px solid ${s.color}28`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800, color: s.color,
                }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 72, color: 'var(--text-muted)', fontSize: 14 }}>
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            Loading your generations…
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px',
            borderRadius: 12, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            fontSize: 13, color: '#ef4444', fontWeight: 500, marginBottom: 20,
          }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && !error && displayed.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}
          >
            {(() => { const Icon = activeTabCfg.icon; return <Icon size={40} style={{ opacity: 0.2, display: 'block', margin: '0 auto 16px', color: activeTabCfg.color }} />; })()}
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
              {search
                ? 'No results for your search'
                : activeTab === 'all'
                  ? 'No generations yet'
                  : `No ${activeTabCfg.label} generations yet`}
            </div>
            <div style={{ fontSize: 13 }}>
              {search ? 'Try a different keyword.' : 'Go to Studio and generate to create something.'}
            </div>
          </motion.div>
        )}

        {/* ── Grid ── */}
        {!loading && !error && displayed.length > 0 && (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + search}
              variants={containerVariants} initial="hidden" animate="visible"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}
            >
              {displayed.map(project => {
                const mediaUrl = project.output_video_url ?? null;
                const is3d = is3dTask(project.task_type);
                const previewUrl =
                  project.thumbnail_url ??
                  (mediaUrl && !isVideoTask(project.task_type) && !is3d ? mediaUrl : null);
                const isVideo = isVideoTask(project.task_type);
                const isBeingDeleted = deleting === project.id;
                const isBeingDownloaded = downloading === project.id;
                const isPending = project.status === 'pending' || project.status === 'processing';
                const tabCfg = TABS.find(t => t.key === project.task_type) ?? TABS[0];

                return (
                  <motion.div
                    key={project.id}
                    variants={itemVariants}
                    whileHover={{ y: -4 }}
                    className="card"
                    style={{ padding: 0, overflow: 'hidden', opacity: isBeingDeleted ? 0.4 : 1, position: 'relative' }}
                  >
                    {/* Media preview */}
                    <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--bg-muted)' }}>
                      {mediaUrl && isVideo ? (
                        <video
                          src={mediaUrl}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          muted loop playsInline
                          onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
                          onMouseLeave={e => {
                            const v = e.currentTarget as HTMLVideoElement;
                            v.pause(); v.currentTime = 0;
                          }}
                        />
                      ) : mediaUrl && is3d ? (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            background: 'linear-gradient(160deg, rgba(139,92,246,0.2) 0%, var(--bg-muted) 100%)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <Box size={32} style={{ opacity: 0.85, color: tabCfg.color }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>3D model</span>
                        </div>
                      ) : previewUrl ? (
                        <img src={previewUrl} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: '100%', height: '100%', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          flexDirection: 'column', gap: 8, color: 'var(--text-muted)',
                        }}>
                          {isPending ? (
                            <>
                              <Loader2 size={22} style={{ animation: 'spin 1s linear infinite', color: tabCfg.color }} />
                              <span style={{ fontSize: 11, fontWeight: 600 }}>Generating…</span>
                            </>
                          ) : (
                            <>
                              {(() => { const I = tabCfg.icon; return <I size={26} style={{ opacity: 0.2, color: tabCfg.color }} />; })()}
                              <span style={{ fontSize: 11 }}>No preview</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Type badge (color-coded per tab) */}
                      <div style={{
                        position: 'absolute', top: 10, left: 10,
                        background: `${tabCfg.color}cc`, backdropFilter: 'blur(8px)',
                        padding: '3px 9px', borderRadius: 99,
                        fontSize: 9, fontWeight: 800, color: '#fff',
                        letterSpacing: '0.05em', textTransform: 'uppercase',
                      }}>
                        {tabCfg.label}
                      </div>

                      {/* Status badge */}
                      {project.status !== 'completed' && (
                        <div style={{
                          position: 'absolute', top: 10, right: 10,
                          background: isPending ? 'rgba(245,158,11,0.9)' : 'rgba(239,68,68,0.9)',
                          padding: '3px 9px', borderRadius: 99,
                          fontSize: 9, fontWeight: 800, color: '#fff',
                          letterSpacing: '0.05em', textTransform: 'uppercase',
                        }}>
                          {project.status}
                        </div>
                      )}

                      {/* Hover overlay */}
                      {mediaUrl && (
                        <div
                          style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.48)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            gap: 10, opacity: 0, transition: 'opacity 0.18s',
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0'}
                        >
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => handleDownload(project)}
                            disabled={isBeingDownloaded}
                            style={{
                              padding: '9px 15px', borderRadius: 10, cursor: 'pointer',
                              background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255,255,255,0.25)', color: '#fff',
                              fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                              display: 'flex', alignItems: 'center', gap: 6,
                            }}
                          >
                            {isBeingDownloaded
                              ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                              : <Download size={13} />}
                            Download
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={() => window.open(mediaUrl, '_blank')}
                            style={{
                              padding: '9px 13px', borderRadius: 10, cursor: 'pointer',
                              background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)',
                              border: '1px solid rgba(255,255,255,0.15)', color: '#fff',
                              fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
                              display: 'flex', alignItems: 'center', gap: 6,
                            }}
                          >
                            <ExternalLink size={13} /> View
                          </motion.button>
                        </div>
                      )}
                    </div>

                    {/* Info row */}
                    <div style={{ padding: '12px 14px' }}>
                      {/* Colored top bar */}
                      <div style={{
                        height: 2, borderRadius: 2, marginBottom: 10,
                        background: `linear-gradient(90deg, ${tabCfg.color}60, transparent)`,
                      }} />
                      <div style={{
                        fontSize: 12.5, color: 'var(--text-primary)', fontWeight: 600,
                        marginBottom: 10, lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {project.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                          {timeAgo(project.created_at)}
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {mediaUrl && (
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDownload(project)}
                              disabled={isBeingDownloaded}
                              title="Download"
                              style={{
                                padding: 6, borderRadius: 7,
                                background: 'var(--bg-muted)', border: '1px solid var(--border)',
                                cursor: isBeingDownloaded ? 'default' : 'pointer',
                                color: tabCfg.color, display: 'flex', alignItems: 'center',
                              }}
                            >
                              {isBeingDownloaded
                                ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                                : <Download size={13} />}
                            </motion.button>
                          )}
                          {mediaUrl && (
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={() => window.open(mediaUrl, '_blank')}
                              title="Open in new tab"
                              style={{
                                padding: 6, borderRadius: 7,
                                background: 'var(--bg-muted)', border: '1px solid var(--border)',
                                cursor: 'pointer', color: 'var(--text-secondary)',
                                display: 'flex', alignItems: 'center',
                              }}
                            >
                              <ExternalLink size={13} />
                            </motion.button>
                          )}
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(project.id)}
                            disabled={isBeingDeleted}
                            title="Delete"
                            style={{
                              padding: 6, borderRadius: 7,
                              background: 'var(--bg-muted)', border: '1px solid var(--border)',
                              cursor: isBeingDeleted ? 'default' : 'pointer',
                              color: '#ef4444', display: 'flex', alignItems: 'center',
                            }}
                          >
                            {isBeingDeleted
                              ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                              : <Trash2 size={13} />}
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </main>
    </div>
  );
}
