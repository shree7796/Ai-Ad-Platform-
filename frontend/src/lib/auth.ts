import Cookies from 'js-cookie';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  plan: string;
  is_admin?: boolean;
  is_active: boolean;
  credit_balance?: number;
  reserved_balance?: number;
  bonus_credit_balance?: number;
  bonus_credits_expire_at?: string | null;
  /** Current paid plan period end from subscription row (ISO), if any. */
  plan_expires_at?: string | null;
  created_at: string;
}

export function getToken(): string | undefined {
  return Cookies.get('token');
}

export function getUser(): User | null {
  const raw = Cookies.get('user');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const COOKIE_OPTS: Cookies.CookieAttributes = {
  path: '/',
  expires: 1,
  // Lax works across Chrome/Safari/Firefox for same-site SPA login; Strict can block some redirects.
  sameSite: 'lax',
  secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
};

/** Ensure JSON-serializable user cookie (UUIDs, dates from API). */
function normalizeUserForCookie(user: User): User {
  return {
    ...user,
    id: typeof user.id === 'string' ? user.id : String(user.id),
    plan_expires_at:
      user.plan_expires_at != null
        ? typeof user.plan_expires_at === 'string'
          ? user.plan_expires_at
          : String(user.plan_expires_at)
        : null,
    bonus_credits_expire_at:
      user.bonus_credits_expire_at != null
        ? typeof user.bonus_credits_expire_at === 'string'
          ? user.bonus_credits_expire_at
          : String(user.bonus_credits_expire_at)
        : null,
    created_at:
      typeof user.created_at === 'string' ? user.created_at : String((user as { created_at?: unknown }).created_at ?? ''),
  };
}

export function setAuth(token: string, user: User): void {
  const safe = normalizeUserForCookie(user);
  Cookies.set('token', token, COOKIE_OPTS);
  Cookies.set('user', JSON.stringify(safe), COOKIE_OPTS);
}

export function clearAuth(): void {
  Cookies.remove('token', { path: '/' });
  Cookies.remove('user', { path: '/' });
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
