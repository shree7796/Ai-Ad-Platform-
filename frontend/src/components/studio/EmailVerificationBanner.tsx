'use client';

import { useState } from 'react';
import { X, Mail } from 'lucide-react';
import { getToken } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function EmailVerificationBanner({ email }: { email: string }) {
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  if (dismissed) return null;

  const handleResend = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken() ?? ''}` },
      });
      if (res.ok) {
        toast.success('Verification email sent — check your inbox!');
      } else {
        toast.error('Could not resend. Try again in a moment.');
      }
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 16px',
      background: 'rgba(234,179,8,0.08)',
      border: '1px solid rgba(234,179,8,0.22)',
      borderRadius: 10,
      margin: '0 0 14px',
    }}>
      <Mail size={15} style={{ color: '#eab308', flexShrink: 0 }} strokeWidth={2} />

      <p style={{ flex: 1, margin: 0, fontSize: 13, color: '#fafafa', lineHeight: 1.5 }}>
        <span style={{ fontWeight: 600, color: '#fde047' }}>Verify your email</span>
        {' '}— we sent a link to{' '}
        <span style={{ color: '#fff', fontWeight: 600 }}>{email}</span>.
        {' '}Check your inbox to activate all features.
      </p>

      <button
        type="button"
        onClick={handleResend}
        disabled={sending}
        style={{
          flexShrink: 0,
          padding: '5px 12px',
          borderRadius: 9999,
          background: 'rgba(234,179,8,0.15)',
          border: '1px solid rgba(234,179,8,0.3)',
          color: '#fde047',
          fontSize: 12,
          fontWeight: 600,
          cursor: sending ? 'not-allowed' : 'pointer',
          opacity: sending ? 0.6 : 1,
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        {sending ? 'Sending…' : 'Resend'}
      </button>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        title="Dismiss"
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          padding: 4,
          cursor: 'pointer',
          color: '#737373',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
