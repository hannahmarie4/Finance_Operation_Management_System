/**
 * ─── FOMS API Service ─────────────────────────────────────────────
 * Centralized Axios client for all backend API calls.
 * - Automatically attaches JWT token from sessionStorage
 * - Proxied through Vite to http://localhost:5007 (no CORS)
 * ─────────────────────────────────────────────────────────────────
 */

import axios from 'axios';
import { SESSION_CONFIG } from '../data/seed';
import { isDemoMode } from '../config/runtimeMode';
import { demoApiAdapter } from './demoApiAdapter';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  ...(isDemoMode ? { adapter: demoApiAdapter } : {}),
});

// ── Request interceptor: attach Bearer token ──
api.interceptors.request.use((config) => {
  try {
    const raw = sessionStorage.getItem(SESSION_CONFIG.STORAGE_KEY);
    if (raw) {
      const session = JSON.parse(raw);
      if (session?.accessToken) {
        config.headers.Authorization = `Bearer ${session.accessToken}`;
      }
    }
  } catch {
    // ignore parse errors
  }
  return config;
});

export default api;

// ─── Auth ─────────────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  employeeId: string;
  name: string;
  role: string;
  email: string;
}

export const authApi = {
  login: (username: string, password: string) =>
    api.post<{ success: boolean; data: LoginResponse }>('/auth/login', { username, password }),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }),
};

// ─── Clients ──────────────────────────────────────────────────────

export const clientsApi = {
  getAll: () => api.get<any[]>('/clients'),
  create: (data: any) => api.post('/clients', data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
};

// ─── Invoices ─────────────────────────────────────────────────────

export const invoicesApi = {
  getAll: () => api.get<any[]>('/invoices'),
};

// ─── Shipment Records (Waybills) ──────────────────────────────────

export const shipmentsApi = {
  getAll: () => api.get<any[]>('/shipment-records'),
};
