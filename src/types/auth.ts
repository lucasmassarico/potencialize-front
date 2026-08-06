export type AuthMode = "bearer" | "cookie";

export type Role = "admin" | "coordinator" | "teacher";

export interface LoginBody {
    email: string;
    password: string;
}

export interface AuthUser {
    role: Role;
    teacher_id?: number;
}

export type SessionResponse = AuthUser;

export interface BearerLoginResponse extends AuthUser {
    access_token: string;
    refresh_token: string;
}

export type LoginResponse = SessionResponse | BearerLoginResponse;

export interface BearerRefreshResponse {
    access_token: string;
}

export type RefreshResponse = SessionResponse | BearerRefreshResponse;

export function normalizeAuthMode(value: unknown): AuthMode {
    return value === "bearer" ? "bearer" : "cookie";
}
