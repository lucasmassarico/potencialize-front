import type { AssessmentList, AssessmentOut } from "../types/assessments";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function toNumber(value: unknown, fallback: number): number {
    return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === "boolean" ? value : fallback;
}

export function normalizeAssessmentListResponse(response: unknown): AssessmentList {
    if (Array.isArray(response)) {
        const items = response as AssessmentOut[];
        return {
            items,
            page: 1,
            per_page: items.length,
            total: items.length,
            total_pages: 1,
            has_next: false,
            has_prev: false,
        };
    }

    if (isRecord(response) && Array.isArray(response.items)) {
        const items = response.items as AssessmentOut[];
        const total = toNumber(response.total, items.length);
        const perPage = toNumber(response.per_page, items.length);
        const totalPages = toNumber(response.total_pages, 1);

        return {
            items,
            page: toNumber(response.page, 1),
            per_page: perPage,
            total,
            total_pages: totalPages,
            has_next: toBoolean(response.has_next, false),
            has_prev: toBoolean(response.has_prev, false),
        };
    }

    throw new Error("Resposta invalida ao carregar avaliacoes.");
}
