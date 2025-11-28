// src/lib/tokenStorage.ts
const REFRESH_KEY = "potencialize_refresh_token";
let inMemoryAccess: string | null = null; // mais seguro do que persistir access

export function setAccessToken(token: string | null) {
    inMemoryAccess = token;
}
export function getAccessToken(): string | null {
    return inMemoryAccess;
}
export function setRefreshToken(token: string | null) {
    if (!token) {
        localStorage.removeItem(REFRESH_KEY);
    } else {
        localStorage.setItem(REFRESH_KEY, token);
    }
}
export function getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_KEY);
}
export function clearTokens() {
    inMemoryAccess = null;
    localStorage.removeItem(REFRESH_KEY);
}
