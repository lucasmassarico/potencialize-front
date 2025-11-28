// src/lib/error.ts
import axios, { AxiosError } from "axios";
import { messageFor } from "./apiErrors";

export type NormalizedError = {
    status?: number;
    message: string;
    details?: unknown;
};

export function normalizeAxiosError(err: unknown): NormalizedError {
    if (!axios.isAxiosError(err)) {
        const msg = (err as any)?.message ?? "Ocorreu um erro inesperado. Tente novamente.";
        return { message: msg };
    }

    const e = err as AxiosError<any>;
    const status = e.response?.status;
    const data = e.response?.data;

    // extrai serverMsg (igual ao que você já faz)
    let serverMsg: string | undefined;
    if (typeof data === "string") serverMsg = data;
    else if (data && typeof data === "object") {
        serverMsg = data.message ?? data.msg ?? data.detail ?? (typeof data.error === "string" ? data.error : undefined);
    }
    const details = (data && (data.details ?? data.errors ?? data)) ?? undefined;

    if (!status) {
        if (e.code === "ECONNABORTED") return { message: "Tempo de requisição esgotado. Tente novamente." };
        return { message: "Falha de rede. Verifique sua conexão e tente novamente." };
    }

    const friendly = messageFor(e.config?.method, e.config?.url, status, serverMsg);
    return { status, message: friendly, details };
}
