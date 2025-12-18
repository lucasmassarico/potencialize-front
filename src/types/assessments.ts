// Tipos básicos
export type WeightMode = "fixed_all" | "by_skill" | "per_question";
export type SkillLevel = "abaixo" | "basico" | "adequado" | "avancado";
export type Option = "a" | "b" | "c" | "d" | "e";

// Disciplina (subject)
export type SubjectKind =
    | "portugues"
    | "matematica"
    | "ciencias"
    | "historia"
    | "geografia"
    | "ingles"
    | "artes"
    | "educacao_fisica"
    | "tecnologia"
    | "redacao"
    | "geral"
    | "outro";

// Avaliações
export interface AssessmentOut {
    id: number;
    title: string;
    date: string; // ISO "YYYY-MM-DDTHH:MM"
    weight_mode: WeightMode;
    class_id: number;
    subject_kind?: SubjectKind; // novo
    subject_other?: string | null | undefined; // novo
}

export interface AssessmentCreate {
    title: string;
    date: string; // "YYYY-MM-DDTHH:MM"
    weight_mode: WeightMode;
    class_id: number;
    subject_kind: SubjectKind; // novo
    subject_other?: string | null | undefined; // novo (obrigatório se subject_kind='outro')
}

export type AssessmentUpdate = Partial<AssessmentCreate>;

// Overview (mantido genérico, como estava)
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
    correct_option: Option;
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

// Pesos por nível
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

export type GradingBasis = "by_points" | "by_accuracy";

export interface AssessmentGradingPolicyIn {
    /** Base do cálculo do % para classificação */
    basis: GradingBasis;
    /** Em branco conta como errado (entra no denominador) */
    count_blank_as_wrong: boolean;
    /** Cortes (0..100) */
    advanced_min: number; // Avançado
    adequate_min: number; // Adequado
    basic_min: number; // Básico
}

export interface AssessmentGradingPolicyOut extends AssessmentGradingPolicyIn {
    assessment_id: number;
}
