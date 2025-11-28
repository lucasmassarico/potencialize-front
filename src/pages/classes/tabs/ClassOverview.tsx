// src/pages/classes/tabs/ClassOverview.tsx
import * as React from "react";
import { Box, Card, CardContent, Typography, Stack, Button, Divider, Chip, IconButton, Tooltip, Grid } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import BallotOutlinedIcon from "@mui/icons-material/BallotOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useClassContext } from "./useClassContext";

/** Small KPI card (metric tile) */
function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <Card variant="outlined">
            <CardContent>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Box
                        sx={(t) => ({
                            width: 40,
                            height: 40,
                            borderRadius: t.shape.borderRadius,
                            display: "grid",
                            placeItems: "center",
                            bgcolor: t.palette.mode === "light" ? "primary.50" : "primary.900",
                            color: "primary.main",
                        })}
                        aria-hidden
                    >
                        {icon}
                    </Box>
                    <Stack spacing={0.25}>
                        <Typography variant="overline" sx={{ letterSpacing: 0.4 }}>
                            {label}
                        </Typography>
                        <Typography variant="h6" fontWeight={700}>
                            {value}
                        </Typography>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
}

/** Simple list card with up to 5 items and a CTA */
function ListCard({
    title,
    items,
    emptyText,
    to,
    cta,
    renderItem,
}: {
    title: string;
    items: any[];
    emptyText: string;
    to: string;
    cta: string;
    renderItem: (item: any) => React.ReactNode;
}) {
    const limited = (items || []).slice(0, 5);
    return (
        <Card variant="outlined">
            <CardContent>
                <Stack spacing={1}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="h6">{title}</Typography>
                        <Tooltip title={`Abrir ${title}`}>
                            <IconButton component={RouterLink} to={to} size="small" aria-label={`Abrir ${title}`}>
                                <OpenInNewIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Stack>

                    {limited.length === 0 ? (
                        <Typography variant="body2" sx={{ opacity: 0.75 }}>
                            {emptyText}
                        </Typography>
                    ) : (
                        <Stack divider={<Divider flexItem />} spacing={1}>
                            {limited.map((it) => (
                                <Box key={(it.id ?? it.name) as React.Key}>{renderItem(it)}</Box>
                            ))}
                        </Stack>
                    )}

                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                        <Button component={RouterLink} to={to} variant="contained">
                            {cta}
                        </Button>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
}

export default function ClassOverview() {
    const { classId, klass } = useClassContext();

    const students = (klass.students ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
    const assessments = (klass.assessments ?? []).slice().sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));

    const studentsCount = students.length;
    const assessmentsCount = assessments.length;

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            {/* Header info (compacta) */}
            <Card variant="outlined">
                <CardContent>
                    <Stack spacing={1}>
                        <Typography variant="h6">Informações da turma</Typography>
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                            <Typography variant="body2">
                                Nome: <b>{klass.name}</b>
                            </Typography>
                            <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />
                            <Typography variant="body2">
                                Ano: <b>{klass.year}</b>
                            </Typography>
                            <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />
                            <Typography variant="body2">
                                Professor(a): <b>{klass.teacher?.name ?? "—"}</b>
                            </Typography>
                            {assessmentsCount > 0 && (
                                <>
                                    <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", sm: "block" } }} />
                                    <Typography variant="body2">
                                        Avaliações: <b>{assessmentsCount}</b>
                                    </Typography>
                                </>
                            )}
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>

            {/* KPIs */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 4 }}>
                    <StatCard
                        icon={<GroupsOutlinedIcon />}
                        label="Alunos"
                        value={
                            <Stack direction="row" spacing={1} alignItems="center">
                                <span>{studentsCount}</span>
                                {studentsCount === 0 && <Chip size="small" color="warning" variant="outlined" label="Vazio" />}
                            </Stack>
                        }
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <StatCard
                        icon={<BallotOutlinedIcon />}
                        label="Avaliações"
                        value={
                            <Stack direction="row" spacing={1} alignItems="center">
                                <span>{assessmentsCount}</span>
                                {assessmentsCount === 0 && <Chip size="small" color="warning" variant="outlined" label="Nenhuma" />}
                            </Stack>
                        }
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 4 }}>
                    <StatCard icon={<PersonOutlineIcon />} label="Professor(a)" value={klass.teacher?.name ?? "—"} />
                </Grid>
            </Grid>

            {/* Listas rápidas */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <ListCard
                        title="Avaliações"
                        items={assessments}
                        emptyText="Sem avaliações nesta turma."
                        to={`/classes/${classId}/assessments`}
                        cta="Ir para Avaliações"
                        renderItem={(a: { id: number; title: string }) => (
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography variant="body2" fontWeight={600}>
                                    {a.title || `Avaliação #${a.id}`}
                                </Typography>
                                <Button component={RouterLink} to={`/classes/${classId}/assessments`} size="small" variant="text">
                                    Abrir
                                </Button>
                            </Stack>
                        )}
                    />
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <ListCard
                        title="Alunos"
                        items={students}
                        emptyText="Sem alunos cadastrados."
                        to={`/classes/${classId}/students`}
                        cta="Ir para Alunos"
                        renderItem={(s: { id: number; name: string; register_code?: string }) => (
                            <Stack direction="row" alignItems="center" justifyContent="space-between">
                                <Typography variant="body2" fontWeight={600}>
                                    {s.name}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.75 }}>
                                    {s.register_code ? `Código: ${s.register_code}` : "—"}
                                </Typography>
                            </Stack>
                        )}
                    />
                </Grid>
            </Grid>

            {/* Callout de Analytics (informativo para o futuro) */}
            <Card variant="outlined">
                <CardContent>
                    <Stack spacing={1}>
                        <Typography variant="h6">Insights e análises</Typography>
                        <Typography variant="body2" sx={{ opacity: 0.85 }}>
                            Em breve: gráficos de participação, taxa de acerto por nível e desempenho por questão. Para habilitar esses insights, as avaliações
                            desta turma precisam ter respostas registradas.
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Button variant="contained" component={RouterLink} to={`/classes/${classId}/assessments`}>
                                Criar/gerenciar avaliações
                            </Button>
                            <Button variant="outlined" component={RouterLink} to={`/classes/${classId}/students`}>
                                Gerenciar alunos
                            </Button>
                        </Stack>
                    </Stack>
                </CardContent>
            </Card>
        </Box>
    );
}
