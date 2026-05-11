import type { AnswerOption, StudentAnswerCreate, StudentAnswerOut, StudentAnswerUpdate } from "../../../types/studentAnswers";

export interface MatrixAnswerEntry {
    id?: number;
    marked?: AnswerOption;
}

export interface MatrixAnswerPersistenceApi {
    createStudentAnswer: (payload: StudentAnswerCreate) => Promise<StudentAnswerOut>;
    updateStudentAnswer: (answerId: number, payload: StudentAnswerUpdate) => Promise<StudentAnswerOut>;
    deleteStudentAnswer: (answerId: number) => Promise<void>;
}

export interface PersistMatrixAnswerChangeInput {
    studentId: number;
    questionId: number;
    current?: MatrixAnswerEntry;
    next: AnswerOption | null;
    resolveExistingAnswerId: () => Promise<number | undefined>;
}

const getResponseStatus = (error: unknown): number | undefined => {
    if (typeof error !== "object" || error === null) return undefined;

    const response = (error as { response?: { status?: unknown } }).response;
    return typeof response?.status === "number" ? response.status : undefined;
};

const isConflictError = (error: unknown): boolean => getResponseStatus(error) === 409;

const toEntry = (answer: StudentAnswerOut, fallbackId: number, fallbackMarked: AnswerOption): MatrixAnswerEntry => ({
    id: answer.id || fallbackId,
    marked: answer.marked_option || fallbackMarked,
});

export async function persistMatrixAnswerChange(
    input: PersistMatrixAnswerChangeInput,
    api: MatrixAnswerPersistenceApi
): Promise<MatrixAnswerEntry | undefined> {
    const { studentId, questionId, current, next, resolveExistingAnswerId } = input;

    if (next === null && !current?.marked && !current?.id) return undefined;
    if (current?.marked === next) return current;

    if (next === null) {
        const answerId = current?.id ?? (await resolveExistingAnswerId());
        if (answerId) await api.deleteStudentAnswer(answerId);
        return undefined;
    }

    if (current?.id) {
        const updated = await api.updateStudentAnswer(current.id, { marked_option: next });
        return toEntry(updated, current.id, next);
    }

    try {
        const created = await api.createStudentAnswer({
            student_id: studentId,
            question_id: questionId,
            marked_option: next,
        });
        return toEntry(created, created.id, next);
    } catch (error: unknown) {
        if (!isConflictError(error)) throw error;

        const existingId = await resolveExistingAnswerId();
        if (!existingId) throw error;

        const updated = await api.updateStudentAnswer(existingId, { marked_option: next });
        return toEntry(updated, existingId, next);
    }
}

export const getMatrixAnswerErrorMessage = (error: unknown): string => {
    if (typeof error !== "object" || error === null) return "Erro ao salvar resposta. Tente novamente.";

    const message = (error as { response?: { data?: { message?: unknown } }; message?: unknown }).response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;

    const fallbackMessage = (error as { message?: unknown }).message;
    return typeof fallbackMessage === "string" && fallbackMessage.trim() ? fallbackMessage : "Erro ao salvar resposta. Tente novamente.";
};
