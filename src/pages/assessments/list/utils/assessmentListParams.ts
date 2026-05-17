import dayjs from "../../../../lib/dayjs";
import type { Dayjs } from "dayjs";
import type { ListAssessmentsParams, SubjectKind, WeightMode } from "../../../../types/assessments";

export type GroupBy = "class" | "subject" | "month";
export type SortBy = "date_desc" | "date_asc" | "title_asc" | "title_desc";
export type PeriodPreset = "all" | "next_7" | "this_week" | "this_month" | "last_month";

export interface AssessmentListFilters {
    search: string;
    classId?: number;
    subject?: SubjectKind;
    mode?: WeightMode;
    period: PeriodPreset;
}

export const DEFAULT_ASSESSMENT_LIST_FILTERS: AssessmentListFilters = {
    search: "",
    classId: undefined,
    subject: undefined,
    mode: undefined,
    period: "all",
};

const SORT_PARAM: Record<SortBy, string> = {
    date_desc: "-date",
    date_asc: "date",
    title_asc: "title",
    title_desc: "-title",
};

interface BuildAssessmentListParamsInput {
    filters: AssessmentListFilters;
    sortBy: SortBy;
    page: number;
    perPage: number;
    now?: string | Date | Dayjs;
}

interface PeriodRange {
    date_from?: string;
    date_to?: string;
}

export function assessmentPeriodRange(preset: PeriodPreset, now: string | Date | Dayjs = dayjs()): PeriodRange {
    const base = dayjs(now);

    switch (preset) {
        case "next_7":
            return {
                date_from: base.startOf("day").format("YYYY-MM-DD"),
                date_to: base.add(7, "day").endOf("day").format("YYYY-MM-DD"),
            };
        case "this_week":
            return {
                date_from: base.startOf("week").format("YYYY-MM-DD"),
                date_to: base.endOf("week").format("YYYY-MM-DD"),
            };
        case "this_month":
            return {
                date_from: base.startOf("month").format("YYYY-MM-DD"),
                date_to: base.endOf("month").format("YYYY-MM-DD"),
            };
        case "last_month": {
            const previous = base.subtract(1, "month");
            return {
                date_from: previous.startOf("month").format("YYYY-MM-DD"),
                date_to: previous.endOf("month").format("YYYY-MM-DD"),
            };
        }
        case "all":
        default:
            return {};
    }
}

export function buildAssessmentListParams({ filters, sortBy, page, perPage, now }: BuildAssessmentListParamsInput): ListAssessmentsParams {
    const search = filters.search.trim();
    const period = assessmentPeriodRange(filters.period, now);

    return {
        page,
        per_page: perPage,
        ...(search ? { q: search } : {}),
        ...(filters.classId ? { class_id: filters.classId } : {}),
        ...(filters.subject ? { subject_kind: filters.subject } : {}),
        ...(filters.mode ? { weight_mode: filters.mode } : {}),
        ...period,
        sort: SORT_PARAM[sortBy],
    };
}
