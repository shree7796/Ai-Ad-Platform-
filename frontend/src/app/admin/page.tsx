'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CreditCard, RefreshCw, Shield, UserCheck, Users } from 'lucide-react';
import { adminAPI, type AdminOverview } from '@/lib/api';
import { AdminStatCard } from '@/components/admin/AdminStatCard';

export default function AdminHomePage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminAPI.overview();
      setData(res.data);
    } catch {
      setError('Could not load overview. Check that the API is running and you are still signed in.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Dashboard</p>
            <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Overview
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[var(--text-secondary)]">
              Live counts across your tenant. Use{' '}
              <Link href="/admin/users" className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline">
                Users
              </Link>{' '}
              to manage plans, access, and billing-related identifiers.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-bold text-[var(--text-secondary)] shadow-sm transition hover:bg-[var(--bg-subtle)] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden />
            Refresh
          </button>
        </div>
      </motion.div>

      {error ? (
        <div
          className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-900 shadow-sm"
          role="alert"
        >
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1 text-red-800/90">{error}</p>
          <button
            type="button"
            className="mt-3 text-sm font-bold text-red-700 underline-offset-2 hover:underline"
            onClick={() => void load()}
          >
            Try again
          </button>
        </div>
      ) : null}

      <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminStatCard
          label="Total users"
          value={data?.total_users ?? 0}
          hint="All registered accounts"
          icon={Users}
          loading={loading && !data}
        />
        <AdminStatCard
          label="Active accounts"
          value={data?.active_users ?? 0}
          hint="Users who can sign in"
          icon={UserCheck}
          loading={loading && !data}
        />
        <AdminStatCard
          label="Administrators"
          value={data?.admin_users ?? 0}
          hint="Users with full console access"
          icon={Shield}
          loading={loading && !data}
        />
        <AdminStatCard
          label="Paid plans"
          value={data?.paid_plan_users ?? 0}
          hint="On basic, pro, or premium"
          icon={CreditCard}
          loading={loading && !data}
        />
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-md)]">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--text-primary)]">
            Operations
          </h2>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--text-secondary)]">
            Subscription renewals and payment history are handled in Stripe. Manual plan edits here apply immediately in the
            app and may be overwritten when the next billing webhook runs if they do not match the subscription.
          </p>
          <Link
            href="/admin/users"
            className="mt-5 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/20 transition hover:opacity-95"
          >
            Open user directory
          </Link>
        </div>
        <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-md)]">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--text-primary)]">
            Security
          </h2>
          <ul className="mt-3 list-inside list-disc space-y-2 text-sm text-[var(--text-secondary)]">
            <li>Only users with the administrator flag can view this console.</li>
            <li>You cannot deactivate yourself or remove your own admin role from this UI.</li>
            <li>Stripe customer IDs are sensitive; treat exports and screen shares accordingly.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
