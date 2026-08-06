// src/lib/tokenStorage.ts
import type { AuthMode } from "../types/auth";

const REFRESH_KEY = "potencialize_refresh_token";
let inMemoryAccess: string | null = null;
const sessionClearListeners = new Set<() => void>();

interface ClearTokensOptions {
    notify?: boolean;
}

function browserStorage(): Storage | null {
    return typeof globalThis.localStorage === "undefined"
        ? null
        : globalThis.localStorage;
}

export function setAccessToken(token: string | null) {
    inMemoryAccess = token;
}
export function getAccessToken(): string | null {
    return inMemoryAccess;
}

export function setRefreshToken(
    token: string | null,
    mode: AuthMode = "cookie"
) {
    const storage = browserStorage();
    if (!storage) return;

    if (mode !== "bearer" || !token) {
        storage.removeItem(REFRESH_KEY);
        return;
    }

    storage.setItem(REFRESH_KEY, token);
}

export function getRefreshToken(mode: AuthMode = "cookie"): string | null {
    const storage = browserStorage();
    if (!storage) return null;

    if (mode !== "bearer") {
        storage.removeItem(REFRESH_KEY);
        return null;
    }

    return storage.getItem(REFRESH_KEY);
}

export function subscribeToSessionClear(listener: () => void): () => void {
    sessionClearListeners.add(listener);
    return () => sessionClearListeners.delete(listener);
}

export function clearTokens({ notify = true }: ClearTokensOptions = {}) {
    inMemoryAccess = null;
    browserStorage()?.removeItem(REFRESH_KEY);

    if (notify) {
        sessionClearListeners.forEach((listener) => listener());
    }
}
