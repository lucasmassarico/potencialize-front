// src/types/studentAnswers.ts
// Tipagem para CRUD e utilitários de mapeamento
export type AnswerOption = "a" | "b" | "c" | "d" | "e";

export interface StudentAnswerOut {
    id: number;
    student_id: number;
    question_id: number;
    marked_option: AnswerOption;
}

export interface StudentAnswerCreate {
    student_id: number;
    question_id: number;
    marked_option: AnswerOption;
}

export interface StudentAnswerUpdate {
    marked_option: AnswerOption;
}

// Resultado individual do aluno na avaliação (shape tolerante)
export interface StudentAssessmentResults {
    student_id: number;
    assessment_id: number;
    // backend pode chamar de "answers" ou "responses" — tratamos ambos
    answers?: Array<{ id: number; question_id: number; marked_option: AnswerOption }>;
    responses?: Array<{ id: number; question_id: number; marked_option: AnswerOption }>;
}
