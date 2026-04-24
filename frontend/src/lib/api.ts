import axios from 'axios';
import Cookies from 'js-cookie';
import type { User } from '@/lib/auth';
import { clearAuth } from '@/lib/auth';

/**
 * API origin:
 * - Browser: default `/api/v1` (Next.js BFF proxy) so we avoid CORS and localhost vs 127.0.0.1 mismatches (Chrome/Safari).
 * - Override with NEXT_PUBLIC_API_URL when you intentionally call the backend directly.
 * - Server (SSR): BACKEND_INTERNAL_URL / API_PROXY_TARGET or localhost fallback.
 */
function getApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    return '/api/v1';
  }

  const internal = process.env.BACKEND_INTERNAL_URL || process.env.API_PROXY_TARGET;
  if (internal) {
    return `${String(internal).replace(/\/$/, '')}/api/v1`;
  }
  return 'http://127.0.0.1:8000/api/v1';
}

const api = axios.create({
  baseURL: getApiBase(),
});

/** Use real API `detail` when present; surface network errors instead of a generic auth message. */
export function formatApiError(err: unknown, fallback: string): string {
  const ax = err as {
    message?: string;
    response?: { data?: { detail?: unknown } };
  };
  const detail = ax.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const parts = detail
      .map((item: unknown) => {
        if (typeof item === 'string') return item;
        if (
          item &&
          typeof item === 'object' &&
          'msg' in item &&
          typeof (item as { msg: unknown }).msg === 'string'
        ) {
          return (item as { msg: string }).msg;
        }
        return null;
      })
      .filter((s): s is string => Boolean(s));
    if (parts.length > 0) return parts.join(' ');
  }
  if (
    detail &&
    typeof detail === 'object' &&
    'msg' in detail &&
    typeof (detail as { msg: unknown }).msg === 'string'
  ) {
    return (detail as { msg: string }).msg;
  }
  if (detail != null && typeof detail !== 'string') {
    try {
      const s = JSON.stringify(detail);
      if (s && s !== '{}') return s.length > 280 ? `${s.slice(0, 280)}…` : s;
    } catch {
      /* ignore */
    }
  }
  const status = (err as { response?: { status?: number } }).response?.status;
  if (status && status >= 400) {
    return `Request failed (${status}). Check the browser Network tab for /projects or /generate.`;
  }
  if (!ax.response && ax.message) {
    return `Cannot reach API (${ax.message}). With Docker, use NEXT_PUBLIC_API_URL=/api/v1 (browser → port 3000 only), ensure API_PROXY_TARGET=http://api:8000 on the frontend service, recreate the frontend, then hard-refresh.`;
  }
  return fallback;
}

/** True when the API response should open the subscription / upgrade modal instead of only a toast. */
export function isUpgradePromptError(err: unknown): boolean {
  const ax = err as {
    response?: { status?: number; data?: { detail?: unknown } };
  };
  const status = ax.response?.status;
  const raw = ax.response?.data?.detail;
  let detail = '';
  if (typeof raw === 'string') detail = raw;
  else if (Array.isArray(raw) && raw.length > 0) detail = formatApiError(err, '');
  detail = detail.toLowerCase();

  if (status === 402) return true;

  if (status === 403) {
    const hints = [
      'subscribe',
      'subscription',
      'billing',
      'upgrade',
      'paid plan',
      'payment required',
      'insufficient credit',
      'monthly',
      'quota',
      'limit reached',
      'allowance',
      'video allowance',
      'plan does not',
      'does not include',
    ];
    return hints.some((h) => detail.includes(h));
  }

  return false;
}

// Attach JWT token; never force application/json on FormData (breaks multipart + causes 422 on /projects).
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  } else if (
    config.data != null &&
    typeof config.data === 'object' &&
    !(config.data instanceof URLSearchParams) &&
    !(config.data instanceof Blob) &&
    config.headers['Content-Type'] === undefined
  ) {
    config.headers['Content-Type'] = 'application/json';
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuth();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth API ──

export const authAPI = {
  register: (data: { email: string; username: string; password: string; full_name?: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  me: (token?: string) => api.get<User>('/auth/me', {
    timeout: 12_000,
    ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
  }),

  updateMe: (data: { full_name?: string | null }) =>
    api.patch<User>('/auth/me', data),
};

// ── Projects API ──

export const projectsAPI = {
  list: (page = 1, perPage = 20) =>
    api.get(`/projects/?page=${page}&per_page=${perPage}`),

  get: (id: string) =>
    api.get(`/projects/${id}`),

  create: (formData: FormData) =>
    // Path relative to baseURL so axios does not merge to /api/v1/projects (no slash) → 307 + broken multipart.
    // Let axios set multipart boundary; a bare Content-Type breaks uploads.
    api.post('projects/', formData),

  delete: (id: string) =>
    api.delete(`/projects/${id}`),
};

// ── Generation API ──

export const generationAPI = {
  trigger: (data: {
    project_id: string;
    prompt: string;
    tier?: string;
    duration_seconds?: number;
    enhance_prompt?: boolean;
    task_type?: string;
    requested_provider?: string;
    /** image_to_image: keep upload (default true). Set false with cinematic_redraw for full AI hero car. */
    preserve_subject?: boolean;
    cinematic_redraw?: boolean;
    /** image_to_image: allow flux to reframe camera for fire/poster look while locking your model */
    hero_cinematic_reframe?: boolean;
    video_model?: string;
    image_model?: string;
    /** Output aspect ratio for image tasks, e.g. "16:9", "1:1". */
    aspect_ratio?: string;
    /** Second image URL for reference/transition models (e.g. end frame for PixVerse Transition). */
    reference_image_url?: string;
    /** Client-generated UUID- prevents double-reserve on network retries or double-clicks. */
    idempotency_key?: string;
  }) => api.post('generate/', data),

  status: (sceneId: string) =>
    api.get(`/generate/${sceneId}/status`),
};

// ── Models API ──

export const modelsAPI = {
  list: () => api.get('/models/'),
};

// ── Usage / quota (from usage_logs) ──

export interface UsageSummary {
  plan_key: string;
  plan_display_name: string;
  /** Image cap + video unit cap (informational). */
  monthly_quota: number;
  monthly_image_quota: number;
  /** Video quota in billing units (not raw job count). */
  monthly_video_quota: number;
  video_billing_unit_seconds: number;
  used_this_month: number;
  period_start: string;
  period_end: string;
  image_generations_this_month: number;
  video_generations_this_month: number;
  video_units_used_this_month: number;
  subscription_active: boolean;
}

export interface UsageActivityItem {
  id: string;
  created_at: string;
  task_type: string | null;
  tier: string | null;
  cost: string;
  credits: number;
  model_used: string | null;
}

export interface UsageActivityPage {
  items: UsageActivityItem[];
  total: number;
  page: number;
  per_page: number;
}

export const usageAPI = {
  summary: () => api.get<UsageSummary>('/usage/summary'),
  activity: (opts: { page?: number; perPage?: number; q?: string } = {}) => {
    const page = opts.page ?? 1;
    const perPage = opts.perPage ?? 10;
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    if (opts.q?.trim()) params.set('q', opts.q.trim());
    return api.get<UsageActivityPage>(`/usage/activity?${params.toString()}`);
  },
};

export interface CheckoutSessionResponse {
  url: string;
}

export interface CreditCostsResponse {
  model_credit_costs: Record<string, number>;
  image_credit_costs: Record<string, number>;
  subscription_credits: Record<string, number>;
  topup_credits: Record<string, number>;
}

// ── Upload API ──

export const uploadAPI = {
  /** Upload a single image file; returns a public URL. Used for reference/end-frame images. */
  upload: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post<{ url: string }>('upload/', fd);
  },
};

export const billingAPI = {
  createCheckout: (data: { plan_key: 'basic' | 'pro' | 'premium' }) =>
    api.post<CheckoutSessionResponse>('/billing/checkout-session', data),
  syncCheckoutSession: (data: { session_id: string }) =>
    api.post<{ ok: boolean }>('/billing/sync-checkout-session', data),
  creditCosts: () =>
    api.get<CreditCostsResponse>('/billing/credit-costs'),
};

// ── Admin ──

export interface AdminOverview {
  total_users: number;
  active_users: number;
  admin_users: number;
  paid_plan_users: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  username: string;
  full_name: string | null;
  plan: string;
  is_admin: boolean;
  is_active: boolean;
  stripe_customer_id: string | null;
  created_at: string;
  subscription_active: boolean | null;
  subscription_plan: string | null;
}

export interface AdminUserListResponse {
  items: AdminUserRow[];
  total: number;
  page: number;
  per_page: number;
}

export const adminAPI = {
  overview: () => api.get<AdminOverview>('/admin/overview'),
  users: (page = 1, perPage = 20, search?: string) => {
    const q = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (search?.trim()) q.set('search', search.trim());
    return api.get<AdminUserListResponse>(`/admin/users?${q.toString()}`);
  },
  updateUser: (
    id: string,
    body: { plan?: string; is_active?: boolean; is_admin?: boolean }
  ) => api.patch<User>(`/admin/users/${id}`, body),
  resetMonthlyUsage: (email: string) =>
    api.post<{
      email: string;
      deleted_rows: number;
      period_start: string;
      period_end: string;
    }>('/admin/users/reset-monthly-usage', { email }),
  grantCredits: (data: { email: string; amount: number; reason?: string; notes?: string }) =>
    api.post<{ ok: boolean; email: string; new_balance: number }>('/admin/users/grant-credits', data),
};

export default api;
