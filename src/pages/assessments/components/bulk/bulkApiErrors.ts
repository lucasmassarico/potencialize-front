import type {
    BulkRowDraft,
    BulkRowError,
} from "../../../../lib/questionsBulk/parse";

interface BulkSubmissionError {
    message: string;
    rowErrors: BulkRowError[];
}
type ApiErrorData = {
    message?: unknown;
    errors?: unknown;
    details?: unknown;
};

const FALLBACK_MESSAGE = "Não foi possível importar as questões. Tente novamente.";
const VALIDATION_MESSAGE = "Algumas questões precisam ser corrigidas.";

const FIELD_NAMES = new Set<keyof BulkRowDraft>([
    "display_order",
    "text",
    "skill_level",
    "weight",
    "correct_option",
    "descriptor_code",
    "descriptor_id",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fieldMessage(field: keyof BulkRowDraft | "row"): string {
    switch (field) {
        case "descriptor_id":
        case "descriptor_code":
            return "Selecione um descritor válido ou deixe o campo vazio.";
        case "text":
            return "Verifique o enunciado desta questão.";
        case "weight":
            return "Informe um peso maior que zero.";
        case "skill_level":
            return "Selecione um nível válido.";
        case "correct_option":
            return "Selecione a alternativa correta entre A e E.";
        case "display_order":
            return "Informe um número de questão inteiro e maior que zero.";
        default:
            return "Verifique os dados desta linha.";
    }
}

function normalizeField(value: unknown): keyof BulkRowDraft | "row" {
    return typeof value === "string" && FIELD_NAMES.has(value as keyof BulkRowDraft)
        ? (value as keyof BulkRowDraft)
        : "row";
}

function locationFromPath(path: string): { row: number; field: keyof BulkRowDraft | "row" } | null {
    const match = path.match(/items(?:\.|\[)(\d+)\]?(?:\.|\[)([a-z_]+)\]?/i);
    if (!match) return null;
    return {
        row: Number(match[1]) + 1,
        field: normalizeField(match[2]),
    };
}

function locationFromArray(location: unknown): { row: number; field: keyof BulkRowDraft | "row" } | null {
    if (!Array.isArray(location)) return null;
    const itemsIndex = location.indexOf("items");
    const rowIndex = location[itemsIndex + 1];
    if (itemsIndex < 0 || typeof rowIndex !== "number") return null;
    return {
        row: rowIndex + 1,
        field: normalizeField(location[itemsIndex + 2]),
    };
}

function pushUnique(target: BulkRowError[], error: BulkRowError) {
    const exists = target.some(
        (item) => item.row === error.row && item.field === error.field,
    );
    if (!exists) target.push(error);
}

function parseRowErrors(errors: unknown): BulkRowError[] {
    const rowErrors: BulkRowError[] = [];

    if (isRecord(errors)) {
        Object.keys(errors).forEach((path) => {
            const location = locationFromPath(path);
            if (!location) return;
            pushUnique(rowErrors, {
                ...location,
                message: fieldMessage(location.field),
            });
        });
    }

    if (Array.isArray(errors)) {
        errors.forEach((entry) => {
            if (!isRecord(entry)) return;
            const location = locationFromArray(entry.loc);
            if (!location) return;
            pushUnique(rowErrors, {
                ...location,
                message: fieldMessage(location.field),
            });
        });
    }

    return rowErrors;
}

function safeServerMessage(value: unknown): string | null {
    if (typeof value !== "string") return null;
    const message = value.trim();
    if (!message || /input payload validation failed|validation error/i.test(message)) {
        return null;
    }
    return message;
}

export function parseBulkSubmissionError(error: unknown): BulkSubmissionError {
    if (!isRecord(error) || !isRecord(error.response)) {
        return { message: FALLBACK_MESSAGE, rowErrors: [] };
    }

    const data = isRecord(error.response.data)
        ? (error.response.data as ApiErrorData)
        : {};
    const rowErrors = parseRowErrors(data.errors ?? data.details);

    if (rowErrors.length > 0) {
        return { message: VALIDATION_MESSAGE, rowErrors };
    }

    return {
        message: safeServerMessage(data.message) ?? FALLBACK_MESSAGE,
        rowErrors: [],
    };
}
