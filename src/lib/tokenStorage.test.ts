import { beforeEach, describe, expect, it, vi } from "vitest";

import {
    clearTokens,
    getAccessToken,
    getRefreshToken,
    setAccessToken,
    setRefreshToken,
    subscribeToSessionClear,
} from "./tokenStorage";

function createStorage() {
    const values = new Map<string, string>();

    return {
        getItem: vi.fn((key: string) => values.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
            values.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
            values.delete(key);
        }),
        clear: vi.fn(() => values.clear()),
        key: vi.fn((index: number) => [...values.keys()][index] ?? null),
        get length() {
            return values.size;
        },
    } satisfies Storage;
}

describe("token storage", () => {
    beforeEach(() => {
        vi.stubGlobal("localStorage", createStorage());
        clearTokens({ notify: false });
    });

    it("never persists a refresh token in cookie mode", () => {
        localStorage.setItem("potencialize_refresh_token", "legacy-token");

        setRefreshToken("secret-refresh", "cookie");

        expect(localStorage.getItem("potencialize_refresh_token")).toBeNull();
        expect(getRefreshToken("cookie")).toBeNull();
    });

    it("persists a refresh token only for explicit bearer mode", () => {
        setRefreshToken("secret-refresh", "bearer");

        expect(getRefreshToken("bearer")).toBe("secret-refresh");
    });

    it("keeps access tokens in memory and clears the complete session", () => {
        setAccessToken("access-token");
        setRefreshToken("refresh-token", "bearer");

        clearTokens({ notify: false });

        expect(getAccessToken()).toBeNull();
        expect(getRefreshToken("bearer")).toBeNull();
    });

    it("notifies subscribers when an interceptor invalidates the session", () => {
        const listener = vi.fn();
        const unsubscribe = subscribeToSessionClear(listener);

        clearTokens();
        unsubscribe();
        clearTokens();

        expect(listener).toHaveBeenCalledTimes(1);
    });
});
