//src/api/assessments.ts
import api from "./http";
import type {
    AssessmentOut,
    AssessmentCreate,
    AssessmentUpdate,
    AssessmentMatrixDTO,
    AssessmentOverviewDTO,
    AssessmentSkillWeightsIn,
    AssessmentSkillWeightsOut,
    AssessmentGradingPolicyIn,
    AssessmentGradingPolicyOut,
} from "../types/assessments";

export async function listAssessments(xFields?: string) {
    const headers: Record<string, string> = {};
    if (xFields) headers["X-Fields"] = xFields;
    const { data } = await api.get<AssessmentOut[]>("/assessments/", {
        headers,
    });
    return data;
}

export async function getAssessment(id: number, xFields?: string) {
    const headers: Record<string, string> = {};
    if (xFields) headers["X-Fields"] = xFields;
    const { data } = await api.get<AssessmentOut>(`/assessments/${id}`, {
        headers,
    });
    return data;
}

export async function createAssessment(payload: AssessmentCreate) {
    const { data } = await api.post<AssessmentOut>("/assessments/", payload);
    return data;
}

export async function updateAssessment(id: number, payload: AssessmentUpdate) {
    const { data } = await api.put<AssessmentOut>(`/assessments/${id}`, payload);
    return data;
}

export async function deleteAssessment(id: number) {
    await api.delete(`/assessments/${id}`);
}

// Overview

export async function getAssessmentOverview(id: number, xfields?: string) {
    const res = await api.get<AssessmentOverviewDTO>(`/assessments/${id}/analytics/overview`, { headers: xfields ? { "X-Fields": xfields } : undefined });
    return res.data;
}

// Matriz

export async function getAssessmentMatrix(id: number, params: { students_page?: number; per_page?: number } = {}) {
    const res = await api.get<AssessmentMatrixDTO>(`/assessments/${id}/analytics/matrix`, { params });
    return res.data;
}

// Pesos

export async function getAssessmentSkillWeights(id: number) {
    const res = await api.get<AssessmentSkillWeightsOut>(`/assessments/${id}/skills-weights`);
    return res.data;
}

export async function putAssessmentSkillWeights(id: number, payload: AssessmentSkillWeightsIn) {
    const res = await api.put<AssessmentSkillWeightsOut>(`/assessments/${id}/skills-weights`, payload);
    return res.data;
}

export async function getAssessmentGradingPolicy(assessmentId: number, xFields?: string) {
    const headers: Record<string, string> = {};
    if (xFields) headers["X-Fields"] = xFields;
    const { data } = await api.get<AssessmentGradingPolicyOut>(`/assessments/${assessmentId}/grading-policy`, { headers });
    return data;
}

export async function putAssessmentGradingPolicy(assessmentId: number, payload: AssessmentGradingPolicyIn, xFields?: string) {
    const headers: Record<string, string> = {};
    if (xFields) headers["X-Fields"] = xFields;
    const { data } = await api.put<AssessmentGradingPolicyOut>(`/assessments/${assessmentId}/grading-policy`, payload, { headers });
    return data;
}
