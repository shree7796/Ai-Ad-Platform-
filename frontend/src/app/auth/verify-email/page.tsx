'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type State = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const params = useSearchParams();
  const [state, setState] = useState<State>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setState('error');
      setMessage('No verification token found in the link.');
      return;
    }

    fetch(`/api/v1/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async res => {
        const body = await res.json().catch(() => ({}));
        if (res.ok) {
          setState('success');
        } else {
          setState('error');
          setMessage(body?.detail ?? 'Verification failed. The link may have expired.');
        }
      })
      .catch(() => {
        setState('error');
        setMessage('Could not reach the server. Please try again.');
      });
  }, [params]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 16px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 16,
        padding: '40px 36px',
        textAlign: 'center',
      }}>

        {state === 'loading' && (
          <>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: '#fff',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 20px',
            }} />
            <p style={{ color: '#a3a3a3', fontSize: 15 }}>Verifying your email…</p>
          </>
        )}

        {state === 'success' && (
          <>
            {/* Green check circle */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(34,197,94,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            </div>
            <h1 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Email verified!
            </h1>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#a3a3a3', lineHeight: 1.6 }}>
              Your account is now active. Start creating with AI.
            </p>
            <Link
              href="/studio"
              style={{
                display: 'block', padding: '13px', borderRadius: 9999,
                background: '#fff', color: '#0a0a0a',
                fontSize: 14, fontWeight: 700, textDecoration: 'none',
              }}
            >
              Go to Studio →
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            {/* Red X circle */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(239,68,68,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </div>
            <h1 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Verification failed
            </h1>
            <p style={{ margin: '0 0 28px', fontSize: 14, color: '#a3a3a3', lineHeight: 1.6 }}>
              {message}
            </p>
            <Link
              href="/studio"
              style={{
                display: 'block', padding: '13px', borderRadius: 9999,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
                marginBottom: 10,
              }}
            >
              Go to Studio
            </Link>
            <Link
              href="/register"
              style={{ fontSize: 13, color: '#737373', textDecoration: 'none' }}
            >
              Create a new account
            </Link>
          </>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
