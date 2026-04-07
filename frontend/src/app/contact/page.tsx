'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Film, Send, Mail, MessageSquare } from 'lucide-react';
import { useState } from 'react';

export default function ContactPage() {
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('sending');
    // Simulate API request
    setTimeout(() => {
      setFormStatus('sent');
    }, 1500);
  };

  return (
    <div className="min-h-screen font-sans flex flex-col">
      <div className="ambient-glow" />

      {/* ── Navbar ── */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-surface-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded bg-brand-500/10 border border-brand-500/20 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
              <Film className="w-4 h-4 text-brand-500" />
            </div>
            <span className="font-display font-medium text-lg tracking-tight">AdGen Studio</span>
          </Link>

          <div className="flex items-center gap-8">
            <Link href="/pricing" className="text-white/50 hover:text-white transition-colors text-sm font-medium tracking-wide">
              Pricing
            </Link>
            <Link href="/contact" className="text-brand-500 hover:text-brand-400 transition-colors text-sm font-medium tracking-wide">
              Contact
            </Link>
            <Link href="/login" className="btn-glow text-sm py-2 px-5 !rounded-lg">
              Enter Studio
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Header ── */}
      <section className="pt-48 pb-16 px-6 relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center w-full max-w-4xl"
        >
          <h1 className="text-5xl md:text-7xl font-display font-medium tracking-tighter mb-6 relative">
            Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-500">Touch</span>
          </h1>
          <p className="text-white/40 max-w-lg mx-auto text-sm md:text-base font-mono tracking-wide">
            // Whether it's enterprise integration or technical support, our team is ready to connect.
          </p>
        </motion.div>
      </section>

      {/* ── Form Section ── */}
      <section className="pb-32 px-6 relative z-10 flex-1 w-full mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-surface-900/60 border border-white/5 backdrop-blur-md p-8 md:p-12 rounded-3xl w-full"
        >
          {formStatus === 'sent' ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-brand-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="w-8 h-8 text-brand-500" />
              </div>
              <h3 className="text-2xl font-display font-medium mb-2">Message Sent</h3>
              <p className="text-white/50 text-sm">We'll get back to you within a few business hours.</p>
              <button 
                onClick={() => setFormStatus('idle')}
                className="mt-8 text-brand-500 hover:text-brand-400 font-medium text-sm transition-colors uppercase tracking-widest font-mono"
              >
                Send another message →
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-mono tracking-widest text-white/50 uppercase">Name</label>
                  <input
                    required
                    type="text"
                    className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors placeholder:text-white/20"
                    placeholder="Alan Turing"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono tracking-widest text-white/50 uppercase">Email</label>
                  <input
                    required
                    type="email"
                    className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors placeholder:text-white/20"
                    placeholder="alan@enigma.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono tracking-widest text-white/50 uppercase">Subject</label>
                <div className="relative">
                  <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  <input
                    required
                    type="text"
                    className="w-full bg-surface-800 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors placeholder:text-white/20"
                    placeholder="Enterprise API Inquiry"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-mono tracking-widest text-white/50 uppercase">Message</label>
                <textarea
                  required
                  rows={5}
                  className="w-full bg-surface-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500/50 transition-colors placeholder:text-white/20 resize-none"
                  placeholder="Tell us about your project..."
                />
              </div>

              <button
                type="submit"
                disabled={formStatus === 'sending'}
                className="w-full btn-glow font-bold text-surface-950 py-4 rounded-xl flex justify-center items-center gap-2 mt-4"
              >
                {formStatus === 'sending' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-surface-950 border-t-transparent rounded-full animate-spin" />
                    Transmitting...
                  </>
                ) : (
                  <>
                    Send Message <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 px-6 border-t border-white/5 relative z-10 w-full mt-auto">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-white/30 text-sm font-mono tracking-wide">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 rounded bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Film className="w-2.5 h-2.5 text-brand-500" />
            </div>
            <span>AdGen Studio</span>
          </div>
          <p>&copy; 2026</p>
        </div>
      </footer>
    </div>
  );
}
