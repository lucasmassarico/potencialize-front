import type { SubjectKind, WeightMode } from "../../../types/assessments";

const SUBJECT_LABEL: Record<SubjectKind, string> = {
    portugues: "Português",
    matematica: "Matemática",
    ciencias: "Ciências",
    historia: "História",
    geografia: "Geografia",
    ingles: "Inglês",
    artes: "Artes",
    educacao_fisica: "Educação Física",
    tecnologia: "Tecnologia",
    redacao: "Redação",
    geral: "Geral",
    outro: "Outro",
};

export const SUBJECT_ORDER: SubjectKind[] = [
    "geral",
    "portugues",
    "matematica",
    "ciencias",
    "historia",
    "geografia",
    "ingles",
    "artes",
    "educacao_fisica",
    "tecnologia",
    "redacao",
    "outro",
];

export function subjectLabel(kind?: SubjectKind | string | null, other?: string | null): string {
    if (!kind) return "—";
    if (kind === "outro") return (other ?? "").trim() || "Outro";
    return SUBJECT_LABEL[kind as SubjectKind] ?? String(kind);
}

const WEIGHT_LABEL: Record<WeightMode, string> = {
    fixed_all: "Mesmo peso",
    by_skill: "Por nível",
    per_question: "Por questão",
};

export const WEIGHT_ORDER: WeightMode[] = ["fixed_all", "by_skill", "per_question"];

export function weightLabel(mode?: WeightMode | string): string {
    if (!mode) return "—";
    return WEIGHT_LABEL[mode as WeightMode] ?? String(mode);
}

export function weightChipColor(mode?: WeightMode | string): "default" | "info" | "secondary" {
    switch (mode) {
        case "by_skill":
            return "info";
        case "per_question":
            return "secondary";
        default:
            return "default";
    }
}
