import { describe, expect, it } from "vitest";

import type { DescriptorOut } from "../../../types/descriptors";
import {
    buildQuestionFormPayload,
    findSelectedDescriptor,
} from "./QuestionFormDialog";

const formValues = {
    display_order: 3,
    text: "Enunciado",
    skill_level: "adequado" as const,
    weight: 2,
    correct_option: "c" as const,
};

function descriptor(id: number): DescriptorOut {
    return {
        id,
        code: `D${id}`,
        title: `Descritor ${id}`,
    };
}

describe("QuestionFormDialog descriptor safety", () => {
    it("preserves the existing descriptor in an edit payload while the catalog is unavailable", () => {
        const existingDescriptorId = 42;

        expect(findSelectedDescriptor(existingDescriptorId, undefined)).toBeNull();
        expect(
            buildQuestionFormPayload(formValues, {
                assessmentId: 11,
                descriptorId: existingDescriptorId,
                isBySkill: true,
                isEdit: true,
                isPerQuestion: true,
            }),
        ).toMatchObject({ descriptor_id: existingDescriptorId });
    });

    it("resolves the preserved descriptor when the catalog arrives", () => {
        const expected = descriptor(42);

        expect(findSelectedDescriptor(42, [descriptor(1), expected])).toBe(expected);
    });

    it("omits the optional descriptor from a descriptor-less creation", () => {
        expect(findSelectedDescriptor(null, [descriptor(1)])).toBeNull();

        const payload = buildQuestionFormPayload(
            { ...formValues, display_order: undefined },
            {
                assessmentId: 11,
                descriptorId: null,
                isBySkill: false,
                isEdit: false,
                isPerQuestion: false,
            },
        );

        expect(payload).not.toHaveProperty("descriptor_id");
        expect(payload).not.toHaveProperty("display_order");
        expect(payload).toMatchObject({ skill_level: "basico", weight: 1 });
    });

    it("sends null only when an editor explicitly clears the descriptor", () => {
        const payload = buildQuestionFormPayload(formValues, {
            assessmentId: 11,
            descriptorId: null,
            isBySkill: true,
            isEdit: true,
            isPerQuestion: true,
        });

        expect(payload).toHaveProperty("descriptor_id", null);
    });
});
