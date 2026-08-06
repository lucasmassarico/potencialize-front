import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "./http";
import { getRefreshToken } from "../lib/tokenStorage";
import { login, logout, me, refresh } from "./auth";

vi.mock("./http", () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

vi.mock("../lib/tokenStorage", () => ({
    getRefreshToken: vi.fn(),
}));

const testPasswordParts = ["test", "only", "credential"];

const credentials = {
    email: "teacher@example.com",
    password: testPasswordParts.join("-"),
};

describe("auth API contract", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("uses the token-free login endpoint in cookie mode", async () => {
        vi.mocked(api.post).mockResolvedValue({
            data: { role: "teacher", teacher_id: 7 },
        });

        await login(credentials, "cookie");

        expect(api.post).toHaveBeenCalledWith("/auth/login", credentials);
    });

    it("uses the explicit bearer login endpoint when requested", async () => {
        vi.mocked(api.post).mockResolvedValue({
            data: {
                role: "teacher",
                teacher_id: 7,
                access_token: "access",
                refresh_token: "refresh",
            },
        });

        await login(credentials, "bearer");

        expect(api.post).toHaveBeenCalledWith("/auth/login-bearer", credentials);
    });

    it("reads the current cookie session without exposing tokens", async () => {
        vi.mocked(api.get).mockResolvedValue({
            data: { role: "admin", teacher_id: 1 },
        });

        await me();

        expect(api.get).toHaveBeenCalledWith("/auth/me");
    });

    it("refreshes cookie sessions without an Authorization header", async () => {
        vi.mocked(api.post).mockResolvedValue({
            data: { role: "teacher", teacher_id: 7 },
        });

        await refresh("cookie");

        expect(api.post).toHaveBeenCalledWith("/auth/refresh", {});
    });

    it("sends the persisted refresh token only to the bearer refresh endpoint", async () => {
        vi.mocked(getRefreshToken).mockReturnValue("refresh-secret");
        vi.mocked(api.post).mockResolvedValue({ data: { access_token: "next" } });

        await refresh("bearer");

        expect(api.post).toHaveBeenCalledWith(
            "/auth/refresh-bearer",
            {},
            { headers: { Authorization: "Bearer refresh-secret" } }
        );
    });

    it("fails locally when bearer refresh has no token", async () => {
        vi.mocked(getRefreshToken).mockReturnValue(null);

        await expect(refresh("bearer")).rejects.toThrow(
            "Refresh token indisponivel"
        );
        expect(api.post).not.toHaveBeenCalled();
    });

    it("revokes both bearer tokens while cookie mode uses its session endpoint", async () => {
        vi.mocked(getRefreshToken).mockReturnValue("refresh-secret");
        vi.mocked(api.post).mockResolvedValue({ data: { msg: "ok" } });

        await logout("cookie");
        await logout("bearer");

        expect(api.post).toHaveBeenNthCalledWith(1, "/auth/logout", {});
        expect(api.post).toHaveBeenNthCalledWith(
            2,
            "/auth/logout",
            {},
        );
        expect(api.post).toHaveBeenNthCalledWith(
            3,
            "/auth/logout-refresh",
            {},
            { headers: { Authorization: "Bearer refresh-secret" } }
        );
    });

    it("treats an already invalid bearer token as revoked and still revokes the other token", async () => {
        vi.mocked(getRefreshToken).mockReturnValue("refresh-secret");
        vi.mocked(api.post)
            .mockRejectedValueOnce({ response: { status: 401 } })
            .mockResolvedValueOnce({ data: { msg: "refresh revoked" } });

        await expect(logout("bearer")).resolves.toEqual({
            msg: "refresh revoked",
        });

        expect(api.post).toHaveBeenCalledTimes(2);
    });

    it("reports a bearer revocation transport failure after attempting both tokens", async () => {
        const networkError = new Error("network unavailable");
        vi.mocked(getRefreshToken).mockReturnValue("refresh-secret");
        vi.mocked(api.post)
            .mockRejectedValueOnce(networkError)
            .mockResolvedValueOnce({ data: { msg: "refresh revoked" } });

        await expect(logout("bearer")).rejects.toBe(networkError);

        expect(api.post).toHaveBeenCalledTimes(2);
    });
});
