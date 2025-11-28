import api from "./http";
import type {
    ClassOut,
    ClassCreate,
    ClassUpdatePayload,
} from "../types/classes";

export async function listClasses(xFields?: string) {
    const headers: Record<string, string> = {};
    if (xFields) headers["X-Fields"] = xFields;
    const { data } = await api.get<ClassOut[]>("/classes/", { headers });
    return data;
}

export async function createClass(payload: ClassCreate) {
    const { data } = await api.post<ClassOut>("/classes/", payload);
    return data;
}

export async function getClass(id: number, xFields?: string) {
    const headers: Record<string, string> = {};
    if (xFields) headers["X-Fields"] = xFields;
    const { data } = await api.get<ClassOut>(`/classes/${id}`, { headers });
    return data;
}

export async function updateClass(id: number, payload: ClassUpdatePayload) {
    const { data } = await api.put<ClassOut>(`/classes/${id}`, payload);
    return data;
}

export async function deleteClass(id: number) {
    await api.delete(`/classes/${id}`);
}
