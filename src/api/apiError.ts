import { isAxiosError } from "axios";

export type ApiError = { status?: number; message?: string };

export function getApiError(err: unknown): ApiError {
    if (isAxiosError(err)) {
        const status = err.response?.status;
        const message = (err.response?.data as any)?.message || err.message || "Ocorreu um erro ao processar sua solicitação.";
        return { status, message };
    }
    const message = (err as any)?.message ?? "Erro desconhecido.";
    return { message };
}
