import api from "./http";
import type { LoginBody, LoginResponse, RefreshResponse } from "../types/auth";

export async function login(body: LoginBody) {
    const { data } = await api.post<LoginResponse>("/auth/login", body);
    return data;
}

export async function logout() {
    const { data } = await api.post<{ msg: string }>("/auth/logout", {});
    return data;
}

export async function refresh() {
    const { data } = await api.post<RefreshResponse>("/auth/refresh", {});
    return data;
}

export async function logoutRefresh() {
    try {
        await api.post("/auth/logout-refresh", {});
    } catch (_) {
        // ignora em DEV
    }
}
