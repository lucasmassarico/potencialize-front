import { describe, expect, it } from "vitest";

import {
    MAX_BULK_IMPORT_FILE_BYTES,
    MAX_BULK_IMPORT_ROWS,
    validateBulkImportFile,
    validateBulkImportRowCount,
    validateBulkPastedText,
} from "./bulkImportGuards";

function fileLike(overrides: Partial<Pick<File, "name" | "size" | "type">> = {}) {
    return {
        name: "questoes.xlsx",
        size: 1024,
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ...overrides,
    };
}

describe("bulk import guards", () => {
    it("accepts supported spreadsheet and CSV files", () => {
        expect(validateBulkImportFile(fileLike())).toBeNull();
        expect(
            validateBulkImportFile(
                fileLike({ name: "questoes.csv", type: "text/csv" }),
            ),
        ).toBeNull();
        expect(
            validateBulkImportFile(
                fileLike({ name: "questoes.xls", type: "application/vnd.ms-excel" }),
            ),
        ).toBeNull();
    });

    it("accepts an empty MIME type when the extension is supported", () => {
        expect(
            validateBulkImportFile(fileLike({ name: "questoes.csv", type: "" })),
        ).toBeNull();
    });

    it("rejects unsupported extensions even when MIME is generic", () => {
        expect(
            validateBulkImportFile(
                fileLike({ name: "questoes.txt", type: "application/octet-stream" }),
            ),
        ).toContain(".xlsx, .xls ou .csv");
    });

    it("rejects files above the configured size limit", () => {
        expect(
            validateBulkImportFile(
                fileLike({ size: MAX_BULK_IMPORT_FILE_BYTES + 1 }),
            ),
        ).toContain("5 MB");
    });

    it("rejects empty or excessive row counts", () => {
        expect(validateBulkImportRowCount(0)).toContain("nenhuma linha");
        expect(validateBulkImportRowCount(MAX_BULK_IMPORT_ROWS)).toBeNull();
        expect(validateBulkImportRowCount(MAX_BULK_IMPORT_ROWS + 1)).toContain(
            String(MAX_BULK_IMPORT_ROWS),
        );
    });

    it("rejects empty or excessively large pasted content", () => {
        expect(validateBulkPastedText("   ")).toContain("Cole o conteúdo");
        expect(validateBulkPastedText("Enunciado;Alternativa correta\nQuestão;A")).toBeNull();
        expect(validateBulkPastedText("x".repeat(2_000_001))).toContain("2 MB");
    });
});
