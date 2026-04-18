import Cookies from 'js-cookie';

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  plan: string;
  is_admin?: boolean;
  is_active: boolean;
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

export function setAuth(token: string, user: User): void {
  Cookies.set('token', token, { expires: 1 }); // 1 day
  Cookies.set('user', JSON.stringify(user), { expires: 1 });
}

export function clearAuth(): void {
  Cookies.remove('token');
  Cookies.remove('user');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
