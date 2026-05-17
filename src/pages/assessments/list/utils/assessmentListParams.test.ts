import { describe, expect, it } from "vitest";

import { buildAssessmentListParams, type AssessmentListFilters, type SortBy } from "./assessmentListParams";

const emptyFilters: AssessmentListFilters = {
    search: "",
    classId: undefined,
    subject: undefined,
    mode: undefined,
    period: "all",
};

describe("assessment list params", () => {
    it("maps list filters to the documented assessment API params", () => {
        expect(
            buildAssessmentListParams({
                filters: {
                    search: "  diagnostica  ",
                    classId: 7,
                    subject: "matematica",
                    mode: "by_skill",
                    period: "this_month",
                },
                sortBy: "date_desc",
                page: 2,
                perPage: 25,
                now: "2026-05-16",
            }),
        ).toEqual({
            page: 2,
            per_page: 25,
            q: "diagnostica",
            class_id: 7,
            subject_kind: "matematica",
            weight_mode: "by_skill",
            date_from: "2026-05-01",
            date_to: "2026-05-31",
            sort: "-date",
        });
    });

    it("omits empty filters and all-period dates", () => {
        expect(
            buildAssessmentListParams({
                filters: { ...emptyFilters, search: "   " },
                sortBy: "title_asc",
                page: 1,
                perPage: 50,
                now: "2026-05-16",
            }),
        ).toEqual({
            page: 1,
            per_page: 50,
            sort: "title",
        });
    });

    it.each<[SortBy, string]>([
        ["date_desc", "-date"],
        ["date_asc", "date"],
        ["title_asc", "title"],
        ["title_desc", "-title"],
    ])("maps %s to API sort %s", (sortBy, expectedSort) => {
        expect(
            buildAssessmentListParams({
                filters: emptyFilters,
                sortBy,
                page: 1,
                perPage: 50,
                now: "2026-05-16",
            }).sort,
        ).toBe(expectedSort);
    });
});
