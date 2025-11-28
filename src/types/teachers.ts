export interface TeacherOut {
    id: number;
    name: string;
    email: string;
    role: "teacher" | "coordinator" | "admin";
}

export interface Paginated<T> {
    items: T[];
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}
