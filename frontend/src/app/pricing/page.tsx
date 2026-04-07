'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Film, CheckCircle2 } from 'lucide-react';

const tiers = [
  {
    name: 'Creator',
    price: '$0',
    description: 'Perfect for exploring capabilities and small projects.',
    features: ['10 free generations/mo', 'Standard resolution (720p)', 'Base models access', 'Community support'],
    cta: 'Start Free',
    highlighted: false
  },
  {
    name: 'Pro Studio',
    price: '$49',
    unit: '/mo',
    description: 'For professionals requiring volume and high-quality outputs.',
    features: ['500 generations/mo', 'Ultra-HQ rendering (4K)', 'Premium & custom models', 'Priority queueing', 'API Access'],
    cta: 'Upgrade to Pro',
    highlighted: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'Unlimited compute scale for heavy integration and API workloads.',
    features: ['Unlimited generations', 'Custom model training', 'Dedicated account manager', 'SLA guaranteed uptime'],
    cta: 'Contact Sales',
    highlighted: false
  }
];

export default function PricingPage() {
  return (
    <div className="min-h-screen font-sans">
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
            <Link href="/pricing" className="text-brand-500 hover:text-brand-400 transition-colors text-sm font-medium tracking-wide">
              Pricing
            </Link>
            <Link href="/contact" className="text-white/50 hover:text-white transition-colors text-sm font-medium tracking-wide">
              Contact
            </Link>
            <Link href="/login" className="btn-glow text-sm py-2 px-5 !rounded-lg">
              Enter Studio
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero & Grid ── */}
      <section className="pt-48 pb-32 px-6 relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center w-full max-w-4xl"
        >
          <h1 className="text-6xl md:text-8xl font-display font-medium tracking-tighter mb-6 relative">
            Compute that <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-brand-500">Scales</span>
          </h1>
          <p className="text-white/40 max-w-2xl mx-auto text-sm md:text-base font-mono tracking-wide mb-20 uppercase">
            // straightforward pricing, no hidden limits.
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto w-full grid md:grid-cols-3 gap-8">
          {tiers.map((tier, idx) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              className={`relative bg-surface-900 border ${
                tier.highlighted ? 'border-brand-500/50 shadow-[0_0_40px_-15px_rgba(163,255,18,0.3)]' : 'border-white/5'
              } rounded-3xl p-8 flex flex-col`}
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-0 right-0 flex justify-center">
                  <span className="bg-brand-500 text-surface-950 font-bold text-xs uppercase tracking-widest py-1 px-4 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              
              <h3 className="text-xl font-display font-medium mb-4">{tier.name}</h3>
              <div className="mb-6 flex items-baseline gap-1">
                <span className="text-5xl font-display font-medium tracking-tighter">{tier.price}</span>
                {tier.unit && <span className="text-white/30 text-lg">{tier.unit}</span>}
              </div>
              
              <p className="text-white/50 text-sm leading-relaxed mb-10 h-10 border-b border-white/5 pb-16">
                {tier.description}
              </p>
              
              <ul className="flex-1 space-y-4 mb-10">
                {tier.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <CheckCircle2 className={`w-5 h-5 shrink-0 ${tier.highlighted ? 'text-brand-500' : 'text-white/20'}`} />
                    <span className="text-white/70 text-sm">{feat}</span>
                  </li>
                ))}
              </ul>
              
              <Link 
                href={tier.name === 'Enterprise' ? '/contact' : '/register'}
                className={`w-full py-4 rounded-xl font-medium tracking-wide flex justify-center transition-all ${
                  tier.highlighted 
                  ? 'bg-brand-500 text-surface-950 hover:bg-brand-400 font-bold' 
                  : 'bg-surface-800 text-white hover:bg-surface-700'
                }`}
              >
                {tier.cta}
              </Link>
            </motion.div>
          ))}
        </div>
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
