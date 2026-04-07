'use client';

import { motion } from 'framer-motion';
import Sidebar from '@/components/studio/Sidebar';
import {
  Search,
  Filter,
  Download,
  Trash2,
  ExternalLink,
  Clock,
  Image as ImageIcon,
  Video,
  MoreVertical
} from 'lucide-react';

const HISTORY_ITEMS = [
  { id: 1, type: 'video', prompt: 'Cinematic drone shot of a futuristic neon city in rain, 4k, hyper-realistic', date: '2 mins ago', preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format' },
  { id: 2, type: 'image', prompt: 'Portrait of a cyberpunk traveler, intricate details, glowing visor, moody lighting', date: '1 hour ago', preview: 'https://images.unsplash.com/photo-1633167606207-d840b5070fc2?w=800&auto=format' },
  { id: 3, type: 'image', prompt: 'Ethereal forest with floating lanterns, Studio Ghibli style, soft morning light', date: '3 hours ago', preview: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format' },
  { id: 4, type: 'video', prompt: 'Close up of an eye reflecting a galaxy, slow zoom, hypnotic motion', date: 'Yesterday', preview: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800&auto=format' },
  { id: 5, type: 'image', prompt: 'Retro-futuristic car flying over a sunset ocean, synthwave aesthetic', date: 'Yesterday', preview: 'https://images.unsplash.com/photo-1502136969935-8d8eef54d77b?w=800&auto=format' },
  { id: 6, type: 'image', prompt: 'Abstract crystalline structures growing from desert sand, translucent prisms', date: '2 days ago', preview: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&auto=format' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } }
};

export default function HistoryPage() {
  return (
    <div className="studio-layout">
      <Sidebar />
      <main className="studio-main">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 style={{
              fontSize: 24, fontWeight: 800, color: 'var(--text-primary)',
              fontFamily: 'var(--font-display, Montserrat), sans-serif',
              letterSpacing: '-0.03em', marginBottom: 4,
            }}>Your History</h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>Manage and download your past creations</p>
          </motion.div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search prompts..."
                style={{
                  padding: '10px 12px 10px 36px', borderRadius: 12, background: 'var(--bg-muted)',
                  border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13,
                  width: 240, outline: 'none'
                }}
              />
            </div>
            <button className="btn-secondary" style={{ padding: '0 16px', background: 'var(--bg-muted)' }}>
              <Filter size={16} /> Filter
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Assets', value: '142', icon: Clock },
            { label: 'Images', value: '118', icon: ImageIcon },
            { label: 'Videos', value: '24', icon: Video },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card"
              style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}
            >
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--bg-muted)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon size={18} color="var(--accent)" />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{stat.value}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 20
          }}
        >
          {HISTORY_ITEMS.map((item) => (
            <motion.div
              key={item.id}
              variants={itemVariants}
              whileHover={{ y: -6 }}
              className="card"
              style={{ padding: 0, overflow: 'hidden', position: 'relative' }}
            >
              <div style={{ position: 'relative', aspectRatio: '16/9', background: 'var(--bg-muted)' }}>
                <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.9 }} />
                <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8 }}>
                  <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '4px 10px', borderRadius: 99, fontSize: 10, fontWeight: 800, color: '#fff', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {item.type}
                  </div>
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{
                  fontSize: 13, color: 'var(--text-primary)', fontWeight: 600,
                  marginBottom: 12, lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                }}>
                  {item.prompt}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{item.date}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <motion.button whileTap={{ scale: 0.9 }} style={{ padding: 6, borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)' }}><Download size={14} /></motion.button>
                    <motion.button whileTap={{ scale: 0.9 }} style={{ padding: 6, borderRadius: 8, background: 'var(--bg-muted)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-secondary)' }}><ExternalLink size={14} /></motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
