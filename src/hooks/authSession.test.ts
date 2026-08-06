import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import {
    clearAuthenticatedCache,
    completeRemoteLogout,
    parseAuthUser,
} from "./authSession";

describe("authenticated session state", () => {
    it("clears cached server data at an authentication boundary", () => {
        const queryClient = new QueryClient();
        queryClient.setQueryData(["descriptors"], [{ id: 1 }]);
        queryClient.setMutationDefaults(["assessment", "create"], {
            mutationFn: async () => undefined,
        });

        clearAuthenticatedCache(queryClient);

        expect(queryClient.getQueryData(["descriptors"])).toBeUndefined();
        expect(queryClient.getQueryCache().getAll()).toHaveLength(0);
        expect(queryClient.getMutationCache().getAll()).toHaveLength(0);
    });

    it("accepts every backend role and a positive teacher id", () => {
        expect(parseAuthUser({ role: "coordinator", teacher_id: 9 })).toEqual({
            role: "coordinator",
            teacher_id: 9,
        });
    });

    it("rejects malformed identity responses", () => {
        expect(parseAuthUser({ role: "root", teacher_id: 1 })).toBeNull();
        expect(parseAuthUser({ role: "teacher", teacher_id: 0 })).toBeNull();
        expect(parseAuthUser({ role: "teacher", teacher_id: "7" })).toBeNull();
    });

    it("clears local state only after the remote logout succeeds", async () => {
        const remoteLogout = vi.fn().mockResolvedValue(undefined);
        const clearLocalSession = vi.fn();

        await completeRemoteLogout(remoteLogout, clearLocalSession);

        expect(clearLocalSession).toHaveBeenCalledOnce();
    });

    it("preserves local state when remote logout fails so the user can retry", async () => {
        const failure = new Error("logout unavailable");
        const remoteLogout = vi.fn().mockRejectedValue(failure);
        const clearLocalSession = vi.fn();

        await expect(
            completeRemoteLogout(remoteLogout, clearLocalSession),
        ).rejects.toBe(failure);

        expect(clearLocalSession).not.toHaveBeenCalled();
    });
});
