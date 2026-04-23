'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { authAPI } from '@/lib/api';
import { getToken, getUser, setAuth, type User } from '@/lib/auth';

type AuthStatus = 'idle' | 'checking' | 'ready';

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  /** True while validating the session with the API (token present, no cookie user yet, or explicit refresh). */
  isSessionPending: boolean;
  refreshUser: () => Promise<User | null>;
  /** Clear client auth state after cookies are removed (e.g. sign-out). */
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

let inflightMe: Promise<User | null> | null = null;

async function fetchMeOnce(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;
  if (inflightMe) return inflightMe;
  inflightMe = (async () => {
    try {
      const res = await authAPI.me();
      setAuth(token, res.data);
      return res.data;
    } catch {
      return null;
    } finally {
      inflightMe = null;
    }
  })();
  return inflightMe;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(() => (typeof window !== 'undefined' ? getUser() : null));
  const [status, setStatus] = useState<AuthStatus>('idle');
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setStatus('ready');
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      if (mounted.current) {
        setUser(null);
        setStatus('ready');
      }
      return null;
    }
    const cookieUser = getUser();
    if (!cookieUser) {
      if (mounted.current) setStatus('checking');
    }
    const fresh = await fetchMeOnce();
    if (!mounted.current) return fresh;
    if (fresh) {
      setUser(fresh);
    } else if (!cookieUser) {
      setUser(null);
    }
    setStatus('ready');
    return fresh;
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setStatus('ready');
      return;
    }
    const cookieUser = getUser();
    if (cookieUser) {
      setUser(cookieUser);
    }
  }, [pathname]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setStatus('ready');
      return;
    }
    const cookieUser = getUser();
    setUser(cookieUser);
    if (!cookieUser) {
      setStatus('checking');
    }
    refreshUser();
  }, [refreshUser]);

  const isSessionPending = status === 'checking';

  const value = useMemo(
    () => ({ user, status, isSessionPending, refreshUser, clearSession }),
    [user, status, isSessionPending, refreshUser, clearSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

/** Convenience alias for consumers that only need the user record. */
export function useUser(): User | null {
  return useAuth().user;
}
