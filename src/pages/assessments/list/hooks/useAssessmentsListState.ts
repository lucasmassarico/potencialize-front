import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import dayjs from "../../../../lib/dayjs";
import { listAssessments } from "../../../../api/assessments";
import { listClasses } from "../../../../api/classes";
import type { AssessmentOut, SubjectKind, WeightMode } from "../../../../types/assessments";
import type { ClassOut } from "../../../../types/classes";

const STORAGE_KEY = "potencialize_assessments_state_v1";
const EMPTY_ASSESSMENTS: AssessmentOut[] = [];
const EMPTY_CLASSES: ClassOut[] = [];

export type GroupBy = "class" | "subject" | "month";
export type SortBy = "date_desc" | "date_asc" | "title_asc" | "title_desc";
export type PeriodPreset = "all" | "next_7" | "this_week" | "this_month" | "last_month";

export interface Filters {
    search: string;
    classIds: number[];
    subjects: SubjectKind[];
    modes: WeightMode[];
    period: PeriodPreset;
}

interface PersistedState {
    filters: Filters;
    groupBy: GroupBy;
    sortBy: SortBy;
}

const DEFAULT_STATE: PersistedState = {
    filters: { search: "", classIds: [], subjects: [], modes: [], period: "all" },
    groupBy: "class",
    sortBy: "date_desc",
};

function loadPersisted(): PersistedState {
    if (typeof window === "undefined") return DEFAULT_STATE;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_STATE;
        const parsed = JSON.parse(raw) as Partial<PersistedState>;
        return {
            filters: { ...DEFAULT_STATE.filters, ...(parsed.filters ?? {}) },
            groupBy: parsed.groupBy ?? DEFAULT_STATE.groupBy,
            sortBy: parsed.sortBy ?? DEFAULT_STATE.sortBy,
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
        // localStorage cheia/bloqueada — silenciar
    }
}

function periodRange(preset: PeriodPreset): { start?: dayjs.Dayjs; end?: dayjs.Dayjs } {
    const now = dayjs();
    switch (preset) {
        case "next_7":
            return { start: now.startOf("day"), end: now.add(7, "day").endOf("day") };
        case "this_week":
            return { start: now.startOf("week"), end: now.endOf("week") };
        case "this_month":
            return { start: now.startOf("month"), end: now.endOf("month") };
        case "last_month":
            return { start: now.subtract(1, "month").startOf("month"), end: now.subtract(1, "month").endOf("month") };
        case "all":
        default:
            return {};
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
    perClassCount: Map<number, number>;
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
    const [sortBy, setSortBy] = React.useState<SortBy>(persisted.sortBy);

    React.useEffect(() => {
        persist({ filters, groupBy, sortBy });
    }, [filters, groupBy, sortBy]);

    const setFilters = React.useCallback((next: Partial<Filters>) => {
        setFiltersState((prev) => ({ ...prev, ...next }));
    }, []);

    const clearFilters = React.useCallback(() => {
        setFiltersState(DEFAULT_STATE.filters);
    }, []);

    const assessmentsQuery = useQuery({
        queryKey: ["assessments", "list"],
        queryFn: () => listAssessments("id,title,date,weight_mode,class_id,subject_kind,subject_other"),
        staleTime: 30_000,
    });

    const classesQuery = useQuery({
        queryKey: ["classes", "list-for-assessments"],
        queryFn: () => listClasses("id,name,year"),
        staleTime: 60_000,
    });

    const assessments = assessmentsQuery.data ?? EMPTY_ASSESSMENTS;
    const classes = classesQuery.data ?? EMPTY_CLASSES;

    const classById = React.useMemo(() => {
        const map = new Map<number, ClassOut>();
        for (const c of classes) map.set(c.id, c);
        return map;
    }, [classes]);

    const perClassCount = React.useMemo(() => {
        const map = new Map<number, number>();
        for (const a of assessments) map.set(a.class_id, (map.get(a.class_id) ?? 0) + 1);
        return map;
    }, [assessments]);

    const filtered = React.useMemo(() => {
        const q = filters.search.trim().toLowerCase();
        const { start, end } = periodRange(filters.period);

        return assessments.filter((a) => {
            if (q && !a.title.toLowerCase().includes(q)) return false;
            if (filters.classIds.length > 0 && !filters.classIds.includes(a.class_id)) return false;
            if (filters.subjects.length > 0 && (!a.subject_kind || !filters.subjects.includes(a.subject_kind))) return false;
            if (filters.modes.length > 0 && !filters.modes.includes(a.weight_mode)) return false;
            if (start && end) {
                const d = dayjs(a.date);
                if (!d.isValid()) return false;
                if (d.isBefore(start) || d.isAfter(end)) return false;
            }
            return true;
        });
    }, [assessments, filters]);

    const sorted = React.useMemo(() => {
        const copy = [...filtered];
        copy.sort((a, b) => {
            switch (sortBy) {
                case "date_asc":
                    return a.date.localeCompare(b.date);
                case "date_desc":
                    return b.date.localeCompare(a.date);
                case "title_asc":
                    return a.title.localeCompare(b.title, "pt-BR");
                case "title_desc":
                    return b.title.localeCompare(a.title, "pt-BR");
            }
        });
        return copy;
    }, [filtered, sortBy]);

    const groups = React.useMemo<AssessmentGroup[]>(() => {
        const buckets = new Map<string, { label: string; subLabel?: string; items: AssessmentOut[]; sortKey: string }>();

        for (const a of sorted) {
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
    }, [sorted, groupBy, classById]);

    const kpis = React.useMemo(() => {
        const now = dayjs();
        const in7 = now.add(7, "day").endOf("day");
        const monthStart = now.startOf("month");
        const monthEnd = now.endOf("month");

        let next7 = 0;
        let thisMonth = 0;
        const subjectSet = new Set<string>();

        for (const a of filtered) {
            const d = dayjs(a.date);
            if (d.isValid()) {
                if (!d.isBefore(now.startOf("day")) && !d.isAfter(in7)) next7 += 1;
                if (!d.isBefore(monthStart) && !d.isAfter(monthEnd)) thisMonth += 1;
            }
            if (a.subject_kind) subjectSet.add(a.subject_kind === "outro" ? `outro:${a.subject_other ?? ""}` : a.subject_kind);
        }

        return { total: filtered.length, next7, thisMonth, subjects: subjectSet.size };
    }, [filtered]);

    const hasActiveFilters =
        !!filters.search ||
        filters.classIds.length > 0 ||
        filters.subjects.length > 0 ||
        filters.modes.length > 0 ||
        filters.period !== "all";

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
        filtered: sorted,
        groups,
        perClassCount,
    };
}
