import { describe, expect, it } from "vitest";

import type { DescriptorOut } from "../../types/descriptors";
import {
    createEmptyDraft,
    parseDraftsFromText,
    parseDraftsFromWorkbook,
    readFileAsArrayBuffer,
    validateAndResolve,
} from "./parse";
import type { BulkRowDraft } from "./parse";

function makeDraft(patch: Partial<BulkRowDraft> = {}): BulkRowDraft {
    return {
        ...createEmptyDraft(),
        text: "Quanto é 2 + 2?",
        correct_option: "a",
        ...patch,
    };
}

function makeDescriptor(patch: Partial<DescriptorOut> = {}): DescriptorOut {
    return {
        id: 37,
        code: "DÉS-01",
        title: "Resolver situações-problema",
        ...patch,
    };
}

describe("parseDraftsFromText", () => {
    it("keeps an empty descriptor_id as absent instead of coercing it to zero", () => {
        const [draft] = parseDraftsFromText(
            "Enunciado;Nível;Peso;Alternativa correta;descriptor_id\nTeste;Básico;1;A;",
        );

        expect(draft?.descriptor_id).toBeNull();
    });

    it("parses headerless positional rows with quoted delimiters and decimal comma", () => {
        const [draft] = parseDraftsFromText(
            '"Texto; com separador";Avançado;1,5;E; DES-01 ',
        );

        expect(draft).toMatchObject({
            text: "Texto; com separador",
            skill_level: "avancado",
            weight: 1.5,
            correct_option: "e",
            descriptor_code: "DES-01",
        });
    });

    it("returns no drafts for blank content", () => {
        expect(parseDraftsFromText(" \n\t ")).toEqual([]);
    });

    it("parses valid optional numbers and marks malformed spreadsheet values", () => {
        const [valid, invalid] = parseDraftsFromText(
            [
                "Número da questão;Enunciado;Nível;Peso;Alternativa correta;descriptor_id;Ignorado",
                '3;"Ele disse ""oi""";Avançado;1,5;E;37;x',
                "0;Teste;;inválido;Z;-1;x",
            ].join("\n"),
        );

        expect(valid).toMatchObject({
            display_order: 3,
            text: 'Ele disse "oi"',
            skill_level: "avancado",
            weight: 1.5,
            correct_option: "e",
            descriptor_id: 37,
        });
        expect(Number.isNaN(invalid?.display_order)).toBe(true);
        expect(invalid).toMatchObject({
            skill_level: null,
            weight: null,
            correct_option: null,
        });
        expect(Number.isNaN(invalid?.descriptor_id)).toBe(true);
    });

    it("fills missing positional cells with empty optional values", () => {
        const [draft] = parseDraftsFromText("Texto curto;Básico");

        expect(draft).toMatchObject({
            text: "Texto curto",
            skill_level: "basico",
            weight: null,
            correct_option: null,
            descriptor_code: null,
        });
    });
});

describe("parseDraftsFromWorkbook", () => {
    it("keeps an empty descriptor_id as absent in spreadsheets", async () => {
        const XLSX = await import("xlsx");
        const workbook = XLSX.utils.book_new();
        const sheet = XLSX.utils.aoa_to_sheet([
            ["Enunciado", "Nível", "Peso", "Alternativa correta", "descriptor_id"],
            ["Teste", "Básico", 1, "A", ""],
        ]);
        XLSX.utils.book_append_sheet(workbook, sheet, "Questões");
        const file = XLSX.write(workbook, { type: "array", bookType: "xlsx" });

        const [draft] = await parseDraftsFromWorkbook(file);

        expect(draft?.descriptor_id).toBeNull();
    });
});

describe("validateAndResolve", () => {
    it("omits optional descriptor_id and path-owned assessment_id from bulk items", () => {
        const result = validateAndResolve([makeDraft()], 11, {
            weightMode: "fixed_all",
            descriptors: [],
        });

        expect(result.errors).toEqual([]);
        expect(result.items).toEqual([
            {
                text: "Quanto é 2 + 2?",
                skill_level: "basico",
                weight: 1,
                correct_option: "a",
            },
        ]);
        expect(result.items[0]).not.toHaveProperty("descriptor_id");
        expect(result.items[0]).not.toHaveProperty("assessment_id");
    });

    it("includes a descriptor explicitly selected in the editable table", () => {
        const result = validateAndResolve([makeDraft({ descriptor_id: 37 })], 11, {
            weightMode: "fixed_all",
            descriptors: [],
        });

        expect(result.errors).toEqual([]);
        expect(result.items[0]).toMatchObject({ descriptor_id: 37 });
    });

    it("resolves imported descriptor codes ignoring case, surrounding whitespace and accents", () => {
        const source = makeDraft({ descriptor_code: "  dés-01  " });
        const result = validateAndResolve([source], 11, {
            weightMode: "fixed_all",
            descriptors: [makeDescriptor({ code: "DES-01" })],
        });

        expect(result.errors).toEqual([]);
        expect(result.drafts[0]?.descriptor_id).toBe(37);
        expect(result.items[0]).toMatchObject({ descriptor_id: 37 });
        expect(source.descriptor_id).toBeNull();
    });

    it("rejects an ambiguous imported descriptor code instead of choosing unpredictably", () => {
        const result = validateAndResolve([makeDraft({ descriptor_code: "DES-01" })], 11, {
            weightMode: "fixed_all",
            descriptors: [
                makeDescriptor({ id: 37, code: "DES-01" }),
                makeDescriptor({ id: 38, code: "dés-01" }),
            ],
        });

        expect(result.items).toEqual([]);
        expect(result.errors).toContainEqual({
            row: 1,
            field: "descriptor_code",
            message: 'Mais de um descritor usa o código "DES-01". Selecione o descritor manualmente.',
        });
    });

    it("preserves an explicitly selected descriptor even when its code is duplicated", () => {
        const result = validateAndResolve(
            [makeDraft({ descriptor_code: "DES-01", descriptor_id: 37 })],
            11,
            {
                weightMode: "fixed_all",
                descriptors: [
                    makeDescriptor({ id: 37, code: "DES-01" }),
                    makeDescriptor({ id: 38, code: "dés-01" }),
                ],
            },
        );

        expect(result.errors).toEqual([]);
        expect(result.items[0]).toMatchObject({ descriptor_id: 37 });
    });

    it("uses safe defaults for fixed_all", () => {
        const result = validateAndResolve([makeDraft()], 11, {
            weightMode: "fixed_all",
            descriptors: [],
        });

        expect(result.items[0]).toMatchObject({ skill_level: "basico", weight: 1 });
    });

    it("requires a positive finite weight in per_question mode", () => {
        const missing = validateAndResolve([makeDraft()], 11, {
            weightMode: "per_question",
            descriptors: [],
        });
        const nonFinite = validateAndResolve([makeDraft({ weight: Number.POSITIVE_INFINITY })], 11, {
            weightMode: "per_question",
            descriptors: [],
        });

        expect(missing.items).toEqual([]);
        expect(missing.errors).toContainEqual({
            row: 1,
            field: "weight",
            message: "Peso é obrigatório.",
        });
        expect(nonFinite.items).toEqual([]);
        expect(nonFinite.errors).toContainEqual({
            row: 1,
            field: "weight",
            message: "Peso deve ser um número finito maior que zero.",
        });
    });

    it("requires skill level and defaults weight in by_skill mode", () => {
        const missingSkill = validateAndResolve([makeDraft()], 11, {
            weightMode: "by_skill",
            descriptors: [],
        });
        const valid = validateAndResolve([makeDraft({ skill_level: "adequado" })], 11, {
            weightMode: "by_skill",
            descriptors: [],
        });

        expect(missingSkill.items).toEqual([]);
        expect(missingSkill.errors.some((error) => error.field === "skill_level")).toBe(true);
        expect(valid.errors).toEqual([]);
        expect(valid.items[0]).toMatchObject({ skill_level: "adequado", weight: 1 });
    });

    it("reports invalid row fields without producing an item", () => {
        const result = validateAndResolve(
            [
                makeDraft({
                    display_order: 0,
                    text: " ",
                    correct_option: null,
                    descriptor_code: "INEXISTENTE",
                    descriptor_id: 0,
                }),
            ],
            11,
            { weightMode: "fixed_all", descriptors: [] },
        );

        expect(result.items).toEqual([]);
        expect(result.errors.map((error) => error.field)).toEqual([
            "display_order",
            "text",
            "correct_option",
            "descriptor_id",
        ]);
    });

    it("reports a descriptor code that is not present in the visible catalog", () => {
        const result = validateAndResolve(
            [makeDraft({ descriptor_code: "INEXISTENTE" })],
            11,
            { weightMode: "fixed_all", descriptors: [] },
        );

        expect(result.items).toEqual([]);
        expect(result.errors).toContainEqual({
            row: 1,
            field: "descriptor_code",
            message: 'Descritor com código "INEXISTENTE" não encontrado.',
        });
    });

    it("rejects a batch above 500 rows before producing a payload", () => {
        const drafts = Array.from({ length: 501 }, (_, index) =>
            makeDraft({ text: `Questão ${index + 1}` }),
        );

        const result = validateAndResolve(drafts, 11, {
            weightMode: "fixed_all",
            descriptors: [],
        });

        expect(result.items).toEqual([]);
        expect(result.errors).toEqual([
            {
                row: 501,
                field: "row",
                message: "O lote aceita no máximo 500 questões.",
            },
        ]);
    });

    it("allows exactly 500 valid rows", () => {
        const drafts = Array.from({ length: 500 }, (_, index) =>
            makeDraft({ text: `Questão ${index + 1}` }),
        );

        const result = validateAndResolve(drafts, 11, {
            weightMode: "fixed_all",
            descriptors: [],
        });

        expect(result.errors).toEqual([]);
        expect(result.items).toHaveLength(500);
    });

    it("includes a valid optional display order in the payload", () => {
        const result = validateAndResolve([makeDraft({ display_order: 3 })], 11, {
            weightMode: "fixed_all",
            descriptors: undefined,
        });

        expect(result.errors).toEqual([]);
        expect(result.items[0]).toMatchObject({ display_order: 3 });
    });
});

describe("readFileAsArrayBuffer", () => {
    it("delegates to the browser File API", async () => {
        const expected = new ArrayBuffer(2);
        const file = { arrayBuffer: async () => expected } as File;

        await expect(readFileAsArrayBuffer(file)).resolves.toBe(expected);
    });
});
