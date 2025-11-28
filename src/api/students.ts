import api from "./http";
import type {
    StudentList,
    StudentOut,
    StudentCreate,
    StudentUpdatePayload,
} from "../types/students";

export interface ListStudentsParams {
    page?: number;
    per_page?: number;
    class_id?: number;
    name?: string;
    register_code?: string;
    sort?: string; // ex.: "name,-created_at"
}

export interface StudentBulkItem {
    name: string;
    register_code?: string;
    class_id?: number;
}

export interface StudentBulkRequest {
    class_id?: number;
    items: StudentBulkItem[];
}

export async function listStudents(params: ListStudentsParams) {
    const { data } = await api.get<StudentList>("/students/", { params });
    return data;
}

export async function getStudent(id: number) {
    const { data } = await api.get<StudentOut>(`/students/${id}`);
    return data;
}

export async function createStudent(payload: StudentCreate) {
    const { data } = await api.post<StudentOut>("/students/", payload);
    return data;
}

export async function updateStudent(id: number, payload: StudentUpdatePayload) {
    const { data } = await api.put<StudentOut>(`/students/${id}`, payload);
    return data;
}

export async function deleteStudent(id: number) {
    await api.delete(`/students/${id}`);
}

// + busca “fetch all” (paginando no backend, agregando no front)
export async function listAllStudentsByClass(class_id: number, per_page = 100) {
    let page = 1;
    const acc: StudentOut[] = [];
    // nota: se a turma tiver muitos alunos, ajuste per_page conforme necessário
    // para reduzir numero de requisições.
    // mantém a ordenação por nome/-created_at p/ previsibilidade
    for (;;) {
        const pageData = await listStudents({
            class_id,
            page,
            per_page,
            sort: "name,-created_at",
        });
        acc.push(...pageData.items);
        if (page >= pageData.total_pages || pageData.items.length === 0) break;
        page += 1;
    }
    return acc;
}

// + bulk create
export async function bulkCreateStudents(payload: StudentBulkRequest) {
    const { data } = await api.post("/students/bulk", payload);
    return data;
}
