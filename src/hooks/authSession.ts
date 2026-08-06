import type { QueryClient } from "@tanstack/react-query";

import type {
    AuthUser,
    BearerLoginResponse,
    BearerRefreshResponse,
    Role,
} from "../types/auth";

const ROLES: readonly Role[] = ["admin", "coordinator", "teacher"];

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

export function isRole(value: unknown): value is Role {
    return ROLES.some((role) => role === value);
}

export function parseAuthUser(value: unknown): AuthUser | null {
    if (!isRecord(value) || !isRole(value.role)) return null;

    const teacherId = value.teacher_id;
    if (
        teacherId !== undefined &&
        (!Number.isInteger(teacherId) || Number(teacherId) <= 0)
    ) {
        return null;
    }

    return teacherId === undefined
        ? { role: value.role }
        : { role: value.role, teacher_id: Number(teacherId) };
}

export function isBearerLoginResponse(
    value: unknown
): value is BearerLoginResponse {
    return (
        parseAuthUser(value) !== null &&
        isRecord(value) &&
        typeof value.access_token === "string" &&
        value.access_token.length > 0 &&
        typeof value.refresh_token === "string" &&
        value.refresh_token.length > 0
    );
}

export function isBearerRefreshResponse(
    value: unknown
): value is BearerRefreshResponse {
    return (
        isRecord(value) &&
        typeof value.access_token === "string" &&
        value.access_token.length > 0
    );
}

export function clearAuthenticatedCache(queryClient: QueryClient): void {
    queryClient.clear();
}

export async function completeRemoteLogout(
    remoteLogout: () => Promise<unknown>,
    clearLocalSession: () => void,
): Promise<void> {
    await remoteLogout();
    clearLocalSession();
}
