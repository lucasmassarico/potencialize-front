import { Navigate, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAssessment } from "../../api/assessments";
import CenteredLoader from "../../components/CenteredLoader";

export default function LegacyAssessmentRedirect() {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const { pathname } = useLocation();

    const { data, isLoading, isError } = useQuery({
        queryKey: ["assessment", assessmentId, "redirect"],
        queryFn: () => getAssessment(Number(assessmentId), "id,class_id"),
        enabled: !!assessmentId,
        staleTime: 60_000,
    });

    if (isLoading) return <CenteredLoader label="Redirecionando..." />;
    if (isError || !data?.class_id) return <Navigate to="/" replace />;

    const prefix = `/assessments/${assessmentId}`;
    const extra = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";
    const target = `/classes/${data.class_id}/assessments/${assessmentId}${extra}`;
    return <Navigate to={target} replace />;
}
