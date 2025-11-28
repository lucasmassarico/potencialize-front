export interface TeacherRef {
    id: number;
    name: string;
}
export interface StudentRef {
    id: number;
    name: string;
}
export interface AssessmentRef {
    id: number;
    title: string;
}

export interface ClassOut {
    id: number;
    name: string;
    year: number;
    teacher: TeacherRef;
    students?: StudentRef[];
    assessments?: AssessmentRef[];
}

export interface ClassCreate {
    name: string;
    year: number;
    teacher_id?: number; // oculto para professores (backend usa id do token)
}

export interface ClassUpdatePayload {
    name?: string;
    year?: number;
    teacher_id?: number;
}
