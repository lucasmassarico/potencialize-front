import { useQuery } from "@tanstack/react-query";
import { listTeachers } from "../api/teachers";

export function useTeacherSearch(query: string, page = 1, perPage = 20) {
    return useQuery({
        queryKey: ["teachers", { q: query, page, perPage }],
        queryFn: () =>
            listTeachers({
                q: query || undefined,
                page,
                per_page: perPage,
                role: "teacher",
                sort: "name,-created_at",
            }),
        staleTime: 60_000,
        enabled: query.length === 0 || query.length >= 2, // carrega lista inicial e busca com 2+ chars
    });
}
