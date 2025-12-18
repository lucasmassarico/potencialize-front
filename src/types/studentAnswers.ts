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

export interface StudentAssessmentResultAnswer {
    answer_id: number; // novo no backend
    question_id: number;
    marked_option: AnswerOption;
    is_correct?: boolean;
}

export type GradingBasis = "by_points" | "by_accuracy";

export interface StudentResultScoreTotals {
    questions: number;
    answered: number;
    correct: number;
    points_total: number;
    points_correct: number;
}

export interface StudentResultScore {
    basis: GradingBasis;
    percent: number; // 0..100
    totals: StudentResultScoreTotals;
}

export type PredictedKey = "ABAIXO_BASICO" | "BASICO" | "ADEQUADO" | "AVANCADO";

export interface StudentPredictedLevel {
    key: PredictedKey;
    label: string;
    color: string; // hex
}

export interface StudentResultPolicy {
    basis: GradingBasis;
    count_blank_as_wrong: boolean;
    advanced_min: number;
    adequate_min: number;
    basic_min: number;
}

export interface StudentAssessmentResultsOut {
    student: { id: number; name: string; class_id: number };
    assessment: { id: number; title?: string };
    answers: StudentAssessmentResultAnswer[];
    summary: { answered: number; correct: number; accuracy: number }; // accuracy [0..1]
    score: StudentResultScore;
    predicted_level: StudentPredictedLevel;
    policy: StudentResultPolicy;
}
