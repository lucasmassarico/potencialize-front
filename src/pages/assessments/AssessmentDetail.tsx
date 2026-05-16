import { Outlet, useLocation, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, Chip } from "@mui/material";
import ReplayIcon from "@mui/icons-material/Replay";
import EventRoundedIcon from "@mui/icons-material/EventRounded";
import ScaleRoundedIcon from "@mui/icons-material/ScaleRounded";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";

import { getAssessment } from "../../api/assessments";
import { getClass } from "../../api/classes";
import dayjs from "../../lib/dayjs";
import { EntityHeader } from "../../components/layout/EntityHeader";
import { EntitySwitcher } from "../../components/layout/EntitySwitcher";

function weightLabel(mode?: string) {
    switch (mode) {
        case "fixed_all":
            return "Mesmo peso";
        case "by_skill":
            return "Por nível";
        case "per_question":
            return "Por questão";
        default:
            return mode ? String(mode) : "—";
    }
}

function subjectLabel(kind?: string, other?: string | null) {
    const map: Record<string, string> = {
        portugues: "Português",
        matematica: "Matemática",
        ciencias: "Ciências",
        historia: "História",
        geografia: "Geografia",
        ingles: "Inglês",
        artes: "Artes",
        educacao_fisica: "Educação Física",
        tecnologia: "Tecnologia",
        redacao: "Redação",
        geral: "Geral",
        outro: "Outro",
    };
    if (!kind) return "—";
    if (kind === "outro") return other?.trim() || "Outro";
    return map[kind] ?? String(kind);
}

type AssessmentTabValue = "overview" | "matrix" | "questions" | "weights" | "grading-policy";

function tabFromPath(pathname: string): AssessmentTabValue {
    if (pathname.endsWith("/matrix")) return "matrix";
    if (pathname.endsWith("/weights")) return "weights";
    if (pathname.endsWith("/questions")) return "questions";
    if (pathname.endsWith("/grading-policy")) return "grading-policy";
    return "overview";
}

export default function AssessmentDetail() {
    const { classId: classIdParam, assessmentId } = useParams<{ classId: string; assessmentId: string }>();
    const { pathname } = useLocation();

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["assessment", assessmentId],
        queryFn: () => getAssessment(Number(assessmentId)),
        enabled: !!assessmentId,
        staleTime: 30_000,
    });

    const classId = classIdParam ?? (data?.class_id ? String(data.class_id) : undefined);

    const { data: classInfo } = useQuery({
        queryKey: ["class", classId, "with-assessments"],
        queryFn: () => getClass(Number(classId), "id,name,assessments{id,title}"),
        enabled: !!classId,
        staleTime: 60_000,
    });

    const base = `/classes/${classId}/assessments/${assessmentId}`;
    const rawTab = tabFromPath(pathname);
    const isBySkill = data?.weight_mode === "by_skill";
    const tabValue: AssessmentTabValue = !isBySkill && rawTab === "weights" ? "overview" : rawTab;

    const tabs = [
        { key: "overview", label: "Visão Geral", to: base },
        { key: "matrix", label: "Matriz", to: `${base}/matrix` },
        { key: "questions", label: "Questões", to: `${base}/questions` },
        ...(isBySkill ? [{ key: "weights", label: "Pesos por nível", to: `${base}/weights` }] : []),
        { key: "grading-policy", label: "Classificação", to: `${base}/grading-policy` },
    ];

    const switcherItems = (classInfo?.assessments ?? []).map((a) => ({
        id: a.id,
        label: a.title,
        to: `/classes/${classId}/assessments/${a.id}`,
    }));

    const title = data?.title ?? "Avaliação";
    const className = classInfo?.name ?? `Turma #${classId ?? "—"}`;

    return (
        <Box sx={{ display: "grid", gap: 3 }}>
            <EntityHeader
                eyebrow="Avaliação"
                crumbs={[
                    { label: "Turmas", to: "/classes" },
                    { label: className, to: classId ? `/classes/${classId}` : undefined },
                    { label: title },
                ]}
                title={title}
                isLoading={isLoading}
                switcher={
                    classInfo && classInfo.assessments && classInfo.assessments.length > 1 ? (
                        <EntitySwitcher
                            label="Avaliações desta turma"
                            items={switcherItems}
                            currentId={Number(assessmentId)}
                            placeholder="Buscar avaliação…"
                            ariaLabel="Trocar de avaliação"
                        />
                    ) : null
                }
                meta={
                    data && (
                        <>
                            <Chip
                                size="small"
                                variant="outlined"
                                icon={<MenuBookOutlinedIcon />}
                                label={`Disciplina: ${subjectLabel(data.subject_kind, data.subject_other)}`}
                            />
                            <Chip
                                size="small"
                                variant="outlined"
                                icon={<EventRoundedIcon />}
                                label={data.date ? `Data: ${dayjs(data.date).format("DD/MM/YYYY")}` : "Data: —"}
                            />
                            <Chip
                                size="small"
                                variant="outlined"
                                icon={<ScaleRoundedIcon />}
                                label={`Pesos: ${weightLabel(data.weight_mode)}`}
                            />
                        </>
                    )
                }
                tabs={tabs}
                tabValue={tabValue}
            />

            {isError && (
                <Alert
                    severity="error"
                    action={
                        <Button size="small" startIcon={<ReplayIcon />} onClick={() => refetch()}>
                            Tentar novamente
                        </Button>
                    }
                >
                    Erro ao carregar avaliação.
                </Alert>
            )}

            <Outlet />
        </Box>
    );
}
