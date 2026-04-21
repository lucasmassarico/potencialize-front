import api from "./http";
import type {
    DescriptorCreate,
    DescriptorList,
    DescriptorOut,
    DescriptorScope,
    DescriptorUpdate,
} from "../types/descriptors";

export interface ListDescriptorsParams {
    page?: number;
    per_page?: number;
    sort?: string;
    code?: string;
    title?: string;
    area?: string;
    grade_year?: number;
    q?: string;
    scope?: DescriptorScope;
    by_teacher_id?: number;
}

export async function listDescriptors(params: ListDescriptorsParams = {}) {
    const { data } = await api.get<DescriptorList>("/descriptors/", { params });
    return data;
}

export async function getDescriptor(id: number) {
    const { data } = await api.get<DescriptorOut>(`/descriptors/${id}`);
    return data;
}

export async function createDescriptor(payload: DescriptorCreate) {
    const { data } = await api.post<DescriptorOut>("/descriptors/", payload);
    return data;
}

export async function updateDescriptor(id: number, payload: DescriptorUpdate) {
    const { data } = await api.put<DescriptorOut>(`/descriptors/${id}`, payload);
    return data;
}

export async function deleteDescriptor(id: number) {
    await api.delete(`/descriptors/${id}`);
}
