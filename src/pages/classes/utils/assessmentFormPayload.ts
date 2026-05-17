import type { AssessmentCreate, SubjectKind, WeightMode } from "../../../types/assessments";

export interface AssessmentFormPayloadValues {
    title: string;
    date: string;
    weight_mode: WeightMode;
    subject_kind: SubjectKind;
    subject_other?: string;
}

export function buildAssessmentPayload(values: AssessmentFormPayloadValues, classId: number): AssessmentCreate {
    const payload: AssessmentCreate = {
        title: values.title,
        date: values.date,
        weight_mode: values.weight_mode,
        class_id: classId,
        subject_kind: values.subject_kind,
    };

    if (values.subject_kind !== "outro") return payload;

    return {
        ...payload,
        subject_other: (values.subject_other ?? "").trim(),
    };
}
