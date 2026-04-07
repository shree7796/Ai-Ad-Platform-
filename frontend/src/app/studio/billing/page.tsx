'use client';

import { motion } from 'framer-motion';
import Sidebar from '@/components/studio/Sidebar';
import {
  Check,
  Zap,
  Crown,
  CreditCard,
  ArrowRight,
  History,
  Download,
  Shield,
  Sparkles,
  ImageIcon,
  Video
} from 'lucide-react';

const PLANS = [
  {
    name: 'Starter', price: '$0', period: 'Free forever', credits: 50,
    icon: Sparkles, color: '#94a3b8',
    features: ['50 credits / month', 'Text to Image', 'Image to Image', 'Standard quality', 'Community support'],
    current: false, popular: false,
  },
  {
    name: 'Pro', price: '$19', period: 'per month', credits: 500,
    icon: Zap, color: '#6366f1',
    features: ['500 credits / month', 'All generation modes', 'Text to Video (NEW)', '4K downloads', 'Priority queue', 'Email support'],
    current: true, popular: true,
  },
  {
    name: 'Business', price: '$79', period: 'per month', credits: 2500,
    icon: Crown, color: '#f59e0b',
    features: ['2,500 credits / month', 'Everything in Pro', 'API access', 'Team collaboration', 'Custom styles', 'Dedicated support'],
    current: false, popular: false,
  },
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

export default function BillingPage() {
  return (
    <div className="studio-layout">
      <Sidebar />
      <main className="studio-main">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 32 }}
        >
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: 'var(--text-primary)',
            fontFamily: 'var(--font-display, Montserrat), sans-serif',
            letterSpacing: '-0.03em', marginBottom: 4,
          }}>Billing & Plans</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>Manage your subscription and credits</p>
        </motion.div>

        {/* Current Usage */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="card"
          style={{ padding: 24, marginBottom: 32, background: 'var(--bg-subtle)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Current Usage — Pro Plan</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Resets on May 11, 2026</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)', padding: '4px 12px', borderRadius: 99, textTransform: 'uppercase' }}>Active</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>260</span>
            <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>/ 500 credits used</span>
          </div>
          <div style={{ height: 10, background: 'rgba(255,255,255,0.05)', borderRadius: 99, overflow: 'hidden', marginBottom: 20 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '52%' }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                borderRadius: 99,
              }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { label: 'Credits Used', used: 260, total: 500, icon: Zap },
              { label: 'Images Generated', used: 198, total: null, icon: ImageIcon },
              { label: 'Videos Generated', used: 42, total: null, icon: Video },
            ].map(u => (
              <div key={u.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <u.icon size={14} color="var(--text-muted)" />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{u.label}</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {u.used}{u.total ? <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}> / {u.total}</span> : ''}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Plans */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20, fontFamily: 'var(--font-display)' }}>Choose Your Plan</h2>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}
          >
            {PLANS.map(plan => (
              <motion.div
                key={plan.name}
                variants={itemVariants}
                whileHover={{ y: -6, background: 'rgba(255,255,255,0.03)' }}
                className="card"
                style={{
                  padding: 28,
                  border: plan.popular ? '2px solid var(--accent)' : '1px solid var(--border)',
                  position: 'relative',
                  background: 'var(--bg-card)'
                }}
              >
                {plan.popular && (
                  <div style={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: '#fff', fontSize: 11, fontWeight: 800,
                    padding: '4px 16px', borderRadius: 99, whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
                  }}>MOST POPULAR</div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: `${plan.color}20`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <plan.icon size={20} color={plan.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{plan.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{plan.credits} credits/mo</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{plan.price}</span>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>/mo</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500 }}>
                      <Check size={14} color="#10b981" strokeWidth={3} />
                      <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
                    </div>
                  ))}
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  style={{
                    fontSize: 13, padding: '12px 16px', width: '100%', borderRadius: 12, border: 'none', fontWeight: 700, cursor: 'pointer',
                    background: plan.current ? 'var(--bg-muted)' : 'var(--accent)',
                    color: plan.current ? 'var(--text-muted)' : '#fff',
                  }}
                >
                  {plan.current ? 'Current Plan' : `Upgrade to ${plan.name}`}
                  {!plan.current && <ArrowRight size={14} style={{ marginLeft: 8 }} />}
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Invoices */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="card"
          style={{ padding: 0, overflow: 'hidden' }}
        >
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <History size={18} color="var(--text-muted)" />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Billing History</h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 24px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.05em' }}>Date</th>
                  <th style={{ padding: '12px 24px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.05em' }}>Plan</th>
                  <th style={{ padding: '12px 24px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.05em' }}>Amount</th>
                  <th style={{ padding: '12px 24px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '12px 24px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.05em', textAlign: 'right' }}>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { date: 'Apr 11, 2026', plan: 'Pro Subscription', amount: '$19.00', status: 'Paid' },
                  { date: 'Mar 11, 2026', plan: 'Pro Subscription', amount: '$19.00', status: 'Paid' },
                  { date: 'Feb 11, 2026', plan: 'Pro Subscription', amount: '$19.00', status: 'Paid' },
                ].map((row, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td style={{ padding: '16px 24px', fontWeight: 600 }}>{row.date}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 500, color: 'var(--text-secondary)' }}>{row.plan}</td>
                    <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--text-primary)' }}>{row.amount}</td>
                    <td style={{ padding: '16px 24px' }}>
                      <span style={{
                        background: 'rgba(5, 150, 105, 0.1)', color: '#10b981',
                        padding: '4px 12px', borderRadius: 99,
                        fontSize: 11, fontWeight: 700
                      }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <motion.button
                        whileHover={{ scale: 1.1, color: 'var(--accent)' }}
                        whileTap={{ scale: 0.9 }}
                        style={{ padding: '6px 12px', width: 'auto', fontSize: 12, background: 'var(--bg-muted)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        <Download size={14} />
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
