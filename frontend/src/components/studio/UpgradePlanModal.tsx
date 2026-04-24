'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { X, Check, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { billingAPI } from '@/lib/api';
import {
  UPGRADE_PLAN_ORDER,
  UPGRADE_PLANS,
  type UpgradePlanKey,
} from '@/lib/studioUpgradePlans';

/** Portrait crop so a tall side panel shows the full art (not a thin strip of a wide photo). */
const UPGRADE_SIDE_IMAGE =
  'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=720&h=1100&q=88';

export type UpgradeModalReason = 'video_free' | 'three_d_free' | 'story_free' | 'igaming_free' | 'quota' | 'credits' | 'generic';

interface Props {
  open: boolean;
  onClose: () => void;
  reason: UpgradeModalReason;
  /** Optional API error detail (shown under the title when present). */
  detailMessage?: string;
}

function reasonEyebrow(reason: UpgradeModalReason, detail?: string): string {
  switch (reason) {
    case 'video_free':
      return 'Video is included with a paid plan. Upgrade to generate clips.';
    case 'three_d_free':
      return 'Image to 3D is included with a paid plan. Upgrade to generate 3D models.';
    case 'story_free':
      return 'Story Studio is a premium feature. Upgrade to create full narrated story videos.';
    case 'igaming_free':
      return 'iGaming Asset Generator is a premium feature. Upgrade to generate multi-angle game assets.';
    case 'quota':
      return "You've hit your monthly generation limit. Upgrade for more capacity.";
    case 'credits':
      return "You're out of credits. Subscribe or top up to keep creating.";
    default:
      return detail?.trim()
        ? detail.slice(0, 220) + (detail.length > 220 ? '…' : '')
        : 'Upgrade to keep generating with full access.';
  }
}

/** Left rail: portrait hero fills full column height (fixed width on desktop = stable crop). */
function ModalVisualPanel({ narrow }: { narrow: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      aria-hidden
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: narrow ? 200 : '100%',
        overflow: 'hidden',
        background:
          'linear-gradient(165deg, #141428 0%, #1e2a4a 38%, #0d2137 72%, #0a1628 100%)',
      }}
    >
      {!imageFailed ? (
        <img
          src={UPGRADE_SIDE_IMAGE}
          alt=""
          loading="eager"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: '50% 40%',
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.08) 55%, rgba(0,0,0,0.35) 100%),
            linear-gradient(180deg, rgba(0,0,0,0.2) 0%, transparent 45%, rgba(0,0,0,0.82) 100%)
          `,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 'clamp(18px, 6%, 30px)',
          bottom: 'clamp(22px, 5%, 36px)',
          right: 'clamp(18px, 6%, 30px)',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.95)',
          lineHeight: 1.35,
          pointerEvents: 'none',
          textShadow: '0 2px 24px rgba(0,0,0,0.8)',
        }}
      >
        Lumina
        <span
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: '0.03em',
            textTransform: 'none',
            color: 'rgba(255,255,255,0.72)',
            marginTop: 8,
            lineHeight: 1.45,
          }}
        >
          Upgrade to unlock full creative tools
        </span>
      </div>
    </div>
  );
}

function useNarrowModal() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 860px)');
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return narrow;
}

export default function UpgradePlanModal({ open, onClose, reason, detailMessage }: Props) {
  const [selected, setSelected] = useState<UpgradePlanKey>('basic');
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const narrow = useNarrowModal();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const plan = UPGRADE_PLANS[selected];

  const startCheckout = async () => {
    if (billing === 'yearly') {
      toast('Annual billing is not available yet- continuing with monthly checkout.', {
        icon: 'ℹ️',
        duration: 3500,
      });
    }
    setCheckoutLoading(true);
    try {
      const res = await billingAPI.createCheckout({ plan_key: selected });
      window.location.href = res.data.url;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Could not start checkout. Try Billing or check Stripe configuration.';
      toast.error(typeof msg === 'string' ? msg : 'Checkout failed.');
      setCheckoutLoading(false);
    }
  };

  if (!mounted) return null;

  /* Taller dialog; image column is fixed-width on desktop so height:width feels balanced */
  const modalHeight = 'min(900px, calc(100vh - 20px))';
  const imageColWidth = 408;

  const overlay = (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="upgrade-shell"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10000,
            pointerEvents: 'auto',
          }}
        >
          <div
            role="presentation"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(6px)',
            }}
            onClick={onClose}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(10px, 2vw, 28px)',
              pointerEvents: 'none',
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="upgrade-plan-title"
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.99, y: 8 }}
              transition={{ type: 'spring', bounce: 0.2, duration: 0.45 }}
              style={{
                display: 'flex',
                flexDirection: narrow ? 'column' : 'row',
                alignItems: 'stretch',
                width: narrow ? 'min(100%, 520px)' : `min(${imageColWidth + 560}px, calc(100vw - 32px))`,
                maxWidth: narrow ? 520 : imageColWidth + 560,
                height: modalHeight,
                maxHeight: modalHeight,
                overflow: 'hidden',
                background: '#141414',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: narrow ? 20 : 24,
                boxShadow:
                  '0 0 0 1px rgba(255,255,255,0.06) inset, 0 40px 120px rgba(0,0,0,0.75), 0 24px 64px rgba(0,0,0,0.45)',
                pointerEvents: 'auto',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Visual column */}
              <div
                style={{
                  flex: narrow ? '0 0 auto' : `0 0 ${imageColWidth}px`,
                  width: narrow ? '100%' : imageColWidth,
                  minWidth: narrow ? undefined : imageColWidth,
                  height: narrow ? 220 : '100%',
                  minHeight: narrow ? 220 : '100%',
                  alignSelf: 'stretch',
                  borderBottom: narrow ? '1px solid rgba(255,255,255,0.1)' : undefined,
                  borderRight: narrow ? undefined : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <ModalVisualPanel narrow={narrow} />
              </div>

              {/* Content column */}
              <div
                style={{
                  position: 'relative',
                  flex: 1,
                  minWidth: 0,
                  minHeight: narrow ? 0 : undefined,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: narrow ? '22px 24px 20px' : '32px 40px 28px',
                  overflow: 'hidden',
                  background: 'linear-gradient(180deg, #1a1a1c 0%, #141414 100%)',
                }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  style={{
                    position: 'absolute',
                    top: narrow ? 16 : 22,
                    right: narrow ? 16 : 24,
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.08)',
                    background: 'rgba(255,255,255,0.07)',
                    color: '#e5e5e5',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2,
                  }}
                >
                  <X size={20} strokeWidth={2} />
                </button>

                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: narrow ? 12 : 16,
                    paddingRight: 48,
                  }}
                >
                  <p
                    style={{
                      fontSize: narrow ? 14 : 15,
                      lineHeight: 1.5,
                      color: '#a8a8a8',
                      margin: 0,
                      paddingRight: 8,
                    }}
                  >
                    {reasonEyebrow(reason, detailMessage)}
                  </p>
                  <h2
                    id="upgrade-plan-title"
                    style={{
                      fontSize: narrow ? 26 : 'clamp(28px, 3vw, 36px)',
                      fontWeight: 800,
                      letterSpacing: '-0.03em',
                      margin: 0,
                      lineHeight: 1.12,
                      color: '#ffffff',
                    }}
                  >
                    Upgrade your plan
                  </h2>

                  <div
                    style={{
                      display: 'flex',
                      gap: 6,
                      padding: 6,
                      borderRadius: 14,
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    {UPGRADE_PLAN_ORDER.map((key) => {
                      const p = UPGRADE_PLANS[key];
                      const active = selected === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelected(key)}
                          style={{
                            flex: 1,
                            minHeight: narrow ? 48 : 52,
                            padding: '12px 10px',
                            borderRadius: 10,
                            border: active ? '1px solid rgba(255,255,255,0.25)' : '1px solid transparent',
                            cursor: 'pointer',
                            fontSize: narrow ? 14 : 15,
                            fontWeight: 700,
                            fontFamily: 'inherit',
                            background: active ? '#ffffff' : 'transparent',
                            color: active ? '#0a0a0a' : '#a3a3a3',
                            transition: 'background 0.15s, color 0.15s',
                          }}
                        >
                          {p.display}
                        </button>
                      );
                    })}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <p style={{ fontSize: 14, color: '#8e8e8e', margin: 0, fontWeight: 500 }}>{plan.tagline}</p>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        borderRadius: 999,
                        background: 'rgba(10,132,255,0.14)',
                        border: '1px solid rgba(10,132,255,0.35)',
                        fontSize: 13,
                        fontWeight: 700,
                        color: '#7ecbff',
                      }}
                    >
                      <Zap size={15} fill="currentColor" aria-hidden />
                      {plan.credits} credits / mo
                    </span>
                  </div>

                  <div
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 16,
                      padding: narrow ? '16px 18px' : '20px 22px',
                      flex: narrow ? 'none' : 1,
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color: '#737373',
                        marginBottom: 14,
                      }}
                    >
                      What&apos;s included
                    </div>
                    <ul
                      style={{
                        listStyle: 'none',
                        margin: 0,
                        padding: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                        alignContent: 'start',
                      }}
                    >
                      {plan.features.map((line) => (
                        <li
                          key={line}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            fontSize: narrow ? 13 : 14,
                            lineHeight: 1.45,
                            color: '#e5e5e5',
                          }}
                        >
                          <span
                            style={{
                              flexShrink: 0,
                              width: 24,
                              height: 24,
                              borderRadius: 8,
                              background: 'rgba(10,132,255,0.18)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginTop: 1,
                            }}
                          >
                            <Check size={13} color="#4da3ff" strokeWidth={2.75} />
                          </span>
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <button
                      type="button"
                      onClick={() => setBilling('monthly')}
                      style={{
                        padding: '16px 18px',
                        minHeight: 104,
                        borderRadius: 14,
                        border: billing === 'monthly' ? '2px solid #0a84ff' : '1px solid rgba(255,255,255,0.12)',
                        background: billing === 'monthly' ? 'rgba(10,132,255,0.1)' : 'rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        color: '#fafafa',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#8e8e8e', marginBottom: 6 }}>Monthly</div>
                      <div style={{ fontSize: narrow ? 22 : 24, fontWeight: 800 }}>{plan.priceLabel}</div>
                      <div style={{ fontSize: 12, color: '#737373', marginTop: 6 }}>Billed monthly</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBilling('yearly')}
                      style={{
                        padding: '16px 18px',
                        minHeight: 104,
                        borderRadius: 14,
                        border: billing === 'yearly' ? '2px solid #0a84ff' : '1px solid rgba(255,255,255,0.12)',
                        background: billing === 'yearly' ? 'rgba(10,132,255,0.1)' : 'rgba(255,255,255,0.04)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        color: '#fafafa',
                        position: 'relative',
                        opacity: 0.88,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          color: '#0a84ff',
                          background: 'rgba(10,132,255,0.22)',
                          padding: '3px 8px',
                          borderRadius: 5,
                        }}
                      >
                        Save
                      </span>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#8e8e8e', marginBottom: 6 }}>Yearly</div>
                      <div style={{ fontSize: narrow ? 20 : 22, fontWeight: 800 }}>
                        <span
                          style={{
                            textDecoration: 'line-through',
                            color: '#525252',
                            marginRight: 8,
                            fontSize: narrow ? 16 : 18,
                          }}
                        >
                          {plan.priceLabel.replace('/mo', '')}
                        </span>
                        −20%
                      </div>
                      <div style={{ fontSize: 12, color: '#737373', marginTop: 6 }}>Annual- coming soon</div>
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={startCheckout}
                    style={{
                      width: '100%',
                      padding: '16px 22px',
                      minHeight: 54,
                      borderRadius: 14,
                      border: 'none',
                      background: checkoutLoading ? '#3b82f6aa' : 'linear-gradient(180deg, #0d8fff 0%, #0a84ff 100%)',
                      color: '#ffffff',
                      fontSize: 14,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      cursor: checkoutLoading ? 'wait' : 'pointer',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 10,
                      boxShadow: checkoutLoading ? 'none' : '0 8px 28px rgba(10,132,255,0.35)',
                      flexShrink: 0,
                    }}
                  >
                    <Zap size={19} fill="currentColor" />
                    {checkoutLoading ? 'Redirecting…' : `Upgrade to ${plan.display}`}
                  </button>

                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <Link
                      href="/studio/billing"
                      onClick={onClose}
                      style={{
                        fontSize: 13,
                        color: '#8e8e8e',
                        textDecoration: 'underline',
                        textUnderlineOffset: 3,
                      }}
                    >
                      Compare all plans on Billing
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
