'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Zap, Github, Mail, Globe, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { authAPI } from '@/lib/api';
import { setAuth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const toastId = toast.loading('Authenticating...');

    try {
      const form = e.currentTarget as HTMLFormElement;
      const email = (form.elements[0] as HTMLInputElement).value;
      const password = (form.elements[1] as HTMLInputElement).value;

      const res = await authAPI.login({ email, password });
      const { access_token, user } = res.data;

      // Store token and user using utility
      setAuth(access_token, user);

      toast.success('Successfully logged in', { id: toastId });
      router.push('/studio');
    } catch (err: any) {
      console.error('Login Error:', err);
      const msg = err.response?.data?.detail || 'Invalid email or password';
      toast.error(msg, { id: toastId });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-main)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Glows */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 600, height: 600, background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

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
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16,
              boxShadow: '0 8px 16px rgba(99, 102, 241, 0.4)'
            }}
          >
            <Zap size={24} color="#fff" fill="#fff" />
          </motion.div>
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: 'var(--text-primary)',
            fontFamily: 'var(--font-display, Montserrat), sans-serif',
            letterSpacing: '-0.02em', margin: 0
          }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>
            Sign in to Lumina to start creating.
          </p>
        </div>

        {/* social login */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              padding: '12px', borderRadius: 12, background: 'var(--bg-subtle)',
              border: '1px solid var(--border)', color: 'var(--text-primary)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <Github size={18} /> Continue with GitHub
          </motion.button>
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
              padding: '12px', borderRadius: 12, background: 'var(--bg-subtle)',
              border: '1px solid var(--border)', color: 'var(--text-primary)',
              fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <Globe size={18} /> Continue with Google
          </motion.button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>OR</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email Address</label>
            <input
              type="email"
              placeholder="name@company.com"
              required
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12,
                background: 'var(--bg-muted)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 14, outline: 'none'
              }}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</label>
              <Link href="#" style={{ fontSize: 12, color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Forgot?</Link>
            </div>
            <input
              type="password"
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 12,
                background: 'var(--bg-muted)', border: '1px solid var(--border)',
                color: 'var(--text-primary)', fontSize: 14, outline: 'none'
              }}
            />
          </div>

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%', padding: '14px', borderRadius: 12,
              background: isLoading ? 'var(--bg-muted)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: 15, fontWeight: 700,
              border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
              marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
            {!isLoading && <ArrowRight size={18} />}
          </motion.button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 14, color: 'var(--text-secondary)' }}>
          Don't have an account? <Link href="#" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Create an account</Link>
        </div>
      </motion.div>
    </div>
  );
}
