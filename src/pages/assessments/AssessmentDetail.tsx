import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Card, CardContent, Stack, Typography, Button, Chip, Alert, Skeleton, Link as MUILink } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ReplayIcon from "@mui/icons-material/Replay";
import EventIcon from "@mui/icons-material/Event";
import ClassIcon from "@mui/icons-material/Class";
import ScaleIcon from "@mui/icons-material/Scale";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";

import { getAssessment } from "../../api/assessments";
import { getClass } from "../../api/classes";
import AssessmentSubnav from "./components/AssessmentSubnav";
import ClassSubnav from "../classes/components/ClassSubnav";
import dayjs from "../../lib/dayjs";

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
function weightChipColor(mode?: string): "default" | "info" | "secondary" {
    switch (mode) {
        case "by_skill":
            return "info";
        case "per_question":
            return "secondary";
        default:
            return "default";
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

export default function AssessmentDetail() {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const nav = useNavigate();

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["assessment", assessmentId],
        queryFn: () => getAssessment(Number(assessmentId)),
        enabled: !!assessmentId,
        staleTime: 30_000,
    });

    const {
        data: classInfo,
        isLoading: loadingClass,
        isError: errorClass,
        refetch: refetchClass,
    } = useQuery({
        queryKey: ["class", data?.class_id],
        queryFn: () => getClass(Number(data?.class_id)),
        enabled: !!data?.class_id,
        staleTime: 60_000,
    });

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            {/* Card de metadados */}
            <Card>
                <CardContent>
                    {isLoading && (
                        <Stack spacing={1.5}>
                            <Skeleton width="40%" height={24} />
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Skeleton variant="rounded" width={160} height={28} />
                                <Skeleton variant="rounded" width={180} height={28} />
                                <Skeleton variant="rounded" width={160} height={28} />
                            </Stack>
                        </Stack>
                    )}

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

                    {!isLoading && !isError && data && (
                        <Stack spacing={1}>
                            <Typography variant="h5">{data.title}</Typography>

                            {/* linha de chips com infos chave */}
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip
                                    size="small"
                                    icon={<ClassIcon />}
                                    label={
                                        loadingClass ? (
                                            "Carregando turma…"
                                        ) : errorClass ? (
                                            "Erro ao carregar turma"
                                        ) : classInfo ? (
                                            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                                                Turma:&nbsp;
                                                <MUILink
                                                    underline="hover"
                                                    color="inherit"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        nav(`/classes/${data.class_id}`);
                                                    }}
                                                    sx={{ fontWeight: 700, cursor: "pointer" }}
                                                >
                                                    {classInfo.name} #{data.class_id}
                                                </MUILink>
                                                <ChevronRightIcon fontSize="small" sx={{ ml: -0.25 }} />
                                            </Box>
                                        ) : (
                                            "Turma: —"
                                        )
                                    }
                                    variant="outlined"
                                />

                                <Chip
                                    size="small"
                                    icon={<MenuBookOutlinedIcon />}
                                    label={`Disciplina: ${subjectLabel(data.subject_kind as any, data.subject_other)}`}
                                    variant="outlined"
                                />

                                <Chip
                                    size="small"
                                    icon={<EventIcon />}
                                    label={data.date ? `Data: ${dayjs(data.date).format("DD/MM/YYYY")}` : "Data: —"}
                                    variant="outlined"
                                />

                                <Chip
                                    size="small"
                                    color={weightChipColor(data.weight_mode)}
                                    icon={<ScaleIcon />}
                                    label={`Modo: ${weightLabel(data.weight_mode)}`}
                                    variant="outlined"
                                />
                            </Stack>

                            {loadingClass && (
                                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                    Carregando turma…
                                </Typography>
                            )}
                            {errorClass && (
                                <Alert
                                    sx={{ mt: 1 }}
                                    severity="warning"
                                    action={
                                        <Button size="small" onClick={() => refetchClass()}>
                                            Recarregar
                                        </Button>
                                    }
                                >
                                    Não foi possível carregar os dados da turma.
                                </Alert>
                            )}
                        </Stack>
                    )}
                </CardContent>
            </Card>

            {/* Sticky: subnavs */}
            <Box
                sx={(theme) => ({
                    position: "sticky",
                    top: 0,
                    zIndex: theme.zIndex.appBar - 1,
                    bgcolor: theme.palette.background.default,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                })}
            >
                <Box sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}>
                    {isLoading ? <Skeleton height={48} /> : data?.class_id && <ClassSubnav classId={data.class_id} value="assessments" />}
                </Box>
                <Box sx={{ bgcolor: "background.paper" }}>
                    <AssessmentSubnav />
                </Box>
            </Box>

            <Outlet />
        </Box>
    );
}
