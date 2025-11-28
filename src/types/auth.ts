export type Role = "admin" | "teacher";

export interface LoginBody {
    email: string;
    password: string;
}

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    role: Role;
    teacher_id?: number;
}

export interface RefreshResponse {
    access_token: string;
}
