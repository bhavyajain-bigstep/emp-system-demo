import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

import type { ApiErrorBody, ApiResponse } from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

export const TOKEN_KEY = "pulsehr.token";
export const USER_KEY = "pulsehr.user";

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
  withCredentials: true, // send cookies (refresh token)
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
        }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post<{ data: { accessToken: string } }>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newAccessToken = refreshRes.data.data.accessToken;
        localStorage.setItem(TOKEN_KEY, newAccessToken);
        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        clearSession();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    if (body?.error?.message) return body.error.message;
    if (body?.message) return body.message;
    if (error.code === "ECONNABORTED") return "Request timed out. Please try again.";
    if (!error.response) return "Cannot reach the server. Is the backend running?";
    return `Request failed with status ${error.response.status}`;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function extractErrorCode(error: unknown): string | undefined {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    return body?.error?.code;
  }
  return undefined;
}

export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const res = await promise;
  return res.data.data;
}