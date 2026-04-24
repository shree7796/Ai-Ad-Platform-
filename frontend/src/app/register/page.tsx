'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '@/lib/api';
import { setAuth } from '@/lib/auth';

const RIGHT_IMAGE =
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200&h=1600';

function registerErrorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((item: { msg?: string }) => item?.msg).filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  return 'Registration failed';
}

function LuminaMark() {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg width="13" height="13" viewBox="0 0 15 15" fill="none" aria-hidden>
        <path d="M7.5 1.5L13.5 13H1.5L7.5 1.5Z" fill="#000000" />
      </svg>
    </div>
  );
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({ email: '', username: '', password: '', full_name: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Creating your account...');

    try {
      const res = await authAPI.register(form);
      setAuth(res.data.access_token, res.data.user);
      toast.success('Welcome to Lumina!', { id: toastId });
      window.location.assign('/studio');
    } catch (err: unknown) {
      toast.error(registerErrorMessage(err), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'Inter, system-ui, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div
        className="auth-krea-modal"
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 920,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderRadius: 24,
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.55)',
        }}
      >
        <Link
          href="/"
          aria-label="Close and return home"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            zIndex: 20,
            width: 40,
            height: 40,
            borderRadius: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.14)',
            color: '#ffffff',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            textDecoration: 'none',
            transition: 'background 0.15s, transform 0.15s',
          }}
        >
          <X size={20} strokeWidth={2} />
        </Link>
        <div
          style={{
            background: '#0d0d0d',
            padding: '36px 36px 32px',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 20,
            }}
          >
            <LuminaMark />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Lumina</span>
          </Link>

          <h1
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: '#ffffff',
              textAlign: 'center',
              letterSpacing: '-0.03em',
              margin: '0 0 8px',
              lineHeight: 1.2,
            }}
          >
            Create an account
          </h1>
          <p style={{ textAlign: 'center', fontSize: 14, color: '#737373', margin: '0 0 22px' }}>
            Start creating with AI in minutes
          </p>

          {/* Google sign-up */}
          <button
            type="button"
            onClick={() => window.location.assign('/api/v1/auth/google')}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', padding: '12px 16px', borderRadius: 9999,
              background: '#ffffff', border: 'none', color: '#0a0a0a',
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit', marginBottom: 18,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#4285F4" d="M46.145 24.503c0-1.6-.144-3.14-.41-4.618H24v8.737h12.44c-.537 2.892-2.168 5.342-4.62 6.988v5.81h7.48c4.376-4.03 6.845-9.97 6.845-16.917z"/>
              <path fill="#34A853" d="M24 47c6.27 0 11.532-2.08 15.376-5.63l-7.48-5.81c-2.075 1.392-4.726 2.214-7.896 2.214-6.07 0-11.21-4.1-13.047-9.608H3.2v6.003C7.027 42.538 15.002 47 24 47z"/>
              <path fill="#FBBC05" d="M10.953 28.166A14.904 14.904 0 0 1 10.14 24c0-1.44.247-2.838.813-4.166v-6.003H3.2A23.97 23.97 0 0 0 .023 24c0 3.877.93 7.544 2.577 10.769l8.353-6.603z"/>
              <path fill="#EA4335" d="M24 9.226c3.42 0 6.487 1.176 8.902 3.487l6.676-6.676C35.527 2.346 30.265 0 24 0 15.002 0 7.027 4.462 3.2 10.832l8.353 6.003C13.39 13.327 17.93 9.226 24 9.226z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 12, color: '#737373', fontWeight: 600, letterSpacing: '0.1em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#a3a3a3', marginBottom: 6 }}>
                Full name <span style={{ fontWeight: 400, color: '#737373' }}>(optional)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  size={17}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#737373',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="register-fullname"
                  type="text"
                  placeholder="Jane Doe"
                  autoComplete="name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="auth-form-input"
                  style={{ paddingLeft: 42 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#a3a3a3', marginBottom: 6 }}>Username</label>
              <div style={{ position: 'relative' }}>
                <User
                  size={17}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#737373',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="register-username"
                  type="text"
                  required
                  minLength={3}
                  maxLength={100}
                  placeholder="janedoe"
                  autoComplete="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="auth-form-input"
                  style={{ paddingLeft: 42 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#a3a3a3', marginBottom: 6 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={17}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#737373',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="register-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="auth-form-input"
                  style={{ paddingLeft: 42 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#a3a3a3', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock
                  size={17}
                  style={{
                    position: 'absolute',
                    left: 14,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#737373',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="register-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="auth-form-input"
                  style={{ paddingLeft: 42, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#737373',
                    display: 'flex',
                    padding: 4,
                  }}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="register-submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 10,
                background: loading ? '#2a2a2a' : '#1a2b45',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: 'inherit',
                opacity: loading ? 0.85 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" /> Creating account…
                </>
              ) : (
                <>
                  Continue <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 18, fontSize: 12, color: '#737373', lineHeight: 1.5 }}>
            By continuing, you agree to Lumina&apos;s{' '}
            <Link href="#" style={{ color: '#a3a3a3', textDecoration: 'underline' }}>
              Terms of Use
            </Link>{' '}
            &{' '}
            <Link href="#" style={{ color: '#a3a3a3', textDecoration: 'underline' }}>
              Privacy Policy
            </Link>
            .
          </p>

          <p style={{ textAlign: 'center', marginTop: 14, fontSize: 14, color: '#a3a3a3' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }}>
              Log in
            </Link>
          </p>
        </div>

        <div
          className="auth-krea-visual"
          style={{
            position: 'relative',
            minHeight: 420,
            background: `center/cover no-repeat url(${RIGHT_IMAGE})`,
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.5) 100%)',
            }}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .auth-krea-modal {
            grid-template-columns: 1fr !important;
          }
          .auth-krea-visual {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
