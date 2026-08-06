// src/api/questions.ts
import api from "./http";
import type {
    BulkQuestionCreate,
    Option,
    QuestionCreate,
    QuestionCreateInput,
    QuestionList,
    QuestionOut,
    QuestionUpdate,
    SkillLevel,
} from "../types/questions";

type ListParams = {
    page?: number;
    per_page?: number;
    assessment_id?: number;
    skill_level?: SkillLevel;
    correct_option?: Option;
    descriptor_id?: number;
    sort?: string; // ex.: "id,-text"
};

export async function listQuestions(params: ListParams) {
    const res = await api.get<QuestionList>("/questions/", { params });
    return res.data;
}

export async function getQuestion(id: number) {
    const res = await api.get<QuestionOut>(`/questions/${id}`);
    return res.data;
}

export function toQuestionCreatePayload(input: QuestionCreateInput): QuestionCreate {
    const { descriptor_id: descriptorId, display_order: displayOrder, ...requiredFields } = input;

    return {
        ...requiredFields,
        ...(descriptorId != null ? { descriptor_id: descriptorId } : {}),
        ...(displayOrder != null ? { display_order: displayOrder } : {}),
    };
}

export async function createQuestion(input: QuestionCreateInput) {
    const res = await api.post<QuestionOut>("/questions/", toQuestionCreatePayload(input));
    return res.data;
}

export async function updateQuestion(id: number, payload: QuestionUpdate) {
    const res = await api.put<QuestionOut>(`/questions/${id}`, payload);
    return res.data;
}

export async function deleteQuestion(id: number) {
    await api.delete(`/questions/${id}`);
}

export async function bulkCreateQuestionsByAssessment(assessmentId: number, items: BulkQuestionCreate[]) {
    const res = await api.post(`/questions/bulk/${assessmentId}`, {
        items,
    });
    return res.data;
}
