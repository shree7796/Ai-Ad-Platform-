'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Github, Globe, Shield, Mail, ArrowRight, Eye, EyeOff, X } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authAPI } from '@/lib/api';
import { setAuth } from '@/lib/auth';

const RIGHT_IMAGE =
  'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=1200&h=1600';

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

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading('Authenticating...');

    try {
      const form = e.currentTarget as HTMLFormElement;
      const email = (form.elements.namedItem('email') as HTMLInputElement).value;
      const password = (form.elements.namedItem('password') as HTMLInputElement).value;

      const res = await authAPI.login({ email, password });
      const { access_token, user } = res.data;

      setAuth(access_token, user);
      toast.success('Successfully logged in', { id: toastId });
      router.push('/studio');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Invalid email or password';
      toast.error(typeof msg === 'string' ? msg : 'Invalid email or password', { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  const socialSoon = () => toast('Coming soon');

  const btnPill: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    padding: '12px 16px',
    borderRadius: 9999,
    background: '#ffffff',
    border: 'none',
    color: '#0a0a0a',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
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
            padding: '40px 36px 36px',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
            <LuminaMark />
          </div>

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
            Welcome back
          </h1>
          <p style={{ textAlign: 'center', fontSize: 14, color: '#737373', margin: '0 0 24px', lineHeight: 1.5 }}>
            Sign in to continue to your workspace
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
            <button type="button" onClick={socialSoon} style={btnPill}>
              <Github size={18} strokeWidth={2} />
              Continue with GitHub
            </button>
            <button type="button" onClick={socialSoon} style={btnPill}>
              <Globe size={18} strokeWidth={2} />
              Continue with Google
            </button>
            <button type="button" onClick={socialSoon} style={btnPill}>
              <Shield size={18} strokeWidth={2} />
              Continue with SSO
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 12, color: '#737373', fontWeight: 600, letterSpacing: '0.1em' }}>OR</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                type="email"
                name="email"
                placeholder="Email"
                required
                autoComplete="email"
                className="auth-form-input"
                style={{ paddingLeft: 42 }}
              />
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                name="password"
                placeholder="Password"
                required
                autoComplete="current-password"
                className="auth-form-input"
                style={{ paddingLeft: 14, paddingRight: 44 }}
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

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '13px 16px',
                borderRadius: 10,
                background: isLoading ? '#2a2a2a' : '#1a2b45',
                color: '#ffffff',
                fontSize: 14,
                fontWeight: 600,
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: 'inherit',
                opacity: isLoading ? 0.8 : 1,
              }}
            >
              {isLoading ? 'Signing in…' : 'Continue'}
              {!isLoading && <ArrowRight size={17} />}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 22, fontSize: 12, color: '#737373', lineHeight: 1.5 }}>
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

          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#a3a3a3' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 600 }}>
              Sign up
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
