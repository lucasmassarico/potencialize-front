// Leitor simples de cookie por nome
export function readCookie(name: string): string | null {
    const match = document.cookie.match(
        new RegExp(
            "(^|; )" +
                name.replace(/([.$?*|{}()\[\]\\\/\+^])/g, "\\$1") +
                "=([^;]*)"
        )
    );
    return match ? decodeURIComponent(match[2]) : null;
}

export function getCsrfToken(
    type: "access" | "refresh" = "access"
): string | null {
    const name = type === "access" ? "csrf_access_token" : "csrf_refresh_token";
    return readCookie(name);
}
