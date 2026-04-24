'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { setAuth } from '@/lib/auth';

export default function AuthCallbackPage() {
  const params = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error || !token) {
      const msg = error === 'google_denied'
        ? 'Google sign-in was cancelled.'
        : error === 'deactivated'
        ? 'Your account has been deactivated.'
        : 'Google sign-in failed. Please try again.';
      window.location.assign(`/login?msg=${encodeURIComponent(msg)}`);
      return;
    }

    // Fetch the user profile with the new token then store both
    authAPI.me(token)
      .then(res => {
        setAuth(token, res.data);
        window.location.assign('/studio');
      })
      .catch(() => {
        window.location.assign('/login?msg=Session+could+not+be+verified');
      });
  }, [params]);

  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.12)',
        borderTopColor: '#fff',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#737373', fontSize: 14 }}>Signing you in…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
