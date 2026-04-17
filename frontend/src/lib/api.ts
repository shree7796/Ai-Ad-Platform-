import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('token');
      Cookies.remove('user');
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

  me: () => api.get('/auth/me'),
};

// ── Projects API ──

export const projectsAPI = {
  list: (page = 1, perPage = 20) =>
    api.get(`/projects/?page=${page}&per_page=${perPage}`),

  get: (id: string) =>
    api.get(`/projects/${id}`),

  create: (formData: FormData) =>
    api.post('/projects/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

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
  }) => api.post('/generate/', data),

  status: (sceneId: string) =>
    api.get(`/generate/${sceneId}/status`),
};

// ── Models API ──

export const modelsAPI = {
  list: () => api.get('/models/'),
};

export default api;
