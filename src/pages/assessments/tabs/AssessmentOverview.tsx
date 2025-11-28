import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Card, CardContent, Typography, Alert, Stack, Chip, Divider, LinearProgress, Skeleton, Grid } from "@mui/material";
import { getAssessmentOverview } from "../../../api/assessments";
import type { AssessmentOverviewDTO } from "../../../types/assessments";

/** Utils */
const formatPercent = (v: number, digits = 1) => `${(Math.max(0, Math.min(1, v)) * 100).toFixed(digits)}%`;

/** Tradução de níveis (tolerante a várias convenções) */
function translateSkillLevel(val: string | number): string {
    const s = String(val).toLowerCase().trim();

    const map: Record<string, string> = {
        ab: "Abaixo do Básico",
        abaixo: "Abaixo do Básico",
        below: "Abaixo do Básico",
        below_basic: "Abaixo do Básico",
        "1": "Abaixo do Básico",

        b: "Básico",
        basic: "Básico",
        básico: "Básico",
        basico: "Básico",
        "2": "Básico",

        ad: "Adequado",
        adequado: "Adequado",
        adequate: "Adequado",
        "3": "Adequado",

        av: "Avançado",
        avancado: "Avançado",
        avançado: "Avançado",
        advanced: "Avançado",
        "4": "Avançado",
    };

    return map[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
}

const SKILL_ORDER: Record<string, number> = {
    "Abaixo do Básico": 1,
    Básico: 2,
    Adequado: 3,
    Avançado: 4,
};

/** Skeleton específico do Overview de Avaliação */
function AssessmentOverviewSkeleton() {
    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Card>
                <CardContent>
                    <Skeleton width={140} height={24} />
                    <Stack direction="row" spacing={2} mt={1}>
                        <Stack spacing={0.5}>
                            <Skeleton width={180} />
                            <Skeleton width={100} height={32} />
                        </Stack>
                        <Stack spacing={0.5}>
                            <Skeleton width={220} />
                            <Skeleton width={100} height={32} />
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Card>
                        <CardContent>
                            <Skeleton width={80} height={24} />
                            <Stack spacing={1.2} mt={1}>
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Stack key={i} direction="row" alignItems="center" spacing={2}>
                                        <Skeleton width="60%" />
                                        <Skeleton width={80} />
                                    </Stack>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Card>
                        <CardContent>
                            <Skeleton width={140} height={24} />
                            <Stack spacing={1.2} mt={1}>
                                {Array.from({ length: 4 }).map((_, i) => (
                                    <Stack key={i} spacing={0.5}>
                                        <Skeleton width="40%" />
                                        <Skeleton variant="rounded" height={8} />
                                    </Stack>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Card>
                <CardContent>
                    <Skeleton width={120} height={24} />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Stack key={i} direction="row" spacing={2} alignItems="center" mt={1}>
                            <Skeleton width={90} />
                            <Skeleton width={70} />
                            <Skeleton width={120} />
                            <Skeleton variant="rounded" height={8} sx={{ flex: 1 }} />
                        </Stack>
                    ))}
                </CardContent>
            </Card>

            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Card>
                        <CardContent>
                            <Skeleton width={120} height={24} />
                            <Stack direction="row" spacing={1} mt={1}>
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} variant="rounded" width={96} height={28} />
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Card>
                        <CardContent>
                            <Skeleton width={110} height={24} />
                            <Stack direction="row" spacing={1} mt={1}>
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} variant="rounded" width={96} height={28} />
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default function AssessmentOverview() {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const { data, isLoading, isError } = useQuery({
        queryKey: ["assessmentOverview", assessmentId],
        queryFn: () => getAssessmentOverview(Number(assessmentId)),
        enabled: !!assessmentId,
    });

    if (isLoading) return <AssessmentOverviewSkeleton />;
    if (isError || !data) return <Alert severity="error">Falha ao carregar overview.</Alert>;

    // Tipar de forma segura (se você não tiver a interface, mantenha 'any')
    const ov: AssessmentOverviewDTO = data as any;

    // ====== POPULAÇÃO (PT-BR) ======
    const populationRows: Array<{ label: string; value: number | string }> = [
        { label: "Alunos cadastrados", value: ov.population?.students_in_class ?? 0 },
        { label: "Alunos que responderam", value: ov.population?.students_answered_any ?? 0 },
    ];

    // ====== GERAL (PT-BR) ======
    const totalQuestions = ov.overall?.total_questions ?? 0;
    const totalAnswers = ov.overall?.total_answers ?? 0;
    const correct = ov.overall?.correct ?? 0;
    const accuracy = Number.isFinite(ov.overall?.accuracy) ? ov.overall?.accuracy : 0;

    const geralRows: Array<{ label: string; value: string | number; progress?: number }> = [
        { label: "Total de questões cadastradas", value: totalQuestions },
        { label: "Questões respondidas", value: totalAnswers },
        { label: "Respostas corretas", value: correct },
        { label: "Taxa de acerto", value: formatPercent(accuracy), progress: accuracy },
    ];

    // ====== POR NÍVEL (PT-BR) ======
    const skills = (ov.by_skill || [])
        .map((r: any) => ({
            rotulo: translateSkillLevel(r.skill_level),
            questions: r.questions ?? 0,
            answers: r.answers ?? 0,
            correct: r.correct ?? 0,
            acc: Number.isFinite(r.accuracy) ? r.accuracy : 0,
        }))
        .sort((a, b) => SKILL_ORDER[a.rotulo] - SKILL_ORDER[b.rotulo]);

    // ====== POR QUESTÃO ======
    const perQ = (ov.by_question || []).map((q: any) => ({
        id: q.question_id,
        answers: q.answers ?? 0,
        correct: q.correct ?? 0,
        acc: Number.isFinite(q.accuracy) ? q.accuracy : 0,
    }));

    const hardest = Array.isArray(ov.hardest) ? ov.hardest : [];
    const easiest = Array.isArray(ov.easiest) ? ov.easiest : [];

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            {/* População */}
            <Card>
                <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        População
                    </Typography>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
                        {populationRows.map((r) => (
                            <Stack key={r.label} spacing={0.5}>
                                <Typography variant="body2" sx={{ opacity: 0.75 }}>
                                    {r.label}
                                </Typography>
                                <Typography variant="h6" fontWeight={700}>
                                    {r.value}
                                </Typography>
                            </Stack>
                        ))}
                    </Stack>
                </CardContent>
            </Card>

            {/* Geral + Por nível */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                                Geral
                            </Typography>
                            <Stack spacing={1.25}>
                                {geralRows.map((r) => (
                                    <Box key={r.label}>
                                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                                            <Typography variant="body2" sx={{ opacity: 0.85 }}>
                                                {r.label}
                                            </Typography>
                                            <Typography variant="body2" fontWeight={600}>
                                                {r.value}
                                            </Typography>
                                        </Stack>
                                        {"progress" in r && typeof r.progress === "number" && (
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.max(0, Math.min(100, r.progress * 100))}
                                                sx={{ mt: 0.75, height: 8, borderRadius: 999 }}
                                                aria-label="Taxa de acerto"
                                            />
                                        )}
                                        <Divider sx={{ my: 1.25 }} />
                                    </Box>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                                Desempenho por nível
                            </Typography>
                            <Stack spacing={1.25}>
                                {skills.length === 0 && <Alert severity="info">Sem dados por nível.</Alert>}
                                {skills.map((s) => (
                                    <Box key={s.rotulo}>
                                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                                            <Typography variant="body2" fontWeight={600}>
                                                {s.rotulo}
                                            </Typography>
                                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                                {s.correct}/{s.answers} corretas
                                            </Typography>
                                        </Stack>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.max(0, Math.min(100, s.acc * 100))}
                                            sx={{ mt: 0.75, height: 8, borderRadius: 999 }}
                                            aria-label={`Taxa de acerto - ${s.rotulo}`}
                                        />
                                        <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
                                            <Typography variant="caption" sx={{ opacity: 0.75 }}>
                                                Questões: <b>{s.questions}</b>
                                            </Typography>
                                            <Typography variant="caption" sx={{ opacity: 0.75 }}>
                                                Respondidas: <b>{s.answers}</b>
                                            </Typography>
                                            <Typography variant="caption" sx={{ opacity: 0.75 }}>
                                                Acerto: <b>{formatPercent(s.acc)}</b>
                                            </Typography>
                                        </Stack>
                                        <Divider sx={{ my: 1.25 }} />
                                    </Box>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Por questão */}
            <Card>
                <CardContent>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        Por questão
                    </Typography>

                    {perQ.length === 0 && <Alert severity="info">Sem respostas nas questões desta avaliação.</Alert>}

                    {perQ.length > 0 && (
                        <Stack spacing={1.25}>
                            {perQ.map((q) => (
                                <Box key={q.id}>
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
                                        <Typography variant="body2" fontWeight={600}>
                                            Questão #{q.id}
                                        </Typography>
                                        <Stack direction="row" spacing={2}>
                                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                                Respondidas: <b>{q.answers}</b>
                                            </Typography>
                                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                                Corretas: <b>{q.correct}</b>
                                            </Typography>
                                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                                Acerto: <b>{formatPercent(q.acc)}</b>
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.max(0, Math.min(100, q.acc * 100))}
                                        sx={{ mt: 0.75, height: 8, borderRadius: 999 }}
                                        aria-label={`Taxa de acerto - Questão ${q.id}`}
                                    />
                                    <Divider sx={{ my: 1.25 }} />
                                </Box>
                            ))}
                        </Stack>
                    )}
                </CardContent>
            </Card>

            {/* Mais difíceis / Mais fáceis */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                                Mais difíceis
                            </Typography>
                            {hardest.length === 0 ? (
                                <Alert severity="info">Ainda não há questões difíceis ranqueadas.</Alert>
                            ) : (
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {hardest.map((qid: number) => (
                                        <Chip key={qid} color="error" variant="outlined" label={`Q#${qid}`} />
                                    ))}
                                </Stack>
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                                Mais fáceis
                            </Typography>
                            {easiest.length === 0 ? (
                                <Alert severity="info">Ainda não há questões fáceis ranqueadas.</Alert>
                            ) : (
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                    {easiest.map((qid: number) => (
                                        <Chip key={qid} color="success" variant="outlined" label={`Q#${qid}`} />
                                    ))}
                                </Stack>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
