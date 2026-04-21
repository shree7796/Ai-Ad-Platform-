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
  expires: 1,
  sameSite: 'strict',
  secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
};

export function setAuth(token: string, user: User): void {
  Cookies.set('token', token, COOKIE_OPTS);
  Cookies.set('user', JSON.stringify(user), COOKIE_OPTS);
}

export function clearAuth(): void {
  Cookies.remove('token');
  Cookies.remove('user');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
