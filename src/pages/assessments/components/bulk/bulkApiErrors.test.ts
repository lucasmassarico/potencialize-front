import { describe, expect, it } from "vitest";

import { parseBulkSubmissionError } from "./bulkApiErrors";

describe("bulk API error mapping", () => {
    it("maps backend item errors to Portuguese row errors", () => {
        const result = parseBulkSubmissionError({
            response: {
                status: 400,
                data: {
                    message: "Input payload validation failed",
                    errors: {
                        "items.0.descriptor_id": "None is not of type 'integer'",
                        "items.2.text": "String should have at least 1 character",
                    },
                },
            },
        });

        expect(result.message).toBe("Algumas questões precisam ser corrigidas.");
        expect(result.rowErrors).toEqual([
            {
                row: 1,
                field: "descriptor_id",
                message: "Selecione um descritor válido ou deixe o campo vazio.",
            },
            {
                row: 3,
                field: "text",
                message: "Verifique o enunciado desta questão.",
            },
        ]);
    });

    it("handles Pydantic error arrays without leaking technical field paths", () => {
        const result = parseBulkSubmissionError({
            response: {
                status: 422,
                data: {
                    errors: [
                        {
                            loc: ["items", 1, "weight"],
                            msg: "Input should be greater than 0",
                        },
                    ],
                },
            },
        });

        expect(result.rowErrors).toEqual([
            {
                row: 2,
                field: "weight",
                message: "Informe um peso maior que zero.",
            },
        ]);
        expect(result.message).not.toContain("items");
    });

    it("preserves a safe business message when there are no field errors", () => {
        const result = parseBulkSubmissionError({
            response: {
                status: 409,
                data: {
                    message: "A numeração das questões está bloqueada porque a avaliação já possui respostas.",
                },
            },
        });

        expect(result).toEqual({
            message: "A numeração das questões está bloqueada porque a avaliação já possui respostas.",
            rowErrors: [],
        });
    });

    it("uses a friendly fallback for unknown errors", () => {
        expect(parseBulkSubmissionError(new Error("Network Error"))).toEqual({
            message: "Não foi possível importar as questões. Tente novamente.",
            rowErrors: [],
        });
    });
});
