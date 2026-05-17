import * as React from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import dayjs from "../../../../lib/dayjs";
import { listAssessments } from "../../../../api/assessments";
import { listClasses } from "../../../../api/classes";
import type { AssessmentOut, SubjectKind, WeightMode } from "../../../../types/assessments";
import type { ClassOut } from "../../../../types/classes";
import {
    buildAssessmentListParams,
    DEFAULT_ASSESSMENT_LIST_FILTERS,
    type AssessmentListFilters,
    type GroupBy,
    type PeriodPreset,
    type SortBy,
} from "../utils/assessmentListParams";

export type Filters = AssessmentListFilters;
export type { GroupBy, PeriodPreset, SortBy } from "../utils/assessmentListParams";

const STORAGE_KEY = "potencialize_assessments_state_v1";
const EMPTY_ASSESSMENTS: AssessmentOut[] = [];
const EMPTY_CLASSES: ClassOut[] = [];
const ASSESSMENTS_PER_PAGE = 50;

interface PersistedState {
    filters: Filters;
    groupBy: GroupBy;
    sortBy: SortBy;
}

type StoredFilters = Partial<Filters> & {
    classIds?: number[];
    subjects?: SubjectKind[];
    modes?: WeightMode[];
};

interface StoredState {
    filters?: StoredFilters;
    groupBy?: unknown;
    sortBy?: unknown;
}

const DEFAULT_STATE: PersistedState = {
    filters: DEFAULT_ASSESSMENT_LIST_FILTERS,
    groupBy: "class",
    sortBy: "date_desc",
};

const GROUP_BY_VALUES: GroupBy[] = ["class", "subject", "month"];
const SORT_BY_VALUES: SortBy[] = ["date_desc", "date_asc", "title_asc", "title_desc"];
const PERIOD_VALUES: PeriodPreset[] = ["all", "next_7", "this_week", "this_month", "last_month"];

function firstNumber(single: unknown, many: unknown): number | undefined {
    if (typeof single === "number" && Number.isFinite(single)) return single;
    if (Array.isArray(many) && typeof many[0] === "number" && Number.isFinite(many[0])) return many[0];
    return undefined;
}

function firstString<T extends string>(single: unknown, many: unknown): T | undefined {
    if (typeof single === "string") return single as T;
    if (Array.isArray(many) && typeof many[0] === "string") return many[0] as T;
    return undefined;
}

function isOneOf<T extends string>(value: unknown, options: T[]): value is T {
    return typeof value === "string" && options.includes(value as T);
}

function normalizeFilters(filters?: StoredFilters): Filters {
    return {
        search: typeof filters?.search === "string" ? filters.search : DEFAULT_STATE.filters.search,
        classId: firstNumber(filters?.classId, filters?.classIds),
        subject: firstString<SubjectKind>(filters?.subject, filters?.subjects),
        mode: firstString<WeightMode>(filters?.mode, filters?.modes),
        period: isOneOf(filters?.period, PERIOD_VALUES) ? filters.period : DEFAULT_STATE.filters.period,
    };
}

function loadPersisted(): PersistedState {
    if (typeof window === "undefined") return DEFAULT_STATE;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_STATE;
        const parsed = JSON.parse(raw) as StoredState;
        return {
            filters: normalizeFilters(parsed.filters),
            groupBy: isOneOf(parsed.groupBy, GROUP_BY_VALUES) ? parsed.groupBy : DEFAULT_STATE.groupBy,
            sortBy: isOneOf(parsed.sortBy, SORT_BY_VALUES) ? parsed.sortBy : DEFAULT_STATE.sortBy,
        };
    } catch {
        return DEFAULT_STATE;
    }
}

function persist(state: PersistedState) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // localStorage cheia/bloqueada; pode ser ignorado com seguranca.
    }
}

const MONTH_LABEL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export interface AssessmentGroup {
    key: string;
    label: string;
    subLabel?: string;
    items: AssessmentOut[];
}

export interface AssessmentsListState {
    assessments: AssessmentOut[];
    classes: ClassOut[];
    classById: Map<number, ClassOut>;
    isLoading: boolean;
    isError: boolean;
    refetch: () => void;
    filters: Filters;
    setFilters: (next: Partial<Filters>) => void;
    clearFilters: () => void;
    hasActiveFilters: boolean;
    groupBy: GroupBy;
    setGroupBy: (g: GroupBy) => void;
    sortBy: SortBy;
    setSortBy: (s: SortBy) => void;
    kpis: { total: number; next7: number; thisMonth: number; subjects: number };
    filtered: AssessmentOut[];
    groups: AssessmentGroup[];
    page: number;
    setPage: (page: number) => void;
    total: number;
    totalPages: number;
}

const SUBJECT_LABEL_MAP: Record<SubjectKind, string> = {
    portugues: "Português",
    matematica: "Matemática",
    ciencias: "Ciências",
    historia: "História",
    geografia: "Geografia",
    ingles: "Inglês",
    artes: "Artes",
    educacao_fisica: "Educação Física",
    tecnologia: "Tecnologia",
    redacao: "Redação",
    geral: "Geral",
    outro: "Outro",
};

export function useAssessmentsListState(): AssessmentsListState {
    const persisted = React.useMemo(loadPersisted, []);

    const [filters, setFiltersState] = React.useState<Filters>(persisted.filters);
    const [groupBy, setGroupBy] = React.useState<GroupBy>(persisted.groupBy);
    const [sortBy, setSortByState] = React.useState<SortBy>(persisted.sortBy);
    const [page, setPageState] = React.useState(1);

    React.useEffect(() => {
        persist({ filters, groupBy, sortBy });
    }, [filters, groupBy, sortBy]);

    const setPage = React.useCallback((nextPage: number) => {
        setPageState(nextPage);
    }, []);

    const setFilters = React.useCallback((next: Partial<Filters>) => {
        setPageState(1);
        setFiltersState((prev) => ({ ...prev, ...next }));
    }, []);

    const clearFilters = React.useCallback(() => {
        setPageState(1);
        setFiltersState(DEFAULT_STATE.filters);
    }, []);

    const setSortBy = React.useCallback((next: SortBy) => {
        setPageState(1);
        setSortByState(next);
    }, []);

    const assessmentParams = React.useMemo(
        () =>
            buildAssessmentListParams({
                filters,
                sortBy,
                page,
                perPage: ASSESSMENTS_PER_PAGE,
            }),
        [filters, page, sortBy],
    );

    const assessmentsQuery = useQuery({
        queryKey: ["assessments", "list", assessmentParams],
        queryFn: () =>
            listAssessments({
                params: assessmentParams,
            }),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });

    const classesQuery = useQuery({
        queryKey: ["classes", "list-for-assessments"],
        queryFn: () => listClasses("id,name,year"),
        staleTime: 60_000,
    });

    const assessments = assessmentsQuery.data?.items ?? EMPTY_ASSESSMENTS;
    const classes = classesQuery.data ?? EMPTY_CLASSES;
    const total = assessmentsQuery.data?.total ?? 0;
    const totalPages = Math.max(1, assessmentsQuery.data?.total_pages ?? 1);

    const classById = React.useMemo(() => {
        const map = new Map<number, ClassOut>();
        for (const c of classes) map.set(c.id, c);
        return map;
    }, [classes]);

    const groups = React.useMemo<AssessmentGroup[]>(() => {
        const buckets = new Map<string, { label: string; subLabel?: string; items: AssessmentOut[]; sortKey: string }>();

        for (const a of assessments) {
            let key: string;
            let label: string;
            let subLabel: string | undefined;
            let sortKey: string;

            if (groupBy === "class") {
                const klass = classById.get(a.class_id);
                key = `class:${a.class_id}`;
                label = klass?.name ?? `Turma #${a.class_id}`;
                subLabel = klass?.year ? String(klass.year) : undefined;
                sortKey = label.toLowerCase();
            } else if (groupBy === "subject") {
                const sk = a.subject_kind ?? "outro";
                key = `subject:${sk}`;
                label = sk === "outro" ? (a.subject_other || "Outro") : (SUBJECT_LABEL_MAP[sk] ?? String(sk));
                sortKey = label.toLowerCase();
            } else {
                const d = dayjs(a.date);
                const ym = d.isValid() ? d.format("YYYY-MM") : "0000-00";
                key = `month:${ym}`;
                label = d.isValid() ? `${MONTH_LABEL[d.month()]} ${d.year()}` : "Sem data";
                sortKey = ym;
            }

            const bucket = buckets.get(key);
            if (bucket) {
                bucket.items.push(a);
            } else {
                buckets.set(key, { label, subLabel, items: [a], sortKey });
            }
        }

        const result = Array.from(buckets.entries()).map(([key, b]) => ({
            key,
            label: b.label,
            subLabel: b.subLabel,
            items: b.items,
            sortKey: b.sortKey,
        }));

        if (groupBy === "month") {
            result.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
        } else {
            result.sort((a, b) => a.sortKey.localeCompare(b.sortKey, "pt-BR"));
        }

        return result.map(({ key, label, subLabel, items }) => ({
            key,
            label,
            subLabel,
            items,
        }));
    }, [assessments, groupBy, classById]);

    const kpis = React.useMemo(() => {
        const now = dayjs();
        const in7 = now.add(7, "day").endOf("day");
        const monthStart = now.startOf("month");
        const monthEnd = now.endOf("month");

        let next7 = 0;
        let thisMonth = 0;
        const subjectSet = new Set<string>();

        for (const a of assessments) {
            const d = dayjs(a.date);
            if (d.isValid()) {
                if (!d.isBefore(now.startOf("day")) && !d.isAfter(in7)) next7 += 1;
                if (!d.isBefore(monthStart) && !d.isAfter(monthEnd)) thisMonth += 1;
            }
            if (a.subject_kind) subjectSet.add(a.subject_kind === "outro" ? `outro:${a.subject_other ?? ""}` : a.subject_kind);
        }

        return { total, next7, thisMonth, subjects: subjectSet.size };
    }, [assessments, total]);

    const hasActiveFilters = !!filters.search || !!filters.classId || !!filters.subject || !!filters.mode || filters.period !== "all";

    const refetch = React.useCallback(() => {
        assessmentsQuery.refetch();
        classesQuery.refetch();
    }, [assessmentsQuery, classesQuery]);

    return {
        assessments,
        classes,
        classById,
        isLoading: assessmentsQuery.isLoading || classesQuery.isLoading,
        isError: assessmentsQuery.isError || classesQuery.isError,
        refetch,
        filters,
        setFilters,
        clearFilters,
        hasActiveFilters,
        groupBy,
        setGroupBy,
        sortBy,
        setSortBy,
        kpis,
        filtered: assessments,
        groups,
        page,
        setPage,
        total,
        totalPages,
    };
}
