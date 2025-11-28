import api from "./http";
import type { Paginated, TeacherOut } from "../types/teachers";

export interface ListTeachersParams {
    page?: number;
    per_page?: number;
    q?: string;
    role?: "teacher" | "coordinator" | "admin";
    sort?: string; // e.g. 'name,-created_at'
}

export async function listTeachers(params: ListTeachersParams = {}) {
    const { data } = await api.get<Paginated<TeacherOut>>("/teachers/", {
        params,
    });
    return data;
}
