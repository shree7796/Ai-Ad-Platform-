'use client';

import type { LucideIcon } from 'lucide-react';

type Props = {
  label: string;
  value: number | string;
  hint?: string;
  icon: LucideIcon;
  loading?: boolean;
};

export function AdminStatCard({ label, value, hint, icon: Icon, loading }: Props) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-md)] transition-shadow hover:shadow-[0_12px_32px_-12px_rgba(99,102,241,0.18)]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500/[0.07] to-violet-500/[0.05] blur-2xl transition-opacity group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold tabular-nums tracking-tight text-[var(--text-primary)]">
            {loading ? <span className="inline-block h-9 w-16 animate-pulse rounded-md bg-[var(--bg-muted)]" /> : value}
          </p>
          {hint ? <p className="mt-2 text-xs font-medium leading-relaxed text-[var(--text-secondary)]">{hint}</p> : null}
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--bg-accent-soft)] text-[var(--accent)] ring-1 ring-indigo-500/15">
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
        </div>
      </div>
    </div>
  );
}
