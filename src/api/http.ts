import axios from "axios";
import type {
    AxiosError,
    AxiosInstance,
    InternalAxiosRequestConfig,
} from "axios";

import { getCsrfToken } from "../lib/csrf";
import {
    clearTokens,
    getAccessToken,
    getRefreshToken,
    setAccessToken,
} from "../lib/tokenStorage";
import { normalizeAuthMode } from "../types/auth";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string;
const AUTH_MODE = normalizeAuthMode(import.meta.env.VITE_AUTH_MODE);

const api: AxiosInstance = axios.create({
    baseURL: API_BASE,
    withCredentials: AUTH_MODE === "cookie",
});

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

interface PendingRequest {
    resolve: (accessToken: string | null) => void;
    reject: (reason?: unknown) => void;
}

let isRefreshing = false;
let pendingQueue: PendingRequest[] = [];

function finishPendingRequests(accessToken: string | null) {
    pendingQueue.forEach((pending) => pending.resolve(accessToken));
    pendingQueue = [];
}

function failPendingRequests(error: unknown) {
    pendingQueue.forEach((pending) => pending.reject(error));
    pendingQueue = [];
}

function requestPathname(url: string | undefined): string {
    try {
        return new URL(url ?? "", API_BASE || "http://localhost").pathname.replace(
            /\/+$/,
            ""
        );
    } catch {
        return url?.split("?")[0]?.replace(/\/+$/, "") ?? "";
    }
}

function isAuthenticationEntryPoint(url: string | undefined): boolean {
    const pathname = requestPathname(url);
    return [
        "/auth/login",
        "/auth/login-bearer",
        "/auth/refresh",
        "/auth/refresh-bearer",
        "/auth/logout",
        "/auth/logout-refresh",
    ].some((endpoint) => pathname.endsWith(endpoint));
}

function setBearerHeader(
    config: RetryableRequestConfig,
    accessToken: string
): void {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${accessToken}`;
}

async function renewSession(): Promise<string | null> {
    if (AUTH_MODE === "bearer") {
        const refreshToken = getRefreshToken("bearer");
        if (!refreshToken) {
            throw new Error("Refresh token indisponivel");
        }

        const { data } = await axios.post<{ access_token?: unknown }>(
            `${API_BASE}/auth/refresh-bearer`,
            {},
            { headers: { Authorization: `Bearer ${refreshToken}` } }
        );
        if (typeof data.access_token !== "string" || !data.access_token) {
            throw new Error("Resposta de refresh invalida");
        }

        setAccessToken(data.access_token);
        return data.access_token;
    }

    const csrf = getCsrfToken("refresh");
    await axios.post(
        `${API_BASE}/auth/refresh`,
        {},
        {
            withCredentials: true,
            headers: csrf ? { "X-CSRF-TOKEN": csrf } : undefined,
        }
    );
    return null;
}

api.interceptors.request.use((config: RetryableRequestConfig) => {
    if (AUTH_MODE === "bearer") {
        const accessToken = getAccessToken();
        if (accessToken && !config.headers?.["Authorization"]) {
            setBearerHeader(config, accessToken);
        }
    }

    if (AUTH_MODE === "cookie") {
        const method = (config.method || "get").toUpperCase();
        if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
            const pathname = requestPathname(config.url);
            const usesRefreshToken =
                pathname.endsWith("/auth/refresh") ||
                pathname.endsWith("/auth/logout-refresh");
            const csrf = getCsrfToken(
                usesRefreshToken ? "refresh" : "access"
            );
            if (csrf) {
                config.headers = config.headers || {};
                config.headers["X-CSRF-TOKEN"] = csrf;
            }
        }
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const original = error.config as RetryableRequestConfig | undefined;
        if (
            error.response?.status !== 401 ||
            !original ||
            original._retry ||
            isAuthenticationEntryPoint(original.url)
        ) {
            return Promise.reject(error);
        }

        original._retry = true;

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                pendingQueue.push({
                    resolve: (accessToken) => {
                        if (AUTH_MODE === "bearer" && accessToken) {
                            setBearerHeader(original, accessToken);
                        }
                        resolve(api(original));
                    },
                    reject,
                });
            });
        }

        isRefreshing = true;
        try {
            const accessToken = await renewSession();
            if (AUTH_MODE === "bearer" && accessToken) {
                setBearerHeader(original, accessToken);
            }

            isRefreshing = false;
            finishPendingRequests(accessToken);
            return api(original);
        } catch (refreshError) {
            isRefreshing = false;
            failPendingRequests(refreshError);
            clearTokens();
            return Promise.reject(refreshError);
        }
    }
);

export default api;
