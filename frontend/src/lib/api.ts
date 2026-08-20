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
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    if (error.response?.status === 401) {
      clearSession();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
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