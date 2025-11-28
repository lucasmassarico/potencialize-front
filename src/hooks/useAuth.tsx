// src/hooks/useAuth.tsx
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import * as AuthAPI from "../api/auth";
import {
    setAccessToken,
    setRefreshToken,
    getRefreshToken,
    clearTokens,
} from "../lib/tokenStorage";
import type { LoginBody, LoginResponse, Role } from "../types/auth";
import { decodeJwt } from "../lib/jwt";
import { readCookie } from "../lib/csrf";

interface UserInfo {
    role: Role;
    teacher_id?: number;
}

interface AuthContextValue {
    user: UserInfo | null;
    loading: boolean;
    login: (payload: LoginBody) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserInfo | null>(null);
    const [loading, setLoading] = useState(true);

    // Boot: tenta refresh se houver refresh_token persistido
    useEffect(() => {
        (async () => {
            try {
                const MODE =
                    (import.meta.env.VITE_AUTH_MODE as "bearer" | "cookie") ||
                    "cookie";
                if (MODE === "cookie") {
                    // Em cookie-mode tentamos SEMPRE, pois não temos como "ver" HttpOnly via JS
                    // Só tenta se há indício do refresh (csrf_refresh_token visível no JS)
                    const hasRefreshArtifcats =
                        !!readCookie("csrf_refresh_token");
                    if (!hasRefreshArtifcats) {
                        return;
                    }
                    const { access_token } = await AuthAPI.refresh();
                    if (access_token) {
                        setAccessToken(access_token);
                        const claims = decodeJwt<{
                            role?: Role;
                            teacher_id?: number;
                        }>(access_token);
                        if (claims?.role) {
                            setUser({
                                role: claims.role,
                                teacher_id: claims.teacher_id,
                            });
                        } else {
                            // Fallback mínimo: mantém usuário genérico autenticado (se prefrir, chame /auth/me)
                            setUser({ role: "teacher" });
                        }
                    }
                } else if (getRefreshToken()) {
                    // bearer-mode: só tenta se temos refresh salvo.
                    const { access_token } = await AuthAPI.refresh();
                    setAccessToken(access_token);
                    const claims = decodeJwt<{
                        role?: Role;
                        teacher_id?: number;
                    }>(access_token);
                    if (claims?.role)
                        setUser({
                            role: claims.role,
                            teacher_id: claims.teacher_id,
                        });
                }
            } catch (_) {
                clearTokens();
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const doLogin = useCallback(async (payload: LoginBody) => {
        const data: LoginResponse = await AuthAPI.login(payload);
        setAccessToken(data.access_token);
        setRefreshToken(data.refresh_token);
        setUser({ role: data.role, teacher_id: data.teacher_id });
    }, []);

    const doLogout = useCallback(async () => {
        const MODE =
            (import.meta.env.VITE_AUTH_MODE as "bearer" | "cookie") || "cookie";
        try {
            if (MODE === "cookie") {
                // Em cookie-mode só chamamos se houver artefato visível
                if (readCookie("csrf_refresh_token")) {
                    await AuthAPI.logout();
                }
            } else {
                // Em bearer-mode, só chamamos se houver refresh salvo
                if (getRefreshToken()) {
                    await AuthAPI.logoutRefresh();
                }
            }
        } catch (_) {}

        clearTokens();
        setUser(null);
    }, []);

    const value = useMemo(
        () => ({ user, loading, login: doLogin, logout: doLogout }),
        [user, loading, doLogin, doLogout]
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
