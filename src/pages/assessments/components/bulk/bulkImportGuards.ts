import { MAX_BULK_QUESTIONS } from "../../../../lib/questionsBulk/parse";

export const MAX_BULK_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_BULK_IMPORT_ROWS = MAX_BULK_QUESTIONS;
export const MAX_BULK_PASTE_CHARS = 2_000_000;

type BulkImportFile = Pick<File, "name" | "size" | "type">;

const ALLOWED_EXTENSIONS = new Set([".xlsx", ".xls", ".csv"]);
const ALLOWED_MIME_TYPES = new Set([
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "text/csv",
    "application/csv",
    "application/octet-stream",
]);

function fileExtension(name: string): string {
    const match = name.trim().toLowerCase().match(/\.[^.]+$/);
    return match?.[0] ?? "";
}

export function validateBulkImportFile(file: BulkImportFile): string | null {
    if (file.size <= 0) {
        return "O arquivo está vazio.";
    }

    if (file.size > MAX_BULK_IMPORT_FILE_BYTES) {
        return "O arquivo deve ter no máximo 5 MB.";
    }

    if (!ALLOWED_EXTENSIONS.has(fileExtension(file.name))) {
        return "Selecione um arquivo .xlsx, .xls ou .csv.";
    }

    const normalizedType = file.type.trim().toLowerCase();
    if (normalizedType && !ALLOWED_MIME_TYPES.has(normalizedType)) {
        return "O tipo do arquivo não é compatível com planilha ou CSV.";
    }

    return null;
}

export function validateBulkImportRowCount(rowCount: number): string | null {
    if (!Number.isInteger(rowCount) || rowCount <= 0) {
        return "Não foi possível identificar nenhuma linha no arquivo.";
    }

    if (rowCount > MAX_BULK_IMPORT_ROWS) {
        return `O arquivo possui mais de ${MAX_BULK_IMPORT_ROWS} linhas. Divida a importação em lotes menores.`;
    }

    return null;
}

export function validateBulkPastedText(raw: string): string | null {
    if (!raw.trim()) {
        return "Cole o conteúdo CSV ou TSV antes de carregar a tabela.";
    }

    if (raw.length > MAX_BULK_PASTE_CHARS) {
        return "O conteúdo colado deve ter no máximo 2 MB.";
    }

    return null;
}
