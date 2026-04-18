'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ExternalLink, Loader2, LogOut, Shield, Zap } from 'lucide-react';
import { authAPI } from '@/lib/api';
import { clearAuth, getToken, getUser, setAuth } from '@/lib/auth';
import { BRAND_NAME } from '@/lib/brand';
import { AdminTopNav } from '@/components/admin/AdminTopNav';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getToken();
      if (!token) {
        router.replace('/login');
        return;
      }
      try {
        const res = await authAPI.me();
        if (cancelled) return;
        setAuth(token, res.data);
        if (res.data.is_admin !== true) {
          router.replace('/studio');
          return;
        }
        setAllowed(true);
      } catch {
        if (!cancelled) router.replace('/login');
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready || !allowed) {
    return (
      <div className="admin-console flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--bg-main)] text-[var(--text-secondary)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" aria-hidden />
        <p className="text-sm font-medium text-[var(--text-primary)]">Verifying administrator access…</p>
      </div>
    );
  }

  const user = getUser();

  return (
    <div className="admin-console flex min-h-screen flex-col bg-[var(--bg-main)] text-[var(--text-secondary)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--bg-card)]/95 shadow-[var(--shadow-sm)] backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-4 lg:gap-6">
            <Link
              href="/admin"
              className="group flex items-center gap-3 no-underline"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] shadow-md shadow-indigo-500/20 ring-1 ring-indigo-950/10 transition group-hover:shadow-lg group-hover:shadow-indigo-500/25">
                <Shield className="h-5 w-5 text-white" strokeWidth={2} aria-hidden />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-display)] text-base font-extrabold tracking-tight text-[var(--text-primary)]">
                    Admin console
                  </span>
                  <span className="rounded-md bg-[var(--bg-accent-soft)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] ring-1 ring-indigo-500/20">
                    Internal
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
                  <Zap className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
                  <span>{BRAND_NAME}</span>
                </div>
              </div>
            </Link>
            <AdminTopNav pathname={pathname} />
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            <div className="hidden min-w-0 max-w-[220px] text-right sm:block">
              <p className="truncate text-xs font-semibold text-[var(--text-primary)]" title={user?.email}>
                {user?.full_name?.trim() || user?.username || 'Admin'}
              </p>
              <p className="truncate text-[11px] text-[var(--text-muted)]" title={user?.email}>
                {user?.email}
              </p>
            </div>
            <Link
              href="/studio"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] px-3 py-2 text-xs font-bold text-[var(--text-secondary)] shadow-sm transition hover:border-indigo-300/40 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Studio
            </Link>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--text-primary)] px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:opacity-90"
              onClick={() => {
                clearAuth();
                router.push('/login');
              }}
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">{children}</main>

      <footer className="mt-auto border-t border-[var(--border)] bg-[var(--bg-card)] py-5 text-center">
        <p className="text-[11px] font-medium text-[var(--text-muted)]">
          {BRAND_NAME} administrator tools · authorized personnel only
        </p>
      </footer>
    </div>
  );
}
