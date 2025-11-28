import axios from "axios";
import type {
    AxiosError,
    AxiosInstance,
    InternalAxiosRequestConfig,
} from "axios";
import {
    getAccessToken,
    getRefreshToken,
    setAccessToken,
    clearTokens,
} from "../lib/tokenStorage";
import { getCsrfToken } from "../lib/csrf";

const API_BASE = import.meta.env.VITE_API_BASE_URL as string; // ex.: http://127.0.0.1:5000/api/v1
const AUTH_MODE =
    (import.meta.env.VITE_AUTH_MODE as "bearer" | "cookie") || "bearer";

const api: AxiosInstance = axios.create({
    baseURL: API_BASE,
    withCredentials: AUTH_MODE === "cookie",
});

let isRefreshing = false;
let pendingQueue: Array<{
    resolve: (token: string) => void;
    reject: (reason?: any) => void;
}> = [];

function onRefreshed(token: string) {
    pendingQueue.forEach((p) => p.resolve(token));
    pendingQueue = [];
}
function onRefreshFailed(err: any) {
    pendingQueue.forEach((p) => p.reject(err));
    pendingQueue = [];
}

api.interceptors.request.use(
    (config: InternalAxiosRequestConfig & { _retry?: boolean }) => {
        // Bearer header (se modo bearer)
        if (AUTH_MODE === "bearer") {
            const access = getAccessToken();
            if (access) {
                config.headers = config.headers || {};
                config.headers["Authorization"] = `Bearer ${access}`;
            }
        }

        // CSRF (se cookie-mode e método mutável)
        if (AUTH_MODE === "cookie") {
            const method = (config.method || "get").toUpperCase();
            if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
                // descobrir a pathname da request atual (pode ser relativa)
                const urlObj = new URL((config as any).url ?? "", API_BASE);
                const pathname = urlObj.pathname.replace(/\/+$/, ""); // remove barra final
                const needsRefreshCsrf =
                    pathname.endsWith("/auth/refresh") ||
                    pathname.endsWith("/auth/logout-refresh"); // inclua outras rotas se usarem refresh

                const csrf = getCsrfToken(
                    needsRefreshCsrf ? "refresh" : "access"
                );
                if (csrf) {
                    config.headers = config.headers || {};
                    config.headers["X-CSRF-TOKEN"] = csrf;
                }
            }
        }

        return config;
    }
);

api.interceptors.response.use(
    (res) => res,
    async (error: AxiosError & { config: any }) => {
        const original = error.config;
        const status = error.response?.status;

        if (status === 401 && !original?._retry) {
            original._retry = true;

            if (AUTH_MODE === "bearer") {
                const refresh = getRefreshToken();
                if (!refresh) {
                    clearTokens();
                    return Promise.reject(error);
                }
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        pendingQueue.push({
                            resolve: (token: string) => {
                                original.headers = original.headers || {};
                                original.headers[
                                    "Authorization"
                                ] = `Bearer ${token}`;
                                resolve(api(original));
                            },
                            reject,
                        });
                    });
                }

                isRefreshing = true;
                try {
                    const { data } = await axios.post(
                        `${API_BASE}/auth/refresh`,
                        {},
                        { headers: { Authorization: `Bearer ${refresh}` } } // bearer-mode
                    );
                    const newAccess = (data as { access_token: string })
                        .access_token;
                    setAccessToken(newAccess);
                    isRefreshing = false;
                    onRefreshed(newAccess);

                    if (AUTH_MODE === "bearer") {
                        original.headers = original.headers || {};
                        original.headers[
                            "Authorization"
                        ] = `Bearer ${newAccess}`;
                    }
                    return api(original);
                } catch (e) {
                    isRefreshing = false;
                    onRefreshFailed(e);
                    clearTokens();
                    return Promise.reject(e);
                }
            }

            // COOKIE-MODE
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    pendingQueue.push({
                        resolve: (token: string) => {
                            original.headers = original.headers || {};
                            original.headers[
                                "Authorization"
                            ] = `Bearer ${token}`;
                            resolve(api(original));
                        },
                        reject,
                    });
                });
            }

            isRefreshing = true;
            try {
                const csrf = getCsrfToken("refresh");
                const { data } = await axios.post(
                    `${API_BASE}/auth/refresh`,
                    {},
                    {
                        withCredentials: true,
                        headers: csrf ? { "X-CSRF-TOKEN": csrf } : undefined,
                    }
                );
                const newAccess = (data as { access_token: string })
                    .access_token;
                setAccessToken(newAccess);
                isRefreshing = false;
                onRefreshed(newAccess);

                original.headers = original.headers || {};
                original.headers["Authorization"] = `Bearer ${newAccess}`;
                return api(original);
            } catch (e) {
                isRefreshing = false;
                onRefreshFailed(e);
                clearTokens();
                return Promise.reject(e);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
