import type { SkillLevel } from "../types/questions";

export const SKILL_LEVELS: SkillLevel[] = ["abaixo", "basico", "adequado", "avancado"];

export const SKILL_LABEL: Record<SkillLevel, string> = {
    abaixo: "Abaixo do Básico",
    basico: "Básico",
    adequado: "Adequado",
    avancado: "Avançado",
};

export function skillChipColor(s: SkillLevel): "error" | "warning" | "info" | "success" {
    switch (s) {
        case "abaixo":
            return "error";
        case "basico":
            return "warning";
        case "adequado":
            return "info";
        case "avancado":
            return "success";
    }
}

function normalize(input: string): string {
    return input
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .trim()
        .toLowerCase();
}

const SKILL_ALIASES: Record<string, SkillLevel> = {
    abaixo: "abaixo",
    "abaixo do basico": "abaixo",
    insuficiente: "abaixo",
    basico: "basico",
    elementar: "basico",
    adequado: "adequado",
    proficiente: "adequado",
    avancado: "avancado",
    avancada: "avancado",
};

export function parseSkillLevel(input: string | null | undefined): SkillLevel | null {
    if (!input) return null;
    const key = normalize(input);
    return SKILL_ALIASES[key] ?? null;
}
