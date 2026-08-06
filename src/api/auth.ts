import api from "./http";
import { getRefreshToken } from "../lib/tokenStorage";
import type {
    AuthMode,
    LoginBody,
    LoginResponse,
    RefreshResponse,
    SessionResponse,
} from "../types/auth";

interface LogoutResponse {
    msg: string;
}

export async function login(body: LoginBody, mode: AuthMode) {
    const endpoint = mode === "bearer" ? "/auth/login-bearer" : "/auth/login";
    const { data } = await api.post<LoginResponse>(endpoint, body);
    return data;
}

export async function me() {
    const { data } = await api.get<SessionResponse>("/auth/me");
    return data;
}

function bearerHeaders() {
    const refreshToken = getRefreshToken("bearer");
    if (!refreshToken) {
        throw new Error("Refresh token indisponivel");
    }

    return { Authorization: `Bearer ${refreshToken}` };
}

function isUnauthorized(error: unknown): boolean {
    if (typeof error !== "object" || error === null || !("response" in error)) {
        return false;
    }

    const response = error.response;
    return (
        typeof response === "object" &&
        response !== null &&
        "status" in response &&
        response.status === 401
    );
}

async function revokeOrAcceptInvalid(
    request: Promise<{ data: LogoutResponse }> | null,
): Promise<LogoutResponse | null> {
    if (!request) return null;

    try {
        return (await request).data;
    } catch (error) {
        if (isUnauthorized(error)) return null;
        throw error;
    }
}

export async function refresh(mode: AuthMode) {
    const endpoint =
        mode === "bearer" ? "/auth/refresh-bearer" : "/auth/refresh";
    const config =
        mode === "bearer" ? { headers: bearerHeaders() } : undefined;
    const response = config
        ? await api.post<RefreshResponse>(endpoint, {}, config)
        : await api.post<RefreshResponse>(endpoint, {});
    const { data } = response;
    return data;
}

export async function logout(mode: AuthMode) {
    if (mode === "bearer") {
        const refreshToken = getRefreshToken("bearer");
        const accessRevocation = api.post<LogoutResponse>("/auth/logout", {});
        const refreshRevocation = refreshToken
            ? api.post<LogoutResponse>(
                  "/auth/logout-refresh",
                  {},
                  { headers: { Authorization: `Bearer ${refreshToken}` } },
              )
            : null;

        const [accessResult, refreshResult] = await Promise.all([
            revokeOrAcceptInvalid(accessRevocation),
            revokeOrAcceptInvalid(refreshRevocation),
        ]);

        return refreshResult ?? accessResult ?? { msg: "Sessao ja encerrada." };
    }

    const { data } = await api.post<LogoutResponse>("/auth/logout", {});
    return data;
}

export async function logoutRefresh() {
    return logout("bearer");
}
