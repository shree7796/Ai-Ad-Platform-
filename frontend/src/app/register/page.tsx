'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Film, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '@/lib/api';
import { setAuth } from '@/lib/auth';

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

    try {
      const res = await authAPI.register(form);
      setAuth(res.data.access_token, res.data.user);
      toast.success('Account created! Welcome to AdGen AI');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-cyan flex items-center justify-center">
            <Film className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-2xl">AdGen AI</span>
        </Link>

        {/* Card */}
        <div className="glass-card p-8">
          <h1 className="text-2xl font-display font-bold text-center mb-2">Create your account</h1>
          <p className="text-white/40 text-center text-sm mb-8">Start generating AI-powered ads</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-white/50 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  id="register-fullname"
                  type="text"
                  placeholder="John Doe"
                  className="input-field pl-11"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/50 mb-2">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  id="register-username"
                  type="text"
                  required
                  placeholder="johndoe"
                  className="input-field pl-11"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/50 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  id="register-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="input-field pl-11"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/50 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  id="register-password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="input-field pl-11"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>
            </div>

            <button
              id="register-submit"
              type="submit"
              disabled={loading}
              className="btn-glow w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-white/40 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-brand-400 hover:text-brand-300 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
