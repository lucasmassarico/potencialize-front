import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

type RequestHandler = (
    config: InternalAxiosRequestConfig
) => InternalAxiosRequestConfig;
type ResponseErrorHandler = (error: AxiosError) => Promise<unknown>;
type RetryableTestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

const axiosHarness = vi.hoisted(() => {
    let requestHandler: ((config: unknown) => unknown) | undefined;
    let responseErrorHandler:
        | ((error: unknown) => Promise<unknown>)
        | undefined;
    let currentInstance: ReturnType<typeof vi.fn> | undefined;

    const post = vi.fn();
    const create = vi.fn(() => {
        const instance = vi.fn();
        Object.assign(instance, {
            interceptors: {
                request: {
                    use: vi.fn(
                        (onFulfilled: (config: unknown) => unknown) => {
                            requestHandler = onFulfilled;
                        }
                    ),
                },
                response: {
                    use: vi.fn(
                        (
                            _onFulfilled: (response: unknown) => unknown,
                            onRejected: (error: unknown) => Promise<unknown>
                        ) => {
                            responseErrorHandler = onRejected;
                        }
                    ),
                },
            },
        });
        currentInstance = instance;
        return instance;
    });

    return {
        create,
        post,
        currentInstance: () => currentInstance,
        requestHandler: () => requestHandler,
        responseErrorHandler: () => responseErrorHandler,
        reset() {
            requestHandler = undefined;
            responseErrorHandler = undefined;
            currentInstance = undefined;
        },
    };
});

const csrfMocks = vi.hoisted(() => ({
    getCsrfToken: vi.fn(),
}));

const tokenStorageMocks = vi.hoisted(() => ({
    clearTokens: vi.fn(),
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    setAccessToken: vi.fn(),
}));

vi.mock("axios", () => ({
    default: {
        create: axiosHarness.create,
        post: axiosHarness.post,
    },
}));

vi.mock("../lib/csrf", () => csrfMocks);
vi.mock("../lib/tokenStorage", () => tokenStorageMocks);

function requestConfig(
    url: string,
    method = "post"
): RetryableTestConfig {
    return { url, method, headers: {} } as RetryableTestConfig;
}

function unauthorized(config: InternalAxiosRequestConfig): AxiosError {
    return {
        config,
        response: { status: 401 },
    } as AxiosError;
}

async function loadHttp(authMode: "cookie" | "bearer") {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/api/v1");
    vi.stubEnv("VITE_AUTH_MODE", authMode);
    vi.resetModules();

    await import("./http");

    const instance = axiosHarness.currentInstance();
    const requestHandler = axiosHarness.requestHandler();
    const responseErrorHandler = axiosHarness.responseErrorHandler();
    if (!instance || !requestHandler || !responseErrorHandler) {
        throw new Error("Os interceptors HTTP nao foram registrados");
    }

    return {
        instance,
        requestHandler: requestHandler as RequestHandler,
        responseErrorHandler: responseErrorHandler as ResponseErrorHandler,
    };
}

function loadCookieHttp() {
    return loadHttp("cookie");
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    axiosHarness.reset();
    csrfMocks.getCsrfToken.mockImplementation((type) =>
        type === "refresh" ? "refresh-csrf" : "access-csrf"
    );
});

describe("HTTP interceptors in cookie mode", () => {
    it("uses access CSRF for writes and refresh CSRF for refresh-cookie endpoints", async () => {
        const { requestHandler } = await loadCookieHttp();
        const write = requestConfig("/questions/bulk/11");
        const refresh = requestConfig("/auth/refresh");
        const refreshLogout = requestConfig("/auth/logout-refresh");

        requestHandler(write);
        requestHandler(refresh);
        requestHandler(refreshLogout);

        expect(write.headers["X-CSRF-TOKEN"]).toBe("access-csrf");
        expect(refresh.headers["X-CSRF-TOKEN"]).toBe("refresh-csrf");
        expect(refreshLogout.headers["X-CSRF-TOKEN"]).toBe("refresh-csrf");
        expect(csrfMocks.getCsrfToken.mock.calls).toEqual([
            ["access"],
            ["refresh"],
            ["refresh"],
        ]);
    });

    it("does not add CSRF to safe methods", async () => {
        const { requestHandler } = await loadCookieHttp();
        const read = requestConfig("/questions", "get");

        requestHandler(read);

        expect(read.headers["X-CSRF-TOKEN"]).toBeUndefined();
        expect(csrfMocks.getCsrfToken).not.toHaveBeenCalled();
    });

    it("renews a cookie session and retries the request without Authorization", async () => {
        const { instance, responseErrorHandler } = await loadCookieHttp();
        axiosHarness.post.mockResolvedValue({ data: {} });
        instance.mockResolvedValue({ data: { ok: true } });
        const original = requestConfig("/questions/bulk/11");

        await responseErrorHandler(unauthorized(original));

        expect(axiosHarness.post).toHaveBeenCalledWith(
            "https://api.example.test/api/v1/auth/refresh",
            {},
            {
                withCredentials: true,
                headers: { "X-CSRF-TOKEN": "refresh-csrf" },
            }
        );
        expect(instance).toHaveBeenCalledWith(original);
        expect(original.headers["Authorization"]).toBeUndefined();
        expect(original._retry).toBe(true);
        expect(tokenStorageMocks.setAccessToken).not.toHaveBeenCalled();
    });

    it.each([
        "/auth/login",
        "/auth/login-bearer",
        "/auth/refresh",
        "/auth/refresh-bearer",
        "/auth/logout",
        "/auth/logout-refresh",
    ])("does not refresh after a 401 from %s", async (url) => {
        const { instance, responseErrorHandler } = await loadCookieHttp();
        const error = unauthorized(requestConfig(url));

        await expect(responseErrorHandler(error)).rejects.toBe(error);

        expect(axiosHarness.post).not.toHaveBeenCalled();
        expect(instance).not.toHaveBeenCalled();
        expect(tokenStorageMocks.clearTokens).not.toHaveBeenCalled();
    });

    it("clears the session and rejects every queued request when refresh fails", async () => {
        const { instance, responseErrorHandler } = await loadCookieHttp();
        const refreshFailure = new Error("refresh rejected");
        let rejectRefresh: ((reason: unknown) => void) | undefined;
        axiosHarness.post.mockReturnValueOnce(
            new Promise((_resolve, reject) => {
                rejectRefresh = reject;
            })
        );

        const first = responseErrorHandler(
            unauthorized(requestConfig("/questions/first"))
        );
        const queued = responseErrorHandler(
            unauthorized(requestConfig("/questions/queued"))
        );
        const completion = Promise.allSettled([first, queued]);
        rejectRefresh?.(refreshFailure);

        const results = await completion;

        expect(results).toEqual([
            { status: "rejected", reason: refreshFailure },
            { status: "rejected", reason: refreshFailure },
        ]);
        expect(tokenStorageMocks.clearTokens).toHaveBeenCalledOnce();
        expect(instance).not.toHaveBeenCalled();

        axiosHarness.post.mockResolvedValueOnce({ data: {} });
        const afterFailure = requestConfig("/questions/after-failure");
        await responseErrorHandler(unauthorized(afterFailure));

        expect(axiosHarness.post).toHaveBeenCalledTimes(2);
        expect(instance).toHaveBeenCalledOnce();
        expect(instance).toHaveBeenCalledWith(afterFailure);
    });
});

describe("HTTP interceptors in bearer mode", () => {
    it("adds the access token without overriding an explicit Authorization header", async () => {
        tokenStorageMocks.getAccessToken.mockReturnValue("stored-access");
        const { requestHandler } = await loadHttp("bearer");
        const automatic = requestConfig("/questions", "get");
        const explicit = requestConfig("/external", "get");
        explicit.headers["Authorization"] = "Bearer explicit";

        requestHandler(automatic);
        requestHandler(explicit);

        expect(automatic.headers["Authorization"]).toBe(
            "Bearer stored-access"
        );
        expect(explicit.headers["Authorization"]).toBe("Bearer explicit");
        expect(csrfMocks.getCsrfToken).not.toHaveBeenCalled();
    });

    it("uses the explicit bearer refresh endpoint, stores access and retries queued requests", async () => {
        tokenStorageMocks.getRefreshToken.mockReturnValue("stored-refresh");
        const { instance, responseErrorHandler } = await loadHttp("bearer");
        let resolveRefresh:
            | ((value: { data: { access_token: string } }) => void)
            | undefined;
        axiosHarness.post.mockReturnValueOnce(
            new Promise((resolve) => {
                resolveRefresh = resolve;
            })
        );
        const firstConfig = requestConfig("/questions/first");
        const queuedConfig = requestConfig("/questions/queued");

        const first = responseErrorHandler(unauthorized(firstConfig));
        const queued = responseErrorHandler(unauthorized(queuedConfig));
        resolveRefresh?.({ data: { access_token: "next-access" } });
        await Promise.all([first, queued]);

        expect(tokenStorageMocks.getRefreshToken).toHaveBeenCalledWith(
            "bearer"
        );
        expect(axiosHarness.post).toHaveBeenCalledWith(
            "https://api.example.test/api/v1/auth/refresh-bearer",
            {},
            { headers: { Authorization: "Bearer stored-refresh" } }
        );
        expect(tokenStorageMocks.setAccessToken).toHaveBeenCalledWith(
            "next-access"
        );
        expect(firstConfig.headers["Authorization"]).toBe(
            "Bearer next-access"
        );
        expect(queuedConfig.headers["Authorization"]).toBe(
            "Bearer next-access"
        );
        expect(instance).toHaveBeenCalledTimes(2);
    });

    it.each([
        {
            name: "missing refresh token",
            refreshToken: null,
            response: undefined,
            message: "Refresh token indisponivel",
        },
        {
            name: "invalid refresh response",
            refreshToken: "stored-refresh",
            response: { data: {} },
            message: "Resposta de refresh invalida",
        },
    ])(
        "clears the session after $name",
        async ({ refreshToken, response, message }) => {
            tokenStorageMocks.getRefreshToken.mockReturnValue(refreshToken);
            if (response) {
                axiosHarness.post.mockResolvedValue(response);
            }
            const { instance, responseErrorHandler } = await loadHttp("bearer");

            await expect(
                responseErrorHandler(
                    unauthorized(requestConfig("/questions/protected"))
                )
            ).rejects.toThrow(message);

            expect(tokenStorageMocks.clearTokens).toHaveBeenCalledOnce();
            expect(tokenStorageMocks.setAccessToken).not.toHaveBeenCalled();
            expect(instance).not.toHaveBeenCalled();
            if (refreshToken === null) {
                expect(axiosHarness.post).not.toHaveBeenCalled();
            }
        }
    );
});
