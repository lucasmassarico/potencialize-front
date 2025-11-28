export interface StudentOut {
    id: number;
    name: string;
    register_code: string;
    class_id: number;
}

export interface StudentCreate {
    name: string;
    register_code?: string;
    class_id: number;
}

export type StudentUpdatePayload = Partial<StudentCreate>;

export interface StudentList {
    items: StudentOut[];
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
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
