import { Outlet, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Card, CardContent, Stack, Typography, Button, Chip, Alert, Skeleton, Link as MUILink } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ReplayIcon from "@mui/icons-material/Replay";
import EventIcon from "@mui/icons-material/Event";
import ClassIcon from "@mui/icons-material/Class";
import ScaleIcon from "@mui/icons-material/Scale";

import { getAssessment } from "../../api/assessments";
import { getClass } from "../../api/classes";
import AssessmentSubnav from "./components/AssessmentSubnav";
import { toTitleCase } from "../../utils/utils";
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

export default function AssessmentDetail() {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const nav = useNavigate();

    const { data, isLoading, isError, error, refetch } = useQuery({
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

    const goBackToClass = () => {
        if (data?.class_id) nav(`/classes/${data.class_id}`);
        else nav("/classes");
    };

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            {/* Header + ações */}
            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
                <Typography variant="h5" fontWeight={700} sx={{ flex: 1, minWidth: 0 }}>
                    {data?.title ? toTitleCase(data.title) : isLoading ? <Skeleton width={260} height={32} /> : "Avaliação"}
                    {data?.id ? ` #${data.id}` : null}
                </Typography>

                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={goBackToClass}>
                        Voltar para a turma
                    </Button>
                    <Button color="info" variant="text" onClick={() => nav("/classes")}>
                        Todas as turmas
                    </Button>
                </Stack>
            </Stack>

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
                            <Typography variant="h6">{data.title}</Typography>

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

                            {/* feedback carregamento/erro da turma (opcional, discreto) */}
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

            {/* Sub-navbar “sticky” para navegação agradável */}
            <Box
                sx={(theme) => ({
                    position: "sticky",
                    top: 0, // se tiver AppBar fixa, ajuste para theme.mixins.toolbar.minHeight
                    zIndex: theme.zIndex.appBar - 1,
                    bgcolor: theme.palette.background.default,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                })}
            >
                <AssessmentSubnav />
            </Box>

            {/* Conteúdo das abas */}
            <Outlet />
        </Box>
    );
}
