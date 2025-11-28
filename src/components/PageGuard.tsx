import type { ReactNode } from "react";
import { Card, CardContent } from "@mui/material";
import NotFound from "./states/NotFound";
import ErrorState from "./states/ErrorState";
import { normalizeAxiosError } from "../lib/error";

type PageGuardProps<T> = {
    isLoading: boolean;
    error?: unknown;
    data?: T | null | undefined;
    skeleton?: ReactNode;
    resourceName?: string; // ex.: "Turma"
    onRetry?: () => void;
    /**
     * Regras extras para considerar "not found".
     * Por padrão, 404 do backend já fica como NotFound.
     */
    notFoundWhen?: (args: { data: T | null | undefined; error?: unknown }) => boolean;
    children: ReactNode;
};

export default function PageGuard<T>({ isLoading, error, data, skeleton, resourceName, onRetry, notFoundWhen, children }: PageGuardProps<T>) {
    if (isLoading) return <>{skeleton ?? null}</>;

    if (error) {
        const { status, message } = normalizeAxiosError(error);
        // Se o backend retornou 404, trata como NotFound
        if (status === 404) {
            return (
                <Card>
                    <CardContent>
                        <NotFound resourceName={"resourceName"} details={message} ctaHref="/classes" ctaLabel="Ver todas as turmas" />
                    </CardContent>
                </Card>
            );
        }
        return (
            <Card>
                <CardContent>
                    <ErrorState titleOverride={status === 401 ? "Sessão expirada" : undefined} errorMessage={message} onRetry={onRetry} />
                </CardContent>
            </Card>
        );
    }

    if (notFoundWhen?.({ data, error }) || !data) {
        return (
            <Card>
                <CardContent>
                    <NotFound resourceName={resourceName} ctaHref="/classes" ctaLabel="Ver todas as turmas" />
                </CardContent>
            </Card>
        );
    }

    return <>{children}</>;
}
