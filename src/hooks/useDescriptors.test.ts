import { beforeEach, describe, expect, it, vi } from "vitest";

const { listAllDescriptorsMock, useAuthMock, useQueryMock } = vi.hoisted(() => ({
    listAllDescriptorsMock: vi.fn(),
    useAuthMock: vi.fn(),
    useQueryMock: vi.fn(),
}));

vi.mock("../api/descriptors", () => ({
    listAllDescriptors: listAllDescriptorsMock,
}));

vi.mock("./useAuth", () => ({
    useAuth: useAuthMock,
}));

vi.mock("@tanstack/react-query", () => ({
    useQuery: useQueryMock,
}));

import {
    getDescriptorCatalogQueryKey,
    getDescriptorCatalogScope,
    useAllDescriptors,
} from "./useDescriptors";

describe("descriptor catalog cache identity", () => {
    beforeEach(() => {
        listAllDescriptorsMock.mockReset();
        useAuthMock.mockReset();
        useQueryMock.mockReset();
    });

    it("uses the complete admin scope", () => {
        expect(getDescriptorCatalogScope({ role: "admin" })).toBe("all");
    });

    it("uses only descriptors visible to a teacher", () => {
        expect(getDescriptorCatalogScope({ role: "teacher", teacher_id: 7 })).toBe("visible");
    });

    it("isolates cached catalogs by role, teacher and scope", () => {
        const teacherSeven = getDescriptorCatalogQueryKey({
            role: "teacher",
            teacher_id: 7,
        });
        const teacherEight = getDescriptorCatalogQueryKey({
            role: "teacher",
            teacher_id: 8,
        });
        const admin = getDescriptorCatalogQueryKey({ role: "admin" });

        expect(teacherSeven).not.toEqual(teacherEight);
        expect(teacherSeven).not.toEqual(admin);
        expect(teacherSeven).toEqual([
            "descriptors",
            "all",
            { role: "teacher", teacherId: 7, scope: "visible" },
        ]);
    });

    it("configures the query for the authenticated scope and exposes its states", async () => {
        const refetch = vi.fn();
        const queryResult = { isError: true, refetch };
        useAuthMock.mockReturnValue({
            loading: false,
            user: { role: "teacher", teacher_id: 23 },
        });
        useQueryMock.mockReturnValue(queryResult);
        listAllDescriptorsMock.mockResolvedValue([]);

        expect(useAllDescriptors()).toBe(queryResult);

        const config = useQueryMock.mock.calls[0][0] as {
            enabled: boolean;
            queryFn: () => Promise<unknown>;
            queryKey: readonly unknown[];
            staleTime: number;
        };
        expect(config.enabled).toBe(true);
        expect(config.queryKey).toEqual([
            "descriptors",
            "all",
            { role: "teacher", teacherId: 23, scope: "visible" },
        ]);
        expect(config.staleTime).toBe(5 * 60_000);

        await config.queryFn();
        expect(listAllDescriptorsMock).toHaveBeenCalledWith({ scope: "visible" });
    });

    it("does not request a catalog before authentication is known", () => {
        useAuthMock.mockReturnValue({ loading: true, user: null });
        useQueryMock.mockReturnValue({});

        useAllDescriptors();

        expect(useQueryMock.mock.calls[0][0]).toMatchObject({ enabled: false });
    });
});
