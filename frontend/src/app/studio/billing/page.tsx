'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Sidebar from '@/components/studio/Sidebar';
import StudioIconRail from '@/components/studio/StudioIconRail';
import { useUsageSummary } from '@/hooks/useUsageSummary';
import { billingAPI, usageAPI, type UsageActivityItem } from '@/lib/api';
import { getUser, setAuth, getToken } from '@/lib/auth';
import { authAPI } from '@/lib/api';
import {
  Check, Zap, Crown, CreditCard, ArrowRight,
  History, Sparkles, ImageIcon, Video, Loader2,
  Image, Film, Wand2, Lock,
} from 'lucide-react';

// ── Plan config (credit-centric) ──────────────────────────────────────────────
interface FeatureGroup { icon: React.ElementType; label: string; items: string[]; }
interface PlanConfig {
  icon: React.ElementType; color: string; gradient: string;
  display: string; tagline: string; price: string; credits: string | null;
  groups: FeatureGroup[];
}

const PLANS: Record<string, PlanConfig> = {
  free: {
    icon: Sparkles, color: '#94a3b8',
    gradient: 'linear-gradient(135deg, rgba(148,163,184,0.12), rgba(100,116,139,0.06))',
    display: 'Free', tagline: 'Try the platform', price: '$0', credits: null,
    groups: [
      {
        icon: Wand2, label: 'What you can create',
        items: ['Text to Image', 'Image to Image', 'Image to Video', 'Text to Video'],
      },
      {
        icon: Lock, label: 'Limitations',
        items: ['No credits included', 'First payment required to generate', 'Lumina watermark on output'],
      },
    ],
  },
  basic: {
    icon: Zap, color: '#0a84ff',
    gradient: 'linear-gradient(135deg, rgba(10,132,255,0.1), rgba(0,113,227,0.06))',
    display: 'Basic', tagline: 'For individuals', price: '$15', credits: '1,200',
    groups: [
      {
        icon: Wand2, label: 'All generation types',
        items: ['Text to Image  ·  1–2 ⚡ each', 'Image to Image  ·  1–2 ⚡ each', 'Image to Video  ·  10–55 ⚡', 'Text to Video  ·  10–55 ⚡'],
      },
      {
        icon: Zap, label: 'Included perks',
        items: ['No watermark on output', 'Credits never expire', 'Standard AI models'],
      },
    ],
  },
  pro: {
    icon: CreditCard, color: '#409cff',
    gradient: 'linear-gradient(135deg, rgba(64,156,255,0.14), rgba(10,132,255,0.08))',
    display: 'Pro', tagline: 'For power users', price: '$30', credits: '3,200',
    groups: [
      {
        icon: Wand2, label: 'All generation types',
        items: ['Text to Image  ·  1–2 ⚡ each', 'Image to Image  ·  1–2 ⚡ each', 'Image to Video  ·  10–55 ⚡', 'Text to Video  ·  10–55 ⚡'],
      },
      {
        icon: Zap, label: 'Pro perks',
        items: ['Pro & premium AI models', 'Priority generation queue', '20% bonus on top-up packs', 'Up to 30s video length'],
      },
    ],
  },
  premium: {
    icon: Crown, color: '#f59e0b',
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(239,68,68,0.06))',
    display: 'Studio', tagline: 'Full creative studio', price: '$59', credits: '7,000',
    groups: [
      {
        icon: Wand2, label: 'All generation types',
        items: ['Text to Image  ·  1–2 ⚡ each', 'Image to Image  ·  1–2 ⚡ each', 'Image to Video  ·  10–55 ⚡', 'Text to Video  ·  10–110 ⚡'],
      },
      {
        icon: Zap, label: 'Studio perks',
        items: ['All AI models unlocked', 'Highest priority queue', 'Up to 60s video length', '20% bonus on top-up packs'],
      },
    ],
  },
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

  // Client-only: fetch live credit balance from API (cookie may be stale after credit grant)
  const [creditBalance, setCreditBalance] = useState(0);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [reservedBalance, setReservedBalance] = useState(0);
  useEffect(() => {
    // Seed from cookie immediately for instant render
    const u = getUser() as any;
    setCreditBalance(u?.credit_balance ?? 0);
    setBonusBalance(u?.bonus_credit_balance ?? 0);
    setReservedBalance(u?.reserved_balance ?? 0);
    // Then refresh from the API so we see DB-accurate balances
    const token = getToken();
    if (token) {
      authAPI.me()
        .then(res => {
          const freshUser = res.data as any;
          setCreditBalance(freshUser?.credit_balance ?? 0);
          setBonusBalance(freshUser?.bonus_credit_balance ?? 0);
          setReservedBalance(freshUser?.reserved_balance ?? 0);
          setAuth(token, freshUser);
        })
        .catch(() => {});
    }
  }, []);
  const availableCredits = Math.max(0, creditBalance + bonusBalance - reservedBalance);

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
    <div className="studio-layout studio-layout--triple">
      <StudioIconRail />
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
            Each generation spends ⚡ credits from your wallet. Credits are granted monthly with your subscription and never expire while your account is active.
          </p>
        </motion.div>

        {/* Credit wallet */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderRadius: 14, marginBottom: 20,
            background: 'linear-gradient(135deg, rgba(10,132,255,0.12), rgba(0,113,227,0.08))',
            border: '1px solid rgba(10,132,255,0.28)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #0071e3, #0a84ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={18} color="#fff" fill="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Credit Wallet
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Zap size={16} fill="currentColor" />
                {availableCredits.toLocaleString()}
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>available</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {bonusBalance > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                Incl. <Zap size={10} style={{ verticalAlign: 'middle' }} /> {bonusBalance} bonus (30-day expiry)
              </div>
            )}
            {reservedBalance > 0 && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
                {reservedBalance} reserved for active jobs
              </div>
            )}
            {availableCredits < 100 && (
              <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginTop: 2 }}>
                Low balance — upgrade to refill
              </div>
            )}
          </div>
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
                {usageLoading ? 'Loading…' : `Current Usage — ${PLANS[currentPlan]?.display || currentPlan} Plan`}
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
                Monthly generation history — your ⚡ credit balance is shown in the wallet above and the sidebar.
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
                        : 'linear-gradient(90deg, #0a84ff, #409cff)',
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
                        : 'linear-gradient(90deg, #0ea5e9, #0a84ff)',
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, fontFamily: 'var(--font-display)' }}>
              Choose Your Plan
            </h2>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
              Credits work across all 4 generation types
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {PLAN_ORDER.map((key, idx) => {
              const plan = PLANS[key];
              const isCurrent = currentPlan === key;
              const isPopular = key === 'pro';
              const Icon = plan.icon;

              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.07, type: 'spring', stiffness: 250, damping: 22 }}
                  whileHover={{ y: -4, boxShadow: `0 12px 40px ${plan.color}22` }}
                  style={{
                    borderRadius: 16,
                    border: isCurrent
                      ? `2px solid ${plan.color}`
                      : isPopular
                      ? '2px solid var(--accent)'
                      : '1px solid var(--border)',
                    background: isCurrent ? plan.gradient : 'var(--bg-card)',
                    position: 'relative',
                    overflow: 'visible',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'box-shadow 0.2s',
                  }}
                >
                  {/* Popular badge */}
                  {isPopular && !isCurrent && (
                    <div style={{
                      position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #0071e3, #0a84ff)',
                      color: '#fff', fontSize: 10, fontWeight: 800,
                      padding: '3px 16px', borderRadius: 99, whiteSpace: 'nowrap',
                      letterSpacing: '0.08em',
                      boxShadow: '0 4px 14px rgba(10,132,255,0.4)',
                    }}>MOST POPULAR</div>
                  )}
                  {isCurrent && (
                    <div style={{
                      position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                      background: plan.color,
                      color: '#fff', fontSize: 10, fontWeight: 800,
                      padding: '3px 16px', borderRadius: 99, whiteSpace: 'nowrap',
                      letterSpacing: '0.08em',
                    }}>CURRENT PLAN</div>
                  )}

                  {/* Card header */}
                  <div style={{ padding: '24px 22px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                        background: `${plan.color}22`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Icon size={19} color={plan.color} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                          {plan.display}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginTop: 1 }}>
                          {plan.tagline}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginBottom: plan.credits ? 12 : 0 }}>
                      <span style={{ fontSize: 34, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                        {plan.price}
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>/mo</span>
                    </div>

                    {/* Credit grant highlight */}
                    {plan.credits && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: `${plan.color}18`,
                        border: `1px solid ${plan.color}40`,
                        borderRadius: 8, padding: '6px 12px',
                      }}>
                        <Zap size={13} color={plan.color} fill={plan.color} />
                        <span style={{ fontSize: 14, fontWeight: 800, color: plan.color }}>
                          {plan.credits}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>
                          credits / month
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Feature groups */}
                  <div style={{ padding: '16px 22px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {plan.groups.map((group) => {
                      const GroupIcon = group.icon;
                      return (
                        <div key={group.label}>
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
                          }}>
                            <GroupIcon size={11} color={plan.color} />
                            <span style={{
                              fontSize: 10, fontWeight: 800, color: plan.color,
                              letterSpacing: '0.07em', textTransform: 'uppercase',
                            }}>
                              {group.label}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {group.items.map(item => (
                              <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                                <Check size={12} color="#10b981" strokeWidth={3} style={{ marginTop: 1, flexShrink: 0 }} />
                                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                                  {item}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* CTA button */}
                  <div style={{ padding: '0 22px 22px' }}>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      disabled={isCurrent || upgrading === key || key === 'free'}
                      onClick={() => handleUpgrade(key)}
                      style={{
                        width: '100%', padding: '11px 16px', borderRadius: 10,
                        fontSize: 13, fontWeight: 700, cursor: (isCurrent || key === 'free') ? 'default' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        transition: 'all 0.15s',
                        background: isCurrent
                          ? 'var(--bg-muted)'
                          : key === 'free'
                          ? 'transparent'
                          : isPopular
                          ? `linear-gradient(135deg, #0071e3, #0a84ff)`
                          : `${plan.color}18`,
                        color: isCurrent
                          ? 'var(--text-muted)'
                          : key === 'free'
                          ? 'var(--text-muted)'
                          : isPopular
                          ? '#fff'
                          : plan.color,
                        border: key === 'free' || isCurrent
                          ? '1px solid var(--border)'
                          : isPopular
                          ? 'none'
                          : `1.5px solid ${plan.color}`,
                        boxShadow: (!isCurrent && key !== 'free' && isPopular)
                          ? '0 4px 16px rgba(10,132,255,0.32)'
                          : 'none',
                      } as React.CSSProperties}
                    >
                      {upgrading === key ? (
                        <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Redirecting…</>
                      ) : isCurrent ? (
                        '✓ Current Plan'
                      ) : key === 'free' ? (
                        'Free — no action needed'
                      ) : (
                        <>Upgrade to {plan.display} <ArrowRight size={13} /></>
                      )}
                    </motion.button>
                  </div>
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
                    {['Date', 'Type', 'Model', 'Tier', 'Credits'].map(h => (
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
                          background: 'rgba(10,132,255,0.12)', color: 'var(--accent)',
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
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontWeight: 800, color: 'var(--accent)',
                          background: 'rgba(10,132,255,0.12)',
                          padding: '3px 10px', borderRadius: 99, fontSize: 12,
                        }}>
                          ⚡ {(row.credits ?? 0).toLocaleString()} {(row.credits ?? 0) === 1 ? 'credit' : 'credits'}
                        </span>
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
