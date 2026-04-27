/**
 * Typed Axios instance — all API calls go through here.
 *
 * Features:
 *  - Base URL from VITE_API_URL (proxied by Vite in dev → no CORS issues)
 *  - Automatically attaches Bearer token from localStorage
 *  - On 401, attempts a token refresh and retries the original request once
 *  - Dispatches logout action if refresh also fails
 */
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

const BASE_URL = "/api/v1"; // Vite proxies /api → http://localhost:8000

// Storage keys (centralised so they're consistent everywhere)
export const TOKEN_KEYS = {
  access: "auth_access_token",
  refresh: "auth_refresh_token",
} as const;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15_000,
});

// ── Request interceptor – attach access token ──────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEYS.access);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor – silent token refresh on 401 ────────────────────
let isRefreshing = false;
let pendingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function drainQueue(error: unknown, token: string | null) {
  pendingQueue.forEach((p) =>
    token ? p.resolve(token) : p.reject(error)
  );
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original: AxiosRequestConfig & { _retry?: boolean } =
      error.config ?? {};

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem(TOKEN_KEYS.refresh);
    if (!refreshToken) {
      // No refresh token → force logout
      localStorage.removeItem(TOKEN_KEYS.access);
      localStorage.removeItem(TOKEN_KEYS.refresh);
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue the request until the ongoing refresh finishes
      return new Promise<AxiosResponse>((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            original.headers = {
              ...original.headers,
              Authorization: `Bearer ${token}`,
            };
            original._retry = true;
            resolve(apiClient(original));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    original._retry = true;

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });

      const newAccess: string = data.access_token;
      localStorage.setItem(TOKEN_KEYS.access, newAccess);

      apiClient.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
      drainQueue(null, newAccess);

      original.headers = {
        ...original.headers,
        Authorization: `Bearer ${newAccess}`,
      };
      return apiClient(original);
    } catch (refreshError) {
      drainQueue(refreshError, null);
      localStorage.removeItem(TOKEN_KEYS.access);
      localStorage.removeItem(TOKEN_KEYS.refresh);
      window.dispatchEvent(new Event("auth:logout"));
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
