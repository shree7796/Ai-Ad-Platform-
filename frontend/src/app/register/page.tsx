'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '@/lib/api';
import { setAuth } from '@/lib/auth';

function registerErrorMessage(err: unknown): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const parts = detail.map((item: { msg?: string }) => item?.msg).filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  return 'Registration failed';
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    full_name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const toastId = toast.loading('Creating your account...');

    try {
      const res = await authAPI.register(form);
      setAuth(res.data.access_token, res.data.user);
      toast.success('Welcome to Lumina!', { id: toastId });
      router.push('/studio');
    } catch (err: unknown) {
      toast.error(registerErrorMessage(err), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    background: 'var(--bg-muted)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-muted)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-main)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--bg-card)',
          borderRadius: 24,
          border: '1px solid var(--border)',
          padding: '40px 32px',
          position: 'relative',
          zIndex: 1,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit', display: 'inline-block' }}>
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                boxShadow: '0 8px 16px rgba(99, 102, 241, 0.4)',
              }}
            >
              <Zap size={24} color="#fff" fill="#fff" />
            </motion.div>
          </Link>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display, Montserrat), sans-serif',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Create an account
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
            Join Lumina and start creating with AI.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Full name (optional)</label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
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
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Username</label>
            <div style={{ position: 'relative' }}>
              <User
                size={16}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
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
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail
                size={16}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                id="register-email"
                type="email"
                required
                placeholder="name@company.com"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                id="register-password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                style={{ ...inputStyle, paddingLeft: 40 }}
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            id="register-submit"
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              background: loading ? 'var(--bg-muted)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                Create account
                <ArrowRight size={18} />
              </>
            )}
          </motion.button>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: 32,
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          Already have an account?{' '}
          <Link
            href="/login"
            style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}
          >
            Sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
