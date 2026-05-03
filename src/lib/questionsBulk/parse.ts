import type { Option, QuestionCreate, SkillLevel } from "../../types/questions";
import type { DescriptorOut } from "../../types/descriptors";
import { parseSkillLevel } from "../skillLevels";

export interface BulkRowDraft {
    text: string;
    skill_level: SkillLevel | null;
    weight: number | null;
    correct_option: Option | null;
    descriptor_code: string | null;
    descriptor_id: number | null;
}

export interface BulkRowError {
    row: number;
    field: keyof BulkRowDraft | "row";
    message: string;
}

export type WeightMode = "per_question" | "by_skill" | string | undefined;

export const FRIENDLY_HEADERS = {
    text: "Enunciado",
    skill_level: "Nível",
    weight: "Peso",
    correct_option: "Alternativa correta",
    descriptor_code: "Código do descritor",
} as const;

const HEADER_ALIASES: Record<keyof BulkRowDraft, string[]> = {
    text: ["enunciado", "questao", "questão", "texto", "text"],
    skill_level: ["nivel", "nível", "nivel da questao", "nível da questão", "skill_level"],
    weight: ["peso", "weight"],
    correct_option: ["alternativa correta", "alternativa", "correta", "correct_option", "gabarito"],
    descriptor_code: [
        "codigo do descritor",
        "código do descritor",
        "codigo descritor",
        "descritor",
        "descriptor_code",
        "codigo",
        "código",
    ],
    descriptor_id: ["descriptor_id"],
};

function normalize(input: string): string {
    return input
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .trim()
        .toLowerCase();
}

function emptyDraft(): BulkRowDraft {
    return {
        text: "",
        skill_level: null,
        weight: null,
        correct_option: null,
        descriptor_code: null,
        descriptor_id: null,
    };
}

export function createEmptyDraft(): BulkRowDraft {
    return emptyDraft();
}

function mapHeader(rawHeader: string): keyof BulkRowDraft | null {
    const key = normalize(rawHeader);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES) as Array<[keyof BulkRowDraft, string[]]>) {
        if (aliases.includes(key)) return field;
    }
    return null;
}

const VALID_OPTIONS: Option[] = ["a", "b", "c", "d", "e"];

function parseCorrectOption(raw: string | null | undefined): Option | null {
    if (!raw) return null;
    const v = normalize(String(raw));
    if (VALID_OPTIONS.includes(v as Option)) return v as Option;
    return null;
}

function parseWeight(raw: unknown): number | null {
    if (raw === null || raw === undefined || raw === "") return null;
    const s = String(raw).trim().replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
}

function buildDescriptorCodeIndex(descriptors: DescriptorOut[] | undefined) {
    const map = new Map<string, DescriptorOut>();
    (descriptors ?? []).forEach((d) => map.set(d.code.toLowerCase().trim(), d));
    return map;
}

function rowToDraft(record: Record<string, unknown>): BulkRowDraft {
    const draft = emptyDraft();
    for (const [rawHeader, rawValue] of Object.entries(record)) {
        const field = mapHeader(rawHeader);
        if (!field) continue;
        const value = rawValue == null ? "" : String(rawValue).trim();
        switch (field) {
            case "text":
                draft.text = value;
                break;
            case "skill_level":
                draft.skill_level = parseSkillLevel(value);
                break;
            case "weight":
                draft.weight = parseWeight(value);
                break;
            case "correct_option":
                draft.correct_option = parseCorrectOption(value);
                break;
            case "descriptor_code":
                draft.descriptor_code = value || null;
                break;
            case "descriptor_id": {
                const n = Number(value);
                draft.descriptor_id = Number.isFinite(n) ? n : null;
                break;
            }
        }
    }
    return draft;
}

export async function parseDraftsFromWorkbook(file: ArrayBuffer): Promise<BulkRowDraft[]> {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(file, { type: "array" });
    const firstSheetName = wb.SheetNames[0];
    if (!firstSheetName) return [];
    const sheet = wb.Sheets[firstSheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: true,
    });
    return json.map(rowToDraft);
}

function splitCsvLine(line: string, delimiter: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (!inQuotes && c === delimiter) {
            out.push(cur);
            cur = "";
            continue;
        }
        cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
}

function detectDelimiter(headerLine: string): string {
    const candidates = [";", "\t", ","];
    let best = ",";
    let bestCount = -1;
    for (const d of candidates) {
        const count = splitCsvLine(headerLine, d).length;
        if (count > bestCount) {
            best = d;
            bestCount = count;
        }
    }
    return best;
}

const BOM = "﻿";

export function parseDraftsFromText(raw: string): BulkRowDraft[] {
    const lines = raw
        .split(/\r?\n/)
        .map((l) => (l.startsWith(BOM) ? l.slice(BOM.length) : l))
        .filter((l) => l.trim().length > 0);
    if (!lines.length) return [];

    const delimiter = detectDelimiter(lines[0]);
    const headers = splitCsvLine(lines[0], delimiter);
    const headerIsMappable = headers.some((h) => mapHeader(h));

    if (!headerIsMappable) {
        const positionalHeaders: Array<keyof BulkRowDraft> = [
            "text",
            "skill_level",
            "weight",
            "correct_option",
            "descriptor_code",
        ];
        return lines.map((line) => {
            const cells = splitCsvLine(line, delimiter);
            const record: Record<string, string> = {};
            positionalHeaders.forEach((h, i) => {
                record[h] = cells[i] ?? "";
            });
            return rowToDraft(record);
        });
    }

    return lines.slice(1).map((line) => {
        const cells = splitCsvLine(line, delimiter);
        const record: Record<string, string> = {};
        headers.forEach((h, i) => {
            record[h] = cells[i] ?? "";
        });
        return rowToDraft(record);
    });
}

export interface ResolveOptions {
    weightMode: WeightMode;
    descriptors: DescriptorOut[] | undefined;
}

export interface ResolveResult {
    items: QuestionCreate[];
    drafts: BulkRowDraft[];
    errors: BulkRowError[];
}

export function validateAndResolve(
    rawDrafts: BulkRowDraft[],
    assessmentId: number,
    opts: ResolveOptions,
): ResolveResult {
    const codeIndex = buildDescriptorCodeIndex(opts.descriptors);
    const errors: BulkRowError[] = [];
    const items: QuestionCreate[] = [];
    const drafts: BulkRowDraft[] = [];

    const isPerQuestion = opts.weightMode === "per_question";
    const isBySkill = opts.weightMode === "by_skill";

    rawDrafts.forEach((draft, idx) => {
        const row = idx + 1;
        const resolved: BulkRowDraft = { ...draft };

        if (!resolved.text || resolved.text.trim() === "") {
            errors.push({ row, field: "text", message: "Enunciado é obrigatório." });
        }

        if (!resolved.correct_option) {
            errors.push({
                row,
                field: "correct_option",
                message: "Alternativa correta deve ser A, B, C, D ou E.",
            });
        }

        if (isBySkill) {
            if (!resolved.skill_level) {
                errors.push({
                    row,
                    field: "skill_level",
                    message: "Nível é obrigatório (Abaixo do Básico, Básico, Adequado ou Avançado).",
                });
            }
        } else {
            resolved.skill_level = resolved.skill_level ?? "basico";
        }

        if (isPerQuestion) {
            if (resolved.weight === null || resolved.weight === undefined) {
                errors.push({ row, field: "weight", message: "Peso é obrigatório." });
            } else if (!(resolved.weight > 0)) {
                errors.push({ row, field: "weight", message: "Peso deve ser maior que zero." });
            }
        } else {
            resolved.weight = resolved.weight ?? 1;
        }

        if (resolved.descriptor_code) {
            const found = codeIndex.get(resolved.descriptor_code.toLowerCase().trim());
            if (!found) {
                errors.push({
                    row,
                    field: "descriptor_code",
                    message: `Descritor com código "${resolved.descriptor_code}" não encontrado.`,
                });
            } else {
                resolved.descriptor_id = found.id;
            }
        }

        drafts.push(resolved);

        const rowHasError = errors.some((e) => e.row === row);
        if (!rowHasError && resolved.skill_level && resolved.correct_option && resolved.weight !== null) {
            items.push({
                text: resolved.text.trim(),
                skill_level: resolved.skill_level,
                weight: resolved.weight,
                correct_option: resolved.correct_option,
                assessment_id: assessmentId,
                descriptor_id: resolved.descriptor_id,
            });
        }
    });

    return { items, drafts, errors };
}

export async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return await file.arrayBuffer();
}
