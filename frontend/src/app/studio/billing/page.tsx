'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Sidebar from '@/components/studio/Sidebar';
import { useUsageSummary } from '@/hooks/useUsageSummary';
import { billingAPI, usageAPI, type UsageActivityItem } from '@/lib/api';
import {
  Check, Zap, Crown, CreditCard, ArrowRight,
  History, Sparkles, ImageIcon, Video, Loader2,
} from 'lucide-react';

// ── Plan config (mirrors plans.yaml) ────────────────────────────────────────
const PLAN_META: Record<string, { icon: React.ElementType; color: string; tagline: string; features: string[] }> = {
  free: {
    icon: Sparkles, color: '#94a3b8',
    tagline: 'Try the platform',
    features: [
      '8 images + 2 video units / month (15s per unit)',
      'Text & Image / Video modes',
      'Up to 10s video length',
      'Watermarked output',
    ],
  },
  basic: {
    icon: Zap, color: '#6366f1',
    tagline: 'For individuals',
    features: [
      '90 images + 12 video units / month',
      'Longer videos use more units',
      'Up to 15s per video',
      'No watermark',
    ],
  },
  pro: {
    icon: CreditCard, color: '#8b5cf6',
    tagline: 'For power users',
    features: [
      '240 images + 32 video units / month',
      'Up to 30s per video',
      'Pro model tier access',
      'High priority queue',
    ],
  },
  premium: {
    icon: Crown, color: '#f59e0b',
    tagline: 'Full creative studio',
    features: [
      '520 images + 72 video units / month',
      'Up to 60s per video',
      'All tiers unlocked',
      'Highest priority',
    ],
  },
};

const PLAN_LABELS: Record<string, { price: string; display: string }> = {
  free: { price: '$0', display: 'Free' },
  basic: { price: '$12', display: 'Basic' },
  pro: { price: '$29', display: 'Pro' },
  premium: { price: '$59', display: 'Studio' },
};

const PLAN_ORDER = ['free', 'basic', 'pro', 'premium'];

/** Shown when API fails so the dual-meter layout still renders with sane defaults. */
const FALLBACK_FREE_CAPS = { img: 8, vid: 2, unit: 15, combined: 10 };

export default function BillingPage() {
  const { data: usage, loading: usageLoading, error: usageError, refresh: refreshUsage } = useUsageSummary();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [activity, setActivity] = useState<UsageActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const searchParams = useSearchParams();

  // Handle Stripe redirect back
  useEffect(() => {
    const status = searchParams.get('upgrade');
    const sessionId = searchParams.get('session_id');

    if (status === 'success' && sessionId) {
      const sync = async () => {
        try {
          await billingAPI.syncCheckoutSession({ session_id: sessionId });
          refreshUsage();
          toast.success('Plan upgraded successfully! Your new quota is now active.', { duration: 6000 });
        } catch {
          toast.success('Payment received! Your plan will activate shortly.', { duration: 5000 });
        }
        // Clean up URL
        window.history.replaceState({}, '', '/studio/billing');
      };
      sync();
    } else if (status === 'cancel') {
      toast.error('Checkout cancelled.');
      window.history.replaceState({}, '', '/studio/billing');
    }
  }, [searchParams, refreshUsage]);

  // Load activity
  useEffect(() => {
    usageAPI.activity({ page: 1, perPage: 6 })
      .then(r => setActivity(r.data.items))
      .catch(() => {})
      .finally(() => setActivityLoading(false));
  }, []);

  const handleUpgrade = async (planKey: string) => {
    if (planKey === 'free') return;
    setUpgrading(planKey);
    try {
      const res = await billingAPI.createCheckout({ plan_key: planKey as 'basic' | 'pro' | 'premium' });
      window.location.href = res.data.url;
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(detail || 'Could not start checkout. Check Stripe config in .env.');
      setUpgrading(null);
    }
  };

  const currentPlan = usage?.plan_key || 'free';
  const imgUsed = usage?.image_generations_this_month ?? 0;
  const imgCap =
    usage?.monthly_image_quota ??
    (usageError ? FALLBACK_FREE_CAPS.img : 0);
  const vidUsed = usage?.video_units_used_this_month ?? usage?.video_generations_this_month ?? 0;
  const vidCap =
    usage?.monthly_video_quota ??
    (usageError ? FALLBACK_FREE_CAPS.vid : 0);
  const vidUnitSec = usage?.video_billing_unit_seconds ?? FALLBACK_FREE_CAPS.unit;
  const imgBarPct =
    !usage || imgCap <= 0 ? (imgUsed > 0 ? 100 : 0) : Math.min(100, (imgUsed / Math.max(imgCap, 1)) * 100);
  const vidBarPct =
    !usage || vidCap <= 0 ? (vidUsed > 0 ? 100 : 0) : Math.min(100, (vidUsed / Math.max(vidCap, 1)) * 100);
  const imgOver = !!usage && imgCap > 0 && imgUsed > imgCap;
  const vidOver = !!usage && vidCap > 0 && vidUsed > vidCap;

  return (
    <div className="studio-layout">
      <Sidebar />
      <main className="studio-main">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: 'var(--text-primary)',
            fontFamily: 'var(--font-display, Montserrat), sans-serif',
            letterSpacing: '-0.03em', marginBottom: 4,
          }}>Billing & Plans</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>
            Image and video quotas are tracked separately — longer videos use more <strong style={{ fontWeight: 600 }}>units</strong> (see below).
          </p>
        </motion.div>

        {/* Usage card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
          className="card"
          style={{ padding: 24, marginBottom: 32, background: 'var(--bg-subtle)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                {usageLoading ? 'Loading…' : `Current Usage — ${PLAN_LABELS[currentPlan]?.display || currentPlan} Plan`}
              </div>
              {usage && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                  Resets {new Date(usage.period_end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              )}
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#10b981',
              background: 'rgba(16,185,129,0.1)', padding: '4px 12px',
              borderRadius: 99, textTransform: 'uppercase',
            }}>
              {usage?.subscription_active ? 'Active' : 'Free'}
            </span>
          </div>

          {usageLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 14 }}>
              <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading usage…
            </div>
          ) : (
            <>
              {usageError && (
                <div
                  style={{
                    fontSize: 13,
                    color: '#b45309',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    marginBottom: 16,
                    fontWeight: 500,
                  }}
                >
                  Live quota could not be loaded (check login + API). Showing placeholder caps — refresh or fix{' '}
                  <code style={{ fontSize: 12 }}>/api/v1/usage/summary</code>.
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 16 }}>
                Quota resets at period end (UTC). Videos use <strong>units</strong> ({vidUnitSec}s each, rounded up) so
                longer clips count more toward your video allowance.
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Images this month</span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
                    {imgUsed} / {imgCap}
                  </span>
                </div>
                <div style={{ height: 10, background: 'var(--progress-track)', borderRadius: 99, overflow: 'hidden', marginBottom: 14 }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${imgBarPct}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      background: imgOver
                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                        : 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                      borderRadius: 99,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                    Video units ({vidUnitSec}s each)
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
                    {vidUsed} / {vidCap}
                  </span>
                </div>
                <div style={{ height: 10, background: 'var(--progress-track)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${vidBarPct}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    style={{
                      height: '100%',
                      background: vidOver
                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                        : 'linear-gradient(90deg, #0ea5e9, #6366f1)',
                      borderRadius: 99,
                    }}
                  />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginTop: 10 }}>
                  Total completed jobs this month: {usage?.used_this_month ?? 0} · Combined caps:{' '}
                  {usage?.monthly_quota ?? (usageError ? FALLBACK_FREE_CAPS.combined : 0)}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                {[
                  {
                    label: 'Total jobs',
                    value: usage?.used_this_month ?? 0,
                    sub: `/ ${usage?.monthly_quota ?? (usageError ? FALLBACK_FREE_CAPS.combined : 0)}`,
                    icon: Zap,
                  },
                  { label: 'Images', value: imgUsed, sub: `/ ${imgCap}`, icon: ImageIcon },
                  { label: 'Video units', value: vidUsed, sub: `/ ${vidCap}`, icon: Video },
                ].map(u => (
                  <div key={u.label} style={{
                    background: 'var(--bg-subtle)', border: '1px solid var(--border)',
                    borderRadius: 12, padding: '14px 18px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <u.icon size={14} color="var(--text-muted)" />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{u.label}</div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                      {u.value}
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{u.sub}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Plans grid */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20, fontFamily: 'var(--font-display)' }}>
            Choose Your Plan
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {PLAN_ORDER.map((key, idx) => {
              const meta = PLAN_META[key];
              const label = PLAN_LABELS[key];
              const isCurrent = currentPlan === key;
              const isPopular = key === 'pro';
              const Icon = meta.icon;

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.07, type: 'spring', stiffness: 250, damping: 22 }}
                  whileHover={{ y: -5 }}
                  className="card"
                  style={{
                    padding: 24,
                    border: isPopular ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    position: 'relative',
                    cursor: key === 'free' ? 'default' : 'pointer',
                  }}
                >
                  {isPopular && (
                    <div style={{
                      position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      color: '#fff', fontSize: 10, fontWeight: 800,
                      padding: '3px 14px', borderRadius: 99, whiteSpace: 'nowrap',
                      boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                    }}>POPULAR</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${meta.color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={18} color={meta.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{label.display}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{meta.tagline}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 20 }}>
                    <span style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{label.price}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>/mo</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                    {meta.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 500 }}>
                        <Check size={13} color="#10b981" strokeWidth={3} />
                        <span style={{ color: 'var(--text-secondary)' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    disabled={isCurrent || upgrading === key || key === 'free'}
                    onClick={() => handleUpgrade(key)}
                    style={{
                      fontSize: 13, padding: '10px 16px', width: '100%', borderRadius: 10,
                      border: 'none', fontWeight: 700, cursor: (isCurrent || key === 'free') ? 'default' : 'pointer',
                      background: isCurrent
                        ? 'var(--bg-muted)'
                        : key === 'free' ? 'transparent'
                        : isPopular ? 'var(--accent)' : 'rgba(99,102,241,0.15)',
                      color: isCurrent
                        ? 'var(--text-muted)'
                        : key === 'free' ? 'var(--text-muted)'
                        : isPopular ? '#fff' : 'var(--accent)',
                      border: (!isCurrent && key !== 'free' && !isPopular) ? '1px solid var(--accent)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    } as React.CSSProperties}
                  >
                    {upgrading === key ? (
                      <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Redirecting…</>
                    ) : isCurrent ? (
                      'Current Plan'
                    ) : key === 'free' ? (
                      'Free tier'
                    ) : (
                      <>Upgrade <ArrowRight size={13} /></>
                    )}
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Generation activity */}
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="card" style={{ padding: 0, overflow: 'hidden' }}
        >
          <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <History size={16} color="var(--text-muted)" />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Recent Activity</h2>
          </div>
          {activityLoading ? (
            <div style={{ padding: 24, color: 'var(--text-muted)', fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Loading…
            </div>
          ) : activity.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              No generations yet this month. Go create something!
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-subtle)', textAlign: 'left' }}>
                    {['Date', 'Type', 'Model', 'Tier', 'Cost'].map(h => (
                      <th key={h} style={{ padding: '10px 20px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activity.map((row, i) => (
                    <motion.tr key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                      style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        {new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                          background: 'rgba(99,102,241,0.1)', color: 'var(--accent)',
                        }}>
                          {(row.task_type || 'unknown').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {row.model_used || '—'}
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--text-muted)', fontWeight: 500 }}>
                        {row.tier || '—'}
                      </td>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        ${parseFloat(row.cost).toFixed(3)}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
