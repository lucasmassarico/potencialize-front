import { describe, expect, it } from "vitest";

import { buildAssessmentPayload } from "./assessmentFormPayload";

describe("assessment form payload", () => {
    it("omits subject_other when the subject is not Outro", () => {
        expect(
            buildAssessmentPayload(
                {
                    title: "Diagnostica",
                    date: "2026-05-16",
                    weight_mode: "fixed_all",
                    subject_kind: "geral",
                    subject_other: "",
                },
                3,
            ),
        ).toEqual({
            title: "Diagnostica",
            date: "2026-05-16",
            weight_mode: "fixed_all",
            class_id: 3,
            subject_kind: "geral",
        });
    });

    it("trims and sends subject_other when the subject is Outro", () => {
        expect(
            buildAssessmentPayload(
                {
                    title: "Diagnostica",
                    date: "2026-05-16",
                    weight_mode: "by_skill",
                    subject_kind: "outro",
                    subject_other: "  Robotica Educacional  ",
                },
                9,
            ),
        ).toEqual({
            title: "Diagnostica",
            date: "2026-05-16",
            weight_mode: "by_skill",
            class_id: 9,
            subject_kind: "outro",
            subject_other: "Robotica Educacional",
        });
    });
});
