export type WeightMode = "fixed_all" | "by_skill" | "per_question";

export type SkillLevel = "abaixo" | "basico" | "adequado" | "avancado";
export type Option = "a" | "b" | "c" | "d" | "e";

export interface AssessmentOut {
    id: number;
    title: string;
    date: string; // ISO: "YYYY-MM-DDTHH:MM"
    weight_mode: WeightMode;
    class_id: number;
}

export interface AssessmentCreate {
    title: string;
    date: string; // "YYYY-MM-DDTHH:MM"
    weight_mode: WeightMode;
    class_id: number;
}

export type AssessmentUpdate = Partial<AssessmentCreate>;

// Overview

export interface AssessmentOverviewDTO {
    assessment: any;
    population: any;
    overall: any;
    by_skill: Array<any>;
    by_question: Array<any>;
    hardest: any;
    easiest: any;
}

// Matriz

export interface MatrixQuestion {
    id: number;
    skill_level: SkillLevel;
    weight: number;
    correct_option: "a" | "b" | "c" | "d" | "e";
}

export interface MatrixStudent {
    id: number;
    name: string;
}

export interface MatrixCell {
    student_id: number;
    question_id: number;
    marked_option?: Option;
    is_correct: boolean;
}

export interface MatrixPagination {
    page: number;
    per_page: number;
    total_students: number;
    total_pages: number;
}

export interface AssessmentMatrixDTO {
    assessment: { id: number; class_id: number; title: string };
    questions: MatrixQuestion[];
    students: MatrixStudent[];
    cells: MatrixCell[];
    pagination: MatrixPagination;
}

// Pesos

export interface SkillWeightItem {
    skill_level: SkillLevel;
    weight: number;
}
export interface AssessmentSkillWeightsOut {
    items: SkillWeightItem[];
}
export interface AssessmentSkillWeightsIn {
    items: SkillWeightItem[];
}
