// src/api/studentAnswers.ts
import api from "./http";
import type { StudentAnswerCreate, StudentAnswerOut, StudentAnswerUpdate, StudentAssessmentResultsOut } from "../types/studentAnswers";

// CRUD simples
export async function createStudentAnswer(payload: StudentAnswerCreate) {
    const { data } = await api.post<StudentAnswerOut>("/student-answers/", payload);
    return data;
}
export async function updateStudentAnswer(answerId: number, payload: StudentAnswerUpdate) {
    const { data } = await api.put<StudentAnswerOut>(`/student-answers/${answerId}`, payload);
    return data;
}
export async function deleteStudentAnswer(answerId: number) {
    await api.delete(`/student-answers/${answerId}`);
}

// Bulk (apenas inserts; duplicados retornam 409)
export async function bulkCreateStudentAnswers(items: StudentAnswerCreate[]) {
    const { data } = await api.post("/student-answers/bulk", { items });
    return data;
}

// Resultado do aluno na avaliação (para mapear answer_id por question_id)
export async function getStudentAssessmentResults(studentId: number, assessmentId: number) {
    const { data } = await api.get<StudentAssessmentResultsOut>(`/students/${studentId}/assessments/${assessmentId}/results`);
    return data;
}

// Resultado de uma questão (opcional: para focar num aluno específico)
export async function getQuestionResult(questionId: number, opts?: { student_id?: number; reveal_correct?: boolean }) {
    const { data } = await api.get(`/questions/${questionId}/result`, {
        params: {
            student_id: opts?.student_id,
            reveal_correct: typeof opts?.reveal_correct === "boolean" ? String(opts.reveal_correct) : undefined,
        },
    });
    return data;
}
