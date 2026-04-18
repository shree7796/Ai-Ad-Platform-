'use client';

import Link from 'next/link';
import { LayoutDashboard, Users } from 'lucide-react';

const links = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, match: (p: string | null) => p === '/admin' },
  { href: '/admin/users', label: 'Users', icon: Users, match: (p: string | null) => !!p?.startsWith('/admin/users') },
] as const;

export function AdminTopNav({ pathname }: { pathname: string | null }) {
  return (
    <nav className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-1" aria-label="Admin sections">
      {links.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              active
                ? 'bg-[var(--bg-card)] text-[var(--text-primary)] shadow-sm ring-1 ring-[var(--border)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--bg-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
