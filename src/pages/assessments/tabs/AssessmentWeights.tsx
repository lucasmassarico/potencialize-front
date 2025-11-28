import React from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, Card, CardContent, Typography, Stack, TextField, Button, Alert, Snackbar, Chip, Divider, Tooltip } from "@mui/material";
import ReplayIcon from "@mui/icons-material/Replay";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import RestoreIcon from "@mui/icons-material/Restore";
import GridOnIcon from "@mui/icons-material/GridOn";

import { getAssessmentSkillWeights, putAssessmentSkillWeights, getAssessment } from "../../../api/assessments";
import type { SkillLevel, AssessmentSkillWeightsOut } from "../../../types/assessments";

const ORDER: SkillLevel[] = ["abaixo", "basico", "adequado", "avancado"];

const LABELS: Record<SkillLevel, string> = {
    abaixo: "Abaixo do Básico",
    basico: "Básico",
    adequado: "Adequado",
    avancado: "Avançado",
};

function mapAndOrder(data: AssessmentSkillWeightsOut): AssessmentSkillWeightsOut {
    const map = new Map(data.items.map((i) => [i.skill_level, Number(i.weight) || 1]));
    return { items: ORDER.map((l) => ({ skill_level: l, weight: Number(map.get(l) ?? 1) })) };
}

function deepEqual(a: AssessmentSkillWeightsOut | null, b: AssessmentSkillWeightsOut | null) {
    return JSON.stringify(a) === JSON.stringify(b);
}

export default function AssessmentWeights() {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const qc = useQueryClient();
    const nav = useNavigate();

    // carrega head só pra validar o modo
    const { data: head, isLoading: loadingHead } = useQuery({
        queryKey: ["assessmentHead", assessmentId],
        queryFn: () => getAssessment(Number(assessmentId), "id,title,weight_mode"),
        enabled: !!assessmentId,
    });

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["assessmentWeights", assessmentId],
        queryFn: () => getAssessmentSkillWeights(Number(assessmentId)),
        enabled: !!assessmentId,
    });

    const [serverSnapshot, setServerSnapshot] = React.useState<AssessmentSkillWeightsOut | null>(null);
    const [local, setLocal] = React.useState<AssessmentSkillWeightsOut | null>(null);
    const [snack, setSnack] = React.useState<{ open: boolean; msg: string; severity: "success" | "error" }>({
        open: false,
        msg: "",
        severity: "success",
    });

    // sincroniza local + snapshot sempre que chegar do servidor
    React.useEffect(() => {
        if (data) {
            const ordered = mapAndOrder(data);
            setServerSnapshot(ordered);
            setLocal(ordered);
        }
    }, [data]);

    const mutation = useMutation({
        mutationFn: () => putAssessmentSkillWeights(Number(assessmentId), { items: local?.items ?? [] }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["assessmentWeights", assessmentId] });
            setServerSnapshot(local); // o salvo vira o snapshot
            setSnack({ open: true, msg: "Pesos salvos com sucesso.", severity: "success" });
        },
        onError: () => setSnack({ open: true, msg: "Falha ao salvar pesos.", severity: "error" }),
    });

    // BLOQUEIO: se não é by_skill, redireciona
    if (!loadingHead && head && head.weight_mode !== "by_skill") {
        return <Navigate to={`/assessments/${assessmentId}`} replace state={{ reason: "not_by_skill" }} />;
    }

    const isDirty = !deepEqual(local, serverSnapshot);

    const handleChange = (idx: number, value: string) => {
        const v = Math.max(0.1, Number(value || 0));
        setLocal((prev) => {
            if (!prev) return prev;
            const next = [...prev.items];
            next[idx] = { ...next[idx], weight: v };
            return { items: next };
        });
    };

    const resetToOnes = () => {
        setLocal({ items: ORDER.map((l) => ({ skill_level: l, weight: 1 })) });
    };

    const revertToServer = () => {
        if (serverSnapshot) setLocal(serverSnapshot);
    };

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
                <Typography variant="h6" sx={{ flex: 1 }}>
                    Pesos por nível
                </Typography>
                {head?.title && (
                    <Chip size="small" icon={<GridOnIcon />} label={head.title} variant="outlined" sx={{ display: { xs: "none", sm: "inline-flex" } }} />
                )}
            </Stack>

            <Card>
                <CardContent>
                    {isLoading || loadingHead ? (
                        <Typography sx={{ opacity: 0.7 }}>Carregando…</Typography>
                    ) : isError || !local ? (
                        <Alert
                            severity="error"
                            action={
                                <Button size="small" startIcon={<ReplayIcon />} onClick={() => refetch()}>
                                    Tentar novamente
                                </Button>
                            }
                        >
                            Falha ao carregar pesos.
                        </Alert>
                    ) : (
                        <>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                Defina multiplicadores de peso para cada nível. Valores maiores impactam mais o cálculo da nota quando a avaliação está no modo
                                <b> por nível</b>.
                            </Typography>

                            <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 2 }}>
                                {local.items.map((it, idx) => (
                                    <TextField
                                        key={it.skill_level}
                                        size="small"
                                        label={LABELS[it.skill_level]}
                                        type="number"
                                        inputProps={{ step: "0.1", min: "0.1", inputMode: "decimal" }}
                                        value={it.weight}
                                        onChange={(e) => handleChange(idx, e.target.value)}
                                    />
                                ))}
                            </Stack>

                            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 2 }} useFlexGap flexWrap="wrap">
                                <Tooltip title="Define 1x para todos os níveis">
                                    <Button variant="outlined" onClick={resetToOnes} startIcon={<RestoreIcon />}>
                                        Resetar para 1x
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Volta ao último valor salvo no servidor">
                                    <span>
                                        <Button variant="text" onClick={revertToServer} disabled={!serverSnapshot}>
                                            Reverter
                                        </Button>
                                    </span>
                                </Tooltip>

                                <Divider flexItem sx={{ mx: { xs: 0, sm: 1 }, display: { xs: "none", sm: "block" } }} />

                                <Tooltip title={isDirty ? "" : "Sem alterações para salvar"}>
                                    <span>
                                        <Button
                                            variant="contained"
                                            onClick={() => mutation.mutate()}
                                            disabled={mutation.isPending || !isDirty}
                                            startIcon={<DoneAllIcon />}
                                        >
                                            {mutation.isPending ? "Salvando…" : "Salvar"}
                                        </Button>
                                    </span>
                                </Tooltip>

                                <Button onClick={() => nav(-1)} sx={{ ml: "auto" }}>
                                    Voltar
                                </Button>
                            </Stack>
                        </>
                    )}
                </CardContent>
            </Card>

            <Snackbar
                open={snack.open}
                autoHideDuration={3000}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert severity={snack.severity} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}
