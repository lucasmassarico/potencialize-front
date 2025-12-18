import { Tabs, Tab, Box, Skeleton } from "@mui/material";
import { Link, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAssessment } from "../../../api/assessments";

export default function AssessmentSubnav() {
    const { pathname } = useLocation();
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const base = `/assessments/${assessmentId}`;

    // Qual aba selecionar pelo pathname
    const rawValue = pathname.endsWith("/matrix")
        ? "matrix"
        : pathname.endsWith("/weights")
        ? "weights"
        : pathname.endsWith("/questions")
        ? "questions"
        : pathname.endsWith("/grading-policy")
        ? "grading-policy"
        : "overview";

    // Buscamos só o necessário pra decidir se mostramos "weights"
    const { data, isLoading } = useQuery({
        queryKey: ["assessmentHead", assessmentId],
        queryFn: () => getAssessment(Number(assessmentId), "id,weight_mode"),
        enabled: !!assessmentId,
        staleTime: 60_000,
    });

    const isBySkill = data?.weight_mode === "by_skill";

    // Se não for by_skill e a URL estiver em /weights, marcamos "overview"
    const value = isBySkill ? rawValue : rawValue === "weights" ? "overview" : rawValue;

    return (
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            {isLoading ? (
                <Box sx={{ p: 1 }}>
                    <Skeleton width={360} height={36} />
                </Box>
            ) : (
                <Tabs value={value}>
                    <Tab value="overview" label="Visão Geral" component={Link} to={base} />
                    <Tab value="matrix" label="Matriz" component={Link} to={`${base}/matrix`} />
                    <Tab value="questions" label="Questões" component={Link} to={`${base}/questions`} />
                    {isBySkill && <Tab value="weights" label="Pesos por nível" component={Link} to={`${base}/weights`} />}

                    {/* NOVA ABA: Classificação (sempre visível) */}
                    <Tab value="grading-policy" label="Classificação" component={Link} to={`${base}/grading-policy`} />
                </Tabs>
            )}
        </Box>
    );
}
