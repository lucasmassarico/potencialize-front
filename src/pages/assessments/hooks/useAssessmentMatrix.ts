import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { getAssessmentMatrix } from "../../../api/assessments";
import { createStudentAnswer, deleteStudentAnswer, getStudentAssessmentResults, updateStudentAnswer } from "../../../api/studentAnswers";
import type { MatrixCell, MatrixStudentResultSummary } from "../../../types/assessments";
import type { AnswerOption } from "../../../types/studentAnswers";
import { buildAnswerIndex, toAnswerIndexKey, type AnswerIndex } from "../utils/assessmentMatrixHelpers";
import {
    getMatrixAnswerErrorMessage,
    persistMatrixAnswerChange,
    type MatrixAnswerEntry,
    type MatrixAnswerPersistenceApi,
} from "../utils/matrixAnswerPersistence";

const MIN_PENDING_MS = 500;

const answerPersistenceApi: MatrixAnswerPersistenceApi = {
    createStudentAnswer,
    updateStudentAnswer,
    deleteStudentAnswer,
};

interface AnswerEntryFromResults {
    answer_id?: number;
    id?: number;
    question_id: number;
}

interface MatrixSnack {
    open: boolean;
    message: string;
    severity: "error";
}

export interface MatrixHover {
    studentId?: number;
    questionId?: number;
}

export function useAssessmentMatrix(assessmentId?: string) {
    const queryClient = useQueryClient();
    const assessmentIdNumber = Number(assessmentId);
    const hasAssessmentId = Boolean(assessmentId) && Number.isFinite(assessmentIdNumber);

    const [page, setPage] = React.useState(1);
    const [perPage, setPerPage] = React.useState(50);
    const [editMode, setEditMode] = React.useState(false);
    const [answerIdx, setAnswerIdx] = React.useState<AnswerIndex>(new Map());
    const [hover, setHover] = React.useState<MatrixHover>({});
    const [pending, setPending] = React.useState<Set<string>>(new Set());
    const [snack, setSnack] = React.useState<MatrixSnack | null>(null);
    const pendingSinceRef = React.useRef<Map<string, number>>(new Map());
    const pendingTimerRef = React.useRef<Map<string, number>>(new Map());

    const { data, isLoading, isError } = useQuery({
        queryKey: ["assessmentMatrix", assessmentId, page, perPage],
        queryFn: () => getAssessmentMatrix(assessmentIdNumber, { students_page: page, per_page: perPage }),
        enabled: hasAssessmentId,
        staleTime: 30_000,
    });

    const cellMap = React.useMemo(() => {
        const map = new Map<string, MatrixCell>();
        (data?.cells || []).forEach((cell) => map.set(toAnswerIndexKey(cell.student_id, cell.question_id), cell));
        return map;
    }, [data?.cells]);

    const resultMap = React.useMemo(() => {
        const map = new Map<number, MatrixStudentResultSummary>();
        (data?.student_summaries || []).forEach((summary) => map.set(summary.student_id, summary));
        return map;
    }, [data?.student_summaries]);

    React.useEffect(() => {
        setAnswerIdx(buildAnswerIndex(data?.cells));
    }, [data?.cells]);

    React.useEffect(
        () => () => {
            pendingTimerRef.current.forEach((timer) => window.clearTimeout(timer));
        },
        []
    );

    const invalidateMatrix = React.useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: ["assessmentMatrix", assessmentId] });
    }, [assessmentId, queryClient]);

    const setHoverIfChanged = React.useCallback((studentId?: number, questionId?: number) => {
        setHover((prev) => (prev.studentId === studentId && prev.questionId === questionId ? prev : { studentId, questionId }));
    }, []);

    const clearHover = React.useCallback(() => {
        setHover((prev) => (prev.studentId === undefined && prev.questionId === undefined ? prev : {}));
    }, []);

    const markPending = React.useCallback((key: string) => {
        setPending((prev) => {
            if (prev.has(key)) return prev;
            const clone = new Set(prev);
            clone.add(key);
            pendingSinceRef.current.set(key, performance.now());
            return clone;
        });
    }, []);

    const unmarkPending = React.useCallback((key: string) => {
        const startedAt = pendingSinceRef.current.get(key);
        const elapsed = startedAt ? performance.now() - startedAt : MIN_PENDING_MS;
        const remaining = MIN_PENDING_MS - elapsed;
        const clear = () => {
            setPending((prev) => {
                if (!prev.has(key)) return prev;
                const clone = new Set(prev);
                clone.delete(key);
                return clone;
            });
            pendingSinceRef.current.delete(key);
            pendingTimerRef.current.delete(key);
        };

        if (remaining <= 0) {
            clear();
            return;
        }

        const timer = window.setTimeout(clear, remaining);
        pendingTimerRef.current.set(key, timer);
    }, []);

    const resolveExistingAnswerId = React.useCallback(
        async (studentId: number, questionId: number): Promise<number | undefined> => {
            if (!hasAssessmentId) return undefined;

            const result = await getStudentAssessmentResults(studentId, assessmentIdNumber);
            const resultWithLegacyShape = result as { answers?: AnswerEntryFromResults[]; responses?: AnswerEntryFromResults[] };
            const answers = resultWithLegacyShape.answers ?? resultWithLegacyShape.responses ?? [];
            const hit = answers.find((answer) => answer.question_id === questionId);

            if (typeof hit?.answer_id === "number") return hit.answer_id;
            if (typeof hit?.id === "number") return hit.id;
            return undefined;
        },
        [assessmentIdNumber, hasAssessmentId]
    );

    const restoreAnswer = React.useCallback((key: string, previous?: MatrixAnswerEntry) => {
        setAnswerIdx((prev) => {
            const clone = new Map(prev);
            if (previous) clone.set(key, previous);
            else clone.delete(key);
            return clone;
        });
    }, []);

    const upsertAnswer = React.useCallback(
        async (studentId: number, questionId: number, next: AnswerOption | null) => {
            const key = toAnswerIndexKey(studentId, questionId);
            const current = answerIdx.get(key);

            if (next === null && !current?.marked && !current?.id) return;
            if (current?.marked === next) return;

            const previous = current ? { ...current } : undefined;
            markPending(key);
            setSnack(null);

            setAnswerIdx((prev) => {
                const clone = new Map(prev);
                if (next) clone.set(key, { id: current?.id, marked: next });
                else clone.delete(key);
                return clone;
            });

            try {
                const persisted = await persistMatrixAnswerChange(
                    {
                        studentId,
                        questionId,
                        current,
                        next,
                        resolveExistingAnswerId: () => resolveExistingAnswerId(studentId, questionId),
                    },
                    answerPersistenceApi
                );

                setAnswerIdx((prev) => {
                    const clone = new Map(prev);
                    if (persisted) clone.set(key, persisted);
                    else clone.delete(key);
                    return clone;
                });

                await invalidateMatrix();
            } catch (error: unknown) {
                restoreAnswer(key, previous);
                setSnack({
                    open: true,
                    message: getMatrixAnswerErrorMessage(error),
                    severity: "error",
                });
                await invalidateMatrix();
            } finally {
                unmarkPending(key);
            }
        },
        [answerIdx, invalidateMatrix, markPending, resolveExistingAnswerId, restoreAnswer, unmarkPending]
    );

    const isPending = React.useCallback((key: string) => pending.has(key), [pending]);

    const closeSnack = React.useCallback(() => {
        setSnack((prev) => (prev ? { ...prev, open: false } : prev));
    }, []);

    const clearSnack = React.useCallback(() => {
        setSnack(null);
    }, []);

    return {
        assessmentIdNumber,
        data,
        isLoading,
        isError,
        page,
        setPage,
        perPage,
        setPerPage,
        editMode,
        setEditMode,
        answerIdx,
        cellMap,
        resultMap,
        hover,
        setHoverIfChanged,
        clearHover,
        isPending,
        upsertAnswer,
        invalidateMatrix,
        snack,
        closeSnack,
        clearSnack,
    };
}
