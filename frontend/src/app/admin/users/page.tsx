'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  RefreshCw,
  Search,
  UserRound,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI, type AdminUserRow } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { useHydrated } from '@/hooks/useHydrated';

const PLANS = ['free', 'basic', 'pro', 'premium'] as const;

function formatJoined(iso: string) {
  try {
    const d = new Date(iso.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'n/a';
  }
}

function planLabel(plan: string) {
  const p = plan.toLowerCase();
  if (p === 'free') return 'Free';
  if (p === 'basic') return 'Basic';
  if (p === 'pro') return 'Pro';
  if (p === 'premium') return 'Studio';
  return plan;
}

function initials(row: AdminUserRow) {
  const n = row.full_name?.trim() || row.username || row.email;
  const parts = n.split(/[\s@._-]+/).filter(Boolean);
  const a = parts[0]?.[0] ?? '?';
  const b = parts[1]?.[0] ?? '';
  return (a + b).toUpperCase().slice(0, 2);
}

export default function AdminUsersPage() {
  const hydrated = useHydrated();
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const perPage = 12;
  const me = hydrated ? getUser() : null;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.users(page, perPage, search || undefined);
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch {
      toast.error('Could not load users.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const q = searchInput.trim();
      setSearch(q);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  async function copyStripe(id: string | null) {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      toast.success('Copied customer ID');
    } catch {
      toast.error('Copy failed');
    }
  }

  async function saveRow(row: AdminUserRow, patch: { plan?: string; is_active?: boolean; is_admin?: boolean }) {
    if (patch.is_active === false) {
      const ok = window.confirm(
        `Deactivate ${row.email}? They will not be able to sign in until reactivated.`
      );
      if (!ok) return;
    }
    if (patch.is_admin === true) {
      const ok = window.confirm(`Grant administrator access to ${row.email}?`);
      if (!ok) return;
    }
    if (patch.is_admin === false) {
      const ok = window.confirm(`Remove administrator access from ${row.email}?`);
      if (!ok) return;
    }

    setSavingId(row.id);
    try {
      await adminAPI.updateUser(row.id, patch);
      toast.success('Saved');
      await load();
    } catch (err: unknown) {
      const d = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof d === 'string' ? d : 'Update failed');
    } finally {
      setSavingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1;
  const rangeEnd = Math.min(page * perPage, total);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Directory</p>
        <div className="mt-1 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Users
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
              Search by email or username. Plan changes apply in-app immediately; keep Stripe in sync for paying customers.{' '}
              <Link href="/admin" className="font-semibold text-[var(--accent)] underline-offset-2 hover:underline">
                Back to overview
              </Link>
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

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <span
              className="pointer-events-none absolute left-3 top-1/2 z-10 flex -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden
            >
              <Search className="h-4 w-4" />
            </span>
            <input
              id="admin-user-search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const q = searchInput.trim();
                  setSearch(q);
                  setPage(1);
                }
              }}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] py-2.5 pl-11 pr-3 text-sm font-medium text-[var(--text-primary)] shadow-sm outline-none ring-indigo-500/0 transition placeholder:text-[var(--text-muted)] focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15"
              placeholder="Search email or username..."
              aria-label="Search users"
            />
          </div>
          {searchInput.trim() || search ? (
            <button
              type="button"
              className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-bold text-[var(--text-secondary)] shadow-sm transition hover:bg-[var(--bg-subtle)]"
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setPage(1);
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
        <p className="text-xs font-medium tabular-nums text-[var(--text-muted)]">
          {total === 0 ? 'No results' : `Showing ${rangeStart} to ${rangeEnd} of ${total}`}
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-lg)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                <th className="whitespace-nowrap px-4 py-3.5 pl-5">User</th>
                <th className="whitespace-nowrap px-4 py-3.5">Plan</th>
                <th className="whitespace-nowrap px-4 py-3.5">Billing row</th>
                <th className="whitespace-nowrap px-4 py-3.5">Status</th>
                <th className="whitespace-nowrap px-4 py-3.5">Role</th>
                <th className="whitespace-nowrap px-4 py-3.5">Stripe</th>
                <th className="whitespace-nowrap px-4 py-3.5 pr-5">Joined</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y divide-[var(--border)] transition-opacity duration-150 ${
                loading && items.length > 0 ? 'opacity-60' : ''
              }`}
              aria-busy={loading}
            >
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14">
                    <div className="mx-auto flex max-w-lg flex-col items-center gap-3">
                      <div className="h-3 w-40 animate-pulse rounded-full bg-[var(--bg-muted)]" />
                      <div className="h-12 w-full animate-pulse rounded-xl bg-[var(--bg-muted)]" />
                      <p className="text-xs font-medium text-[var(--text-muted)]">Loading directory…</p>
                    </div>
                  </td>
                </tr>
              ) : !loading && items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--bg-accent-soft)] text-[var(--accent)]">
                        <UserRound className="h-6 w-6" aria-hidden />
                      </div>
                      <p className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--text-primary)]">
                        No users match
                      </p>
                      <p className="text-sm text-[var(--text-secondary)]">
                        Try another search or clear filters to see the full directory.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const isSelf = me?.id === row.id;
                  const busy = savingId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-[var(--bg-subtle)]/70"
                    >
                      <td className="px-4 py-4 pl-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/10 text-xs font-extrabold text-[var(--accent)] ring-1 ring-indigo-500/15">
                            {initials(row)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-[var(--text-primary)]">
                              {row.full_name?.trim() || row.username}
                              {isSelf ? (
                                <span className="ml-2 rounded-md bg-[var(--bg-accent-soft)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">
                                  You
                                </span>
                              ) : null}
                            </div>
                            <div className="truncate text-xs text-[var(--text-muted)]">{row.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          className="max-w-[9.5rem] cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg-muted)] px-2.5 py-2 text-xs font-bold text-[var(--text-primary)] shadow-sm outline-none transition hover:border-indigo-300/50 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                          value={row.plan}
                          disabled={busy}
                          aria-label={`Plan for ${row.email}`}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === row.plan) return;
                            void saveRow(row, { plan: v });
                          }}
                        >
                          {PLANS.map((p) => (
                            <option key={p} value={p}>
                              {planLabel(p)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs font-medium text-[var(--text-secondary)]">
                          {row.subscription_plan ? (
                            <span className="font-semibold text-[var(--text-primary)]">{planLabel(row.subscription_plan)}</span>
                          ) : (
                            <span className="text-[var(--text-muted)]">None</span>
                          )}
                          {row.subscription_active != null ? (
                            <span
                              className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                row.subscription_active
                                  ? 'bg-emerald-500/12 text-emerald-700 ring-1 ring-emerald-500/25'
                                  : 'bg-amber-500/12 text-amber-800 ring-1 ring-amber-500/25'
                              }`}
                            >
                              {row.subscription_active ? 'Active' : 'Inactive'}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={row.is_active}
                          disabled={busy || isSelf}
                          title={isSelf ? 'You cannot deactivate your own account here' : undefined}
                          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus-visible:outline focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-45 ${
                            row.is_active ? 'bg-emerald-500/85' : 'bg-[var(--bg-muted)] ring-1 ring-[var(--border)]'
                          }`}
                          onClick={() => void saveRow(row, { is_active: !row.is_active })}
                        >
                          <span
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                              row.is_active ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={row.is_admin}
                          disabled={busy || isSelf}
                          title={isSelf ? 'You cannot remove your own admin role here' : undefined}
                          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition focus-visible:outline focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-45 ${
                            row.is_admin ? 'bg-[var(--accent)]' : 'bg-[var(--bg-muted)] ring-1 ring-[var(--border)]'
                          }`}
                          onClick={() => void saveRow(row, { is_admin: !row.is_admin })}
                        >
                          <span
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                              row.is_admin ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </td>
                      <td className="max-w-[160px] px-4 py-4">
                        {row.stripe_customer_id ? (
                          <div className="flex items-center gap-1">
                            <code className="block min-w-0 flex-1 truncate rounded-md bg-[var(--bg-muted)] px-2 py-1 text-[10px] font-medium text-[var(--text-secondary)] ring-1 ring-[var(--border)]">
                              {row.stripe_customer_id}
                            </code>
                            <button
                              type="button"
                              className="shrink-0 rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--accent)]"
                              aria-label="Copy Stripe customer ID"
                              onClick={() => void copyStripe(row.stripe_customer_id)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)]">None</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 pr-5 text-xs font-medium tabular-nums text-[var(--text-secondary)]">
                        {formatJoined(row.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <p className="text-xs font-medium text-[var(--text-muted)]">
          Page <span className="tabular-nums text-[var(--text-secondary)]">{page}</span> of{' '}
          <span className="tabular-nums text-[var(--text-secondary)]">{totalPages}</span>
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm font-bold text-[var(--text-secondary)] shadow-sm transition hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-sm font-bold text-[var(--text-secondary)] shadow-sm transition hover:bg-[var(--bg-subtle)] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
