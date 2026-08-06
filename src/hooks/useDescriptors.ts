import { useQuery } from "@tanstack/react-query";
import { listAllDescriptors } from "../api/descriptors";
import type { Role } from "../types/auth";
import type { DescriptorScope } from "../types/descriptors";
import { useAuth } from "./useAuth";

interface DescriptorCatalogUser {
    role: Role;
    teacher_id?: number;
}

export function getDescriptorCatalogScope(
    user: DescriptorCatalogUser | null,
): DescriptorScope {
    return user?.role === "admin" ? "all" : "visible";
}

export function getDescriptorCatalogQueryKey(
    user: DescriptorCatalogUser | null,
) {
    const scope = getDescriptorCatalogScope(user);

    return [
        "descriptors",
        "all",
        {
            role: user?.role ?? "anonymous",
            teacherId: user?.teacher_id ?? null,
            scope,
        },
    ] as const;
}

export function useAllDescriptors() {
    const { user, loading: authLoading } = useAuth();
    const scope = getDescriptorCatalogScope(user);

    return useQuery({
        queryKey: getDescriptorCatalogQueryKey(user),
        queryFn: () => listAllDescriptors({ scope }),
        enabled: !authLoading && user !== null,
        staleTime: 5 * 60_000,
    });
}
