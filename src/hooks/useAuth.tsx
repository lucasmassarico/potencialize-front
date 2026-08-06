import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import * as AuthAPI from "../api/auth";
import { decodeJwt } from "../lib/jwt";
import {
    clearTokens,
    getRefreshToken,
    setAccessToken,
    setRefreshToken,
    subscribeToSessionClear,
} from "../lib/tokenStorage";
import type { AuthUser, LoginBody } from "../types/auth";
import { normalizeAuthMode } from "../types/auth";
import {
    clearAuthenticatedCache,
    completeRemoteLogout,
    isBearerLoginResponse,
    isBearerRefreshResponse,
    isRole,
    parseAuthUser,
} from "./authSession";

const AUTH_MODE = normalizeAuthMode(import.meta.env.VITE_AUTH_MODE);

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    login: (payload: LoginBody) => Promise<void>;
    logout: () => Promise<void>;
}

interface JwtIdentityClaims {
    role?: unknown;
    sub?: unknown;
    teacher_id?: unknown;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function positiveInteger(value: unknown): number | undefined {
    const parsed =
        typeof value === "number"
            ? value
            : typeof value === "string" && value.trim() !== ""
            ? Number(value)
            : Number.NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function userFromAccessToken(token: string): AuthUser | null {
    const claims = decodeJwt<JwtIdentityClaims>(token);
    if (!claims || !isRole(claims.role)) return null;

    const teacherId =
        positiveInteger(claims.teacher_id) ?? positiveInteger(claims.sub);
    return teacherId === undefined
        ? { role: claims.role }
        : { role: claims.role, teacher_id: teacherId };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const replaceSessionUser = useCallback(
        (nextUser: AuthUser | null) => {
            clearAuthenticatedCache(queryClient);
            setUser(nextUser);
        },
        [queryClient]
    );

    useEffect(
        () =>
            subscribeToSessionClear(() => {
                replaceSessionUser(null);
            }),
        [replaceSessionUser]
    );

    useEffect(() => {
        let active = true;

        async function restoreSession() {
            try {
                if (AUTH_MODE === "cookie") {
                    // /me usa apenas o cookie HttpOnly. Se o access expirou, o
                    // interceptor renova o cookie e repete esta requisicao.
                    const response = await AuthAPI.me();
                    const restoredUser = parseAuthUser(response);
                    if (!restoredUser) {
                        throw new Error("Resposta de sessao invalida");
                    }

                    clearTokens({ notify: false });
                    if (active) replaceSessionUser(restoredUser);
                    return;
                }

                if (!getRefreshToken("bearer")) return;

                const response = await AuthAPI.refresh("bearer");
                if (!isBearerRefreshResponse(response)) {
                    throw new Error("Resposta de refresh invalida");
                }

                const restoredUser = userFromAccessToken(
                    response.access_token
                );
                if (!restoredUser) {
                    throw new Error("Token de acesso invalido");
                }

                setAccessToken(response.access_token);
                if (active) replaceSessionUser(restoredUser);
            } catch {
                clearTokens({ notify: false });
                if (active) replaceSessionUser(null);
            } finally {
                if (active) setLoading(false);
            }
        }

        void restoreSession();
        return () => {
            active = false;
        };
    }, [replaceSessionUser]);

    const doLogin = useCallback(
        async (payload: LoginBody) => {
            const response = await AuthAPI.login(payload, AUTH_MODE);

            if (AUTH_MODE === "cookie") {
                const nextUser = parseAuthUser(response);
                if (!nextUser) {
                    throw new Error("Resposta de login invalida");
                }

                clearTokens({ notify: false });
                replaceSessionUser(nextUser);
                return;
            }

            if (!isBearerLoginResponse(response)) {
                throw new Error("Resposta de login bearer invalida");
            }

            const nextUser = parseAuthUser(response);
            if (!nextUser) {
                throw new Error("Identidade de login invalida");
            }

            clearTokens({ notify: false });
            setAccessToken(response.access_token);
            setRefreshToken(response.refresh_token, "bearer");
            replaceSessionUser(nextUser);
        },
        [replaceSessionUser]
    );

    const doLogout = useCallback(
        () =>
            completeRemoteLogout(
                () => AuthAPI.logout(AUTH_MODE),
                () => {
                    clearTokens({ notify: false });
                    replaceSessionUser(null);
                },
            ),
        [replaceSessionUser],
    );

    const value = useMemo(
        () => ({ user, loading, login: doLogin, logout: doLogout }),
        [user, loading, doLogin, doLogout]
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}
