//src/pages/assessments/components/AssessMentSubnav.tsx
import { Tabs, Tab, Box, Skeleton } from "@mui/material";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAssessment } from "../../../api/assessments";

export default function AssessmentSubnav() {
    const { pathname } = useLocation();
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const base = `/assessments/${assessmentId}`;

    const value = pathname.endsWith("/matrix")
        ? "matrix"
        : pathname.endsWith("/weights")
        ? "weights"
        : pathname.endsWith("/questions")
        ? "questions"
        : "overview";

    // Pega só o necessário pra decidir se mostra a aba
    const { data, isLoading } = useQuery({
        queryKey: ["assessmentHead", assessmentId],
        queryFn: () => getAssessment(Number(assessmentId), "id,weight_mode"),
        enabled: !!assessmentId,
        staleTime: 60_000,
    });

    const isBySkill = data?.weight_mode === "by_skill";

    return (
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            {isLoading ? (
                <Box sx={{ p: 1 }}>
                    <Skeleton width={280} height={36} />
                </Box>
            ) : (
                <Tabs value={isBySkill ? value : value === "weights" ? "overview" : value}>
                    <Tab value="overview" label="Overview" component={Link} to={base} />
                    <Tab value="matrix" label="Matriz" component={Link} to={`${base}/matrix`} />
                    <Tab value="questions" label="Questões" component={Link} to={`${base}/questions`} />
                    {/* Oculta completamente quando não for by_skill */}
                    {isBySkill && <Tab value="weights" label="Pesos por nível" component={Link} to={`${base}/weights`} />}
                </Tabs>
            )}
        </Box>
    );
}
