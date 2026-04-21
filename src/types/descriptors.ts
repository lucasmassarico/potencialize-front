export type TeacherDescriptorScope = "visible" | "mine";
export type AdminDescriptorScope = "all" | "global" | "mine" | "by_teacher";
export type DescriptorScope = TeacherDescriptorScope | AdminDescriptorScope;

export interface DescriptorOut {
    id: number;
    code: string;
    title: string;
    description?: string;
    area?: string;
    grade_year?: number;
    owner_teacher_id?: number | null;
}

export interface DescriptorCreate {
    code: string;
    title: string;
    description?: string;
    area?: string;
    grade_year?: number;
}

export interface DescriptorUpdate extends DescriptorCreate {}

export interface DescriptorList {
    items: DescriptorOut[];
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}
