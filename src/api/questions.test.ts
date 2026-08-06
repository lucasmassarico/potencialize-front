import { beforeEach, describe, expect, it, vi } from "vitest";

import api from "./http";
import {
    bulkCreateQuestionsByAssessment,
    createQuestion,
    deleteQuestion,
    getQuestion,
    listQuestions,
    toQuestionCreatePayload,
    updateQuestion,
} from "./questions";

vi.mock("./http", () => ({
    default: {
        delete: vi.fn(),
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    },
}));

describe("bulkCreateQuestionsByAssessment", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("posts path-scoped items without a redundant assessment_id", async () => {
        vi.mocked(api.post).mockResolvedValue({
            data: { created: 1, items: [] },
        });
        const items = [
            {
                text: "Questão de teste",
                skill_level: "basico" as const,
                weight: 1,
                correct_option: "c" as const,
            },
        ];

        const result = await bulkCreateQuestionsByAssessment(11, items);

        expect(api.post).toHaveBeenCalledWith("/questions/bulk/11", { items });
        expect(result).toEqual({ created: 1, items: [] });
    });
});

describe("question creation payload", () => {
    const requiredFields = {
        text: "Questão individual",
        skill_level: "basico" as const,
        weight: 1,
        correct_option: "a" as const,
        assessment_id: 11,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("omits null optional fields without mutating the form values", () => {
        const input = {
            ...requiredFields,
            descriptor_id: null,
            display_order: null,
        };

        const payload = toQuestionCreatePayload(input);

        expect(payload).toEqual(requiredFields);
        expect(input).toEqual({
            ...requiredFields,
            descriptor_id: null,
            display_order: null,
        });
    });

    it("keeps selected descriptor and display order", () => {
        expect(
            toQuestionCreatePayload({
                ...requiredFields,
                descriptor_id: 37,
                display_order: 4,
            }),
        ).toEqual({
            ...requiredFields,
            descriptor_id: 37,
            display_order: 4,
        });
    });

    it("sanitizes optional fields before posting an individual question", async () => {
        vi.mocked(api.post).mockResolvedValue({ data: { id: 1 } });

        await createQuestion({
            ...requiredFields,
            descriptor_id: null,
            display_order: null,
        });

        expect(api.post).toHaveBeenCalledWith("/questions/", requiredFields);
    });
});

describe("questions API", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("forwards list filters and returns the response body", async () => {
        const response = { items: [], page: 2, per_page: 20, total: 0 };
        vi.mocked(api.get).mockResolvedValue({ data: response });

        await expect(listQuestions({ page: 2, assessment_id: 11 })).resolves.toBe(response);
        expect(api.get).toHaveBeenCalledWith("/questions/", {
            params: { page: 2, assessment_id: 11 },
        });
    });

    it("gets, updates and deletes the requested question", async () => {
        const question = { id: 7, text: "Questão" };
        vi.mocked(api.get).mockResolvedValue({ data: question });
        vi.mocked(api.put).mockResolvedValue({ data: question });
        vi.mocked(api.delete).mockResolvedValue({ data: undefined });

        await expect(getQuestion(7)).resolves.toBe(question);
        await expect(updateQuestion(7, { descriptor_id: null })).resolves.toBe(question);
        await expect(deleteQuestion(7)).resolves.toBeUndefined();

        expect(api.get).toHaveBeenCalledWith("/questions/7");
        expect(api.put).toHaveBeenCalledWith("/questions/7", { descriptor_id: null });
        expect(api.delete).toHaveBeenCalledWith("/questions/7");
    });
});
