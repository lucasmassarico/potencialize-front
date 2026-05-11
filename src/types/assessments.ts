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
    date: string; // "YYYY-MM-DD"
    weight_mode: WeightMode;
    class_id: number;
    subject_kind?: SubjectKind; // novo
    subject_other?: string | null | undefined; // novo
}

export interface AssessmentCreate {
    title: string;
    date: string; // "YYYY-MM-DD"
    weight_mode: WeightMode;
    class_id: number;
    subject_kind: SubjectKind; // novo
    subject_other?: string | null | undefined; // novo (obrigatório se subject_kind='outro')
}

export type AssessmentUpdate = Partial<AssessmentCreate>;

// Overview (contrato novo — backend devolve hardest/easiest como objetos
// e by_question com text_short/descriptor/option_distribution)
export interface OverviewOptionDistribution {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    blank: number;
}

export interface OverviewByQuestion {
    question_id: number;
    display_order: number;
    text_short: string;
    display_label: string;
    skill_level: SkillLevel;
    descriptor_id?: number | null;
    descriptor_code?: string | null;
    descriptor_title?: string | null;
    weight: number;
    correct_option: Option;
    answers: number;
    correct: number;
    accuracy: number; // 0..1
    option_distribution: OverviewOptionDistribution;
}

export interface OverviewRankedItem {
    question_id: number;
    display_order: number;
    text_short: string;
    display_label: string;
    skill_level: SkillLevel;
    descriptor_code?: string | null;
    accuracy: number;
    answers: number;
}

export interface OverviewRankCriteria {
    top_n: number;
    min_answers: number;
    basis: string;
}

export interface OverviewBySkill {
    skill_level: SkillLevel;
    questions: number;
    answers: number;
    correct: number;
    accuracy: number;
    students_answered: number;
}

export interface AssessmentOverviewDTO {
    assessment: {
        id: number;
        class_id: number;
        class_name?: string | null;
        class_year?: number | null;
        teacher_id?: number | null;
        teacher_name?: string | null;
        title: string;
        date: string;
        subject_kind?: SubjectKind;
        subject_other?: string | null;
    };
    population: {
        students_in_class: number;
        students_answered_any: number;
        participation_rate: number; // 0..1
    };
    overall: {
        total_questions: number;
        total_answers: number;
        correct: number;
        accuracy: number; // 0..1
    };
    by_skill: OverviewBySkill[];
    by_question: OverviewByQuestion[];
    hardest: OverviewRankedItem[];
    easiest: OverviewRankedItem[];
    hardest_criteria: OverviewRankCriteria;
    easiest_criteria: OverviewRankCriteria;
}

// Matriz
export interface MatrixQuestion {
    id: number;
    question_id: number;
    display_order: number;
    text_short: string;
    display_label: string;
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
