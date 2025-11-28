// src/types/questions.ts
export type SkillLevel = "abaixo" | "basico" | "adequado" | "avancado";
export type Option = "a" | "b" | "c" | "d" | "e";

export interface QuestionOut {
    id: number;
    text: string;
    skill_level: SkillLevel;
    weight: number;
    correct_option: Option;
    assessment_id: number;
    descriptor_id?: number | null;
}

export interface QuestionList {
    items: QuestionOut[];
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface QuestionCreate {
    text: string;
    skill_level: SkillLevel;
    weight: number;
    correct_option: Option;
    assessment_id: number;
    descriptor_id?: number | null;
}

export interface QuestionUpdate extends Omit<QuestionOut, "id"> {}
