import type { MatrixCell, MatrixQuestion } from "../../../types/assessments";
import type { MatrixAnswerEntry } from "./matrixAnswerPersistence";

export type AnswerIndex = Map<string, MatrixAnswerEntry>;

export const toAnswerIndexKey = (studentId: number, questionId: number): string => `${studentId}-${questionId}`;

export const questionNumberLabel = (question: MatrixQuestion): string => `Questão ${question.display_order ?? question.id}`;

export const buildAnswerIndex = (cells: MatrixCell[] = []): AnswerIndex => {
    const next: AnswerIndex = new Map();
    cells.forEach((cell) => {
        next.set(toAnswerIndexKey(cell.student_id, cell.question_id), {
            id: cell.answer_id,
            marked: cell.marked_option,
        });
    });
    return next;
};
