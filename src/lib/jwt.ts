export type JwtClaims = Record<string, any>;

function b64urlToStr(b64url: string): string {
    const pad =
        b64url.length % 4 === 2 ? "==" : b64url.length % 4 === 3 ? "=" : "";
    const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + pad;
    return atob(b64);
}

export function decodeJwt<T = JwtClaims>(token: string): T | null {
    try {
        const [, payload] = token.split(".");
        if (!payload) return null;
        const json = b64urlToStr(payload);
        return JSON.parse(json) as T;
    } catch {
        return null;
    }
}
