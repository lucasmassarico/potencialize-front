import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DescriptorList, DescriptorOut } from "../types/descriptors";

const { deleteMock, getMock, postMock, putMock } = vi.hoisted(() => ({
    deleteMock: vi.fn(),
    getMock: vi.fn(),
    postMock: vi.fn(),
    putMock: vi.fn(),
}));

vi.mock("./http", () => ({
    default: {
        delete: deleteMock,
        get: getMock,
        post: postMock,
        put: putMock,
    },
}));

import {
    createDescriptor,
    deleteDescriptor,
    getDescriptor,
    listAllDescriptors,
    updateDescriptor,
} from "./descriptors";

function descriptor(id: number, code: string, title = `Descritor ${id}`): DescriptorOut {
    return { id, code, title };
}

function page(
    pageNumber: number,
    totalPages: number,
    items: DescriptorOut[],
): DescriptorList {
    return {
        items,
        page: pageNumber,
        per_page: 100,
        total: items.length,
        total_pages: totalPages,
        has_next: pageNumber < totalPages,
        has_prev: pageNumber > 1,
    };
}

describe("listAllDescriptors", () => {
    beforeEach(() => {
        deleteMock.mockReset();
        getMock.mockReset();
        postMock.mockReset();
        putMock.mockReset();
    });

    it("requests every API page with the supported page size", async () => {
        const pages = new Map([
            [1, page(1, 3, [descriptor(1, "D1")])],
            [2, page(2, 3, [descriptor(2, "D2")])],
            [3, page(3, 3, [descriptor(3, "D3")])],
        ]);
        getMock.mockImplementation(
            (_url: string, config: { params: { page: number } }) =>
                Promise.resolve({ data: pages.get(config.params.page) }),
        );

        await expect(listAllDescriptors({ scope: "visible" })).resolves.toHaveLength(3);

        expect(getMock).toHaveBeenCalledTimes(3);
        expect(getMock.mock.calls.map(([, config]) => config.params)).toEqual([
            { page: 1, per_page: 100, sort: "code", scope: "visible" },
            { page: 2, per_page: 100, sort: "code", scope: "visible" },
            { page: 3, per_page: 100, sort: "code", scope: "visible" },
        ]);
    });

    it("deduplicates overlapping pages by id and returns deterministic code order", async () => {
        const firstVersion = descriptor(20, "D10", "Versão original");
        const pages = new Map([
            [1, page(1, 2, [firstVersion, descriptor(10, "D2")])],
            [2, page(2, 2, [descriptor(20, "D10", "Duplicado"), descriptor(30, "D1")])],
        ]);
        getMock.mockImplementation(
            (_url: string, config: { params: { page: number } }) =>
                Promise.resolve({ data: pages.get(config.params.page) }),
        );

        const result = await listAllDescriptors();

        expect(result.map(({ id, code }) => ({ id, code }))).toEqual([
            { id: 30, code: "D1" },
            { id: 10, code: "D2" },
            { id: 20, code: "D10" },
        ]);
        expect(result.find(({ id }) => id === 20)).toBe(firstVersion);
    });

    it("keeps descriptor detail mutations on their documented endpoints", async () => {
        const existing = descriptor(9, "D9");
        getMock.mockResolvedValueOnce({ data: existing });
        postMock.mockResolvedValueOnce({ data: existing });
        putMock.mockResolvedValueOnce({ data: existing });
        deleteMock.mockResolvedValueOnce({});

        await expect(getDescriptor(9)).resolves.toBe(existing);
        await expect(
            createDescriptor({ code: "D9", title: "Descritor 9" }),
        ).resolves.toBe(existing);
        await expect(
            updateDescriptor(9, { code: "D9", title: "Descritor 9" }),
        ).resolves.toBe(existing);
        await expect(deleteDescriptor(9)).resolves.toBeUndefined();

        expect(getMock).toHaveBeenCalledWith("/descriptors/9");
        expect(postMock).toHaveBeenCalledWith("/descriptors/", {
            code: "D9",
            title: "Descritor 9",
        });
        expect(putMock).toHaveBeenCalledWith("/descriptors/9", {
            code: "D9",
            title: "Descritor 9",
        });
        expect(deleteMock).toHaveBeenCalledWith("/descriptors/9");
    });
});
