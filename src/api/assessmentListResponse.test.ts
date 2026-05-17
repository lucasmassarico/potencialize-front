import { describe, expect, it } from "vitest";

import { normalizeAssessmentListResponse } from "./assessmentListResponse";
import type { AssessmentOut } from "../types/assessments";

const assessment: AssessmentOut = {
    id: 10,
    title: "Diagnostica",
    date: "2026-05-16",
    weight_mode: "fixed_all",
    class_id: 3,
    subject_kind: "geral",
};

describe("assessment list response", () => {
    it("keeps the documented paginated envelope", () => {
        expect(
            normalizeAssessmentListResponse({
                items: [assessment],
                page: 2,
                per_page: 20,
                total: 21,
                total_pages: 2,
                has_next: false,
                has_prev: true,
            }),
        ).toEqual({
            items: [assessment],
            page: 2,
            per_page: 20,
            total: 21,
            total_pages: 2,
            has_next: false,
            has_prev: true,
        });
    });

    it("wraps the previous array response shape defensively", () => {
        expect(normalizeAssessmentListResponse([assessment])).toEqual({
            items: [assessment],
            page: 1,
            per_page: 1,
            total: 1,
            total_pages: 1,
            has_next: false,
            has_prev: false,
        });
    });

    it("throws when the response is not an assessment list", () => {
        expect(() => normalizeAssessmentListResponse({ page: 1 })).toThrow("Resposta invalida ao carregar avaliacoes.");
    });
});
