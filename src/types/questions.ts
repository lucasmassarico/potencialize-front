// src/types/questions.ts
export type SkillLevel = "abaixo" | "basico" | "adequado" | "avancado";
export type Option = "a" | "b" | "c" | "d" | "e";

export interface QuestionOut {
    id: number;
    question_id: number;
    display_order: number;
    text_short: string;
    display_label: string;
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
    descriptor_id?: number;
    display_order?: number;
}

/** Item de criação em lote; a avaliação é definida exclusivamente pela URL. */
export type BulkQuestionCreate = Omit<QuestionCreate, "assessment_id">;

/** Valores aceitos do formulário antes de remover campos opcionais vazios. */
export type QuestionCreateInput = Omit<QuestionCreate, "descriptor_id" | "display_order"> & {
    descriptor_id?: number | null;
    display_order?: number | null;
};

export interface QuestionUpdate {
    text?: string;
    skill_level?: SkillLevel;
    weight?: number;
    correct_option?: Option;
    assessment_id?: number;
    descriptor_id?: number | null;
    display_order?: number | null;
}
