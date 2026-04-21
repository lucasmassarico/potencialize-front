import { useQuery } from "@tanstack/react-query";
import { listDescriptors } from "../api/descriptors";
import type { DescriptorOut } from "../types/descriptors";

export function useAllDescriptors() {
    return useQuery({
        queryKey: ["descriptors", "all"],
        queryFn: async () => {
            const data = await listDescriptors({
                page: 1,
                per_page: 500,
                sort: "code",
            });
            return data.items as DescriptorOut[];
        },
        staleTime: 5 * 60_000,
    });
}
