import api from "./http";
import type {
    DescriptorCreate,
    DescriptorList,
    DescriptorOut,
    DescriptorScope,
    DescriptorUpdate,
} from "../types/descriptors";

export interface ListDescriptorsParams {
    page?: number;
    per_page?: number;
    sort?: string;
    code?: string;
    title?: string;
    area?: string;
    grade_year?: number;
    q?: string;
    scope?: DescriptorScope;
    by_teacher_id?: number;
}

export type ListAllDescriptorsParams = Omit<
    ListDescriptorsParams,
    "page" | "per_page" | "sort"
>;

const DESCRIPTORS_PAGE_SIZE = 100;
const DESCRIPTOR_PAGE_CONCURRENCY = 4;

const descriptorCollator = new Intl.Collator("pt-BR", {
    numeric: true,
    sensitivity: "base",
});

export async function listDescriptors(params: ListDescriptorsParams = {}) {
    const { data } = await api.get<DescriptorList>("/descriptors/", { params });
    return data;
}

function sortAndDeduplicateDescriptors(
    pages: readonly DescriptorList[],
): DescriptorOut[] {
    const descriptors = pages.flatMap(({ items }) => items);
    const firstItemById = new Map(
        [...descriptors]
            .reverse()
            .map((descriptor) => [descriptor.id, descriptor] as const),
    );

    return [...firstItemById.values()].sort(
        (left, right) =>
            descriptorCollator.compare(left.code, right.code) ||
            descriptorCollator.compare(left.title, right.title) ||
            left.id - right.id,
    );
}

export async function listAllDescriptors(
    params: ListAllDescriptorsParams = {},
): Promise<DescriptorOut[]> {
    const requestParams = {
        ...params,
        sort: "code",
        per_page: DESCRIPTORS_PAGE_SIZE,
    };
    const firstPage = await listDescriptors({ ...requestParams, page: 1 });
    const totalPages = Number.isSafeInteger(firstPage.total_pages)
        ? Math.max(1, firstPage.total_pages)
        : 1;
    const pages: DescriptorList[] = [firstPage];

    for (
        let firstPageInBatch = 2;
        firstPageInBatch <= totalPages;
        firstPageInBatch += DESCRIPTOR_PAGE_CONCURRENCY
    ) {
        const pageNumbers = Array.from(
            {
                length: Math.min(
                    DESCRIPTOR_PAGE_CONCURRENCY,
                    totalPages - firstPageInBatch + 1,
                ),
            },
            (_, index) => firstPageInBatch + index,
        );
        const nextPages = await Promise.all(
            pageNumbers.map((page) =>
                listDescriptors({ ...requestParams, page }),
            ),
        );
        pages.push(...nextPages);
    }

    return sortAndDeduplicateDescriptors(pages);
}

export async function getDescriptor(id: number) {
    const { data } = await api.get<DescriptorOut>(`/descriptors/${id}`);
    return data;
}

export async function createDescriptor(payload: DescriptorCreate) {
    const { data } = await api.post<DescriptorOut>("/descriptors/", payload);
    return data;
}

export async function updateDescriptor(id: number, payload: DescriptorUpdate) {
    const { data } = await api.put<DescriptorOut>(`/descriptors/${id}`, payload);
    return data;
}

export async function deleteDescriptor(id: number) {
    await api.delete(`/descriptors/${id}`);
}
