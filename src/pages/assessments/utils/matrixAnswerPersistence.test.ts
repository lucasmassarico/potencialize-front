import { describe, expect, it, vi } from "vitest";

import type { AnswerOption, StudentAnswerCreate, StudentAnswerOut, StudentAnswerUpdate } from "../../../types/studentAnswers";
import { persistMatrixAnswerChange, type MatrixAnswerPersistenceApi } from "./matrixAnswerPersistence";

const makeAnswer = (id: number, markedOption: AnswerOption): StudentAnswerOut => ({
    id,
    student_id: 10,
    question_id: 20,
    marked_option: markedOption,
});

const makeApi = (): MatrixAnswerPersistenceApi => ({
    createStudentAnswer: vi.fn<(payload: StudentAnswerCreate) => Promise<StudentAnswerOut>>(),
    updateStudentAnswer: vi.fn<(answerId: number, payload: StudentAnswerUpdate) => Promise<StudentAnswerOut>>(),
    deleteStudentAnswer: vi.fn<(answerId: number) => Promise<void>>(),
});

const makeConflict = () => ({ response: { status: 409 } });

describe("matrix answer persistence", () => {
    it("updates an existing answer by id", async () => {
        const api = makeApi();
        vi.mocked(api.updateStudentAnswer).mockResolvedValue(makeAnswer(101, "c"));

        const result = await persistMatrixAnswerChange(
            {
                studentId: 10,
                questionId: 20,
                current: { id: 101, marked: "b" },
                next: "c",
                resolveExistingAnswerId: vi.fn(),
            },
            api
        );

        expect(api.updateStudentAnswer).toHaveBeenCalledWith(101, { marked_option: "c" });
        expect(result).toEqual({ id: 101, marked: "c" });
    });

    it("deletes an answer using a resolved id when the local entry is missing it", async () => {
        const api = makeApi();
        const resolveExistingAnswerId = vi.fn<() => Promise<number | undefined>>().mockResolvedValue(202);

        const result = await persistMatrixAnswerChange(
            {
                studentId: 10,
                questionId: 20,
                current: { marked: "d" },
                next: null,
                resolveExistingAnswerId,
            },
            api
        );

        expect(resolveExistingAnswerId).toHaveBeenCalledOnce();
        expect(api.deleteStudentAnswer).toHaveBeenCalledWith(202);
        expect(result).toBeUndefined();
    });

    it("creates a new answer when no current id exists", async () => {
        const api = makeApi();
        vi.mocked(api.createStudentAnswer).mockResolvedValue(makeAnswer(303, "a"));

        const result = await persistMatrixAnswerChange(
            {
                studentId: 10,
                questionId: 20,
                current: undefined,
                next: "a",
                resolveExistingAnswerId: vi.fn(),
            },
            api
        );

        expect(api.createStudentAnswer).toHaveBeenCalledWith({
            student_id: 10,
            question_id: 20,
            marked_option: "a",
        });
        expect(result).toEqual({ id: 303, marked: "a" });
    });

    it("resolves a create conflict and updates the existing answer", async () => {
        const api = makeApi();
        vi.mocked(api.createStudentAnswer).mockRejectedValue(makeConflict());
        vi.mocked(api.updateStudentAnswer).mockResolvedValue(makeAnswer(404, "e"));
        const resolveExistingAnswerId = vi.fn<() => Promise<number | undefined>>().mockResolvedValue(404);

        const result = await persistMatrixAnswerChange(
            {
                studentId: 10,
                questionId: 20,
                current: undefined,
                next: "e",
                resolveExistingAnswerId,
            },
            api
        );

        expect(resolveExistingAnswerId).toHaveBeenCalledOnce();
        expect(api.updateStudentAnswer).toHaveBeenCalledWith(404, { marked_option: "e" });
        expect(result).toEqual({ id: 404, marked: "e" });
    });

    it("rethrows a create conflict when the existing answer cannot be resolved", async () => {
        const api = makeApi();
        const conflict = makeConflict();
        vi.mocked(api.createStudentAnswer).mockRejectedValue(conflict);

        await expect(
            persistMatrixAnswerChange(
                {
                    studentId: 10,
                    questionId: 20,
                    current: undefined,
                    next: "b",
                    resolveExistingAnswerId: vi.fn<() => Promise<number | undefined>>().mockResolvedValue(undefined),
                },
                api
            )
        ).rejects.toBe(conflict);
    });
});
