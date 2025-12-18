import React from "react";
import {
    Card,
    CardContent,
    Stack,
    TextField,
    FormControlLabel,
    Switch,
    Button,
    Alert,
    MenuItem,
    Typography,
    InputAdornment,
    Box,
    Snackbar,
    ListItemText,
    ListItemIcon,
    Chip,
    Divider,
    FormHelperText,
} from "@mui/material";
import ReplayIcon from "@mui/icons-material/Replay";
import ScaleOutlinedIcon from "@mui/icons-material/ScaleOutlined";
import AutoGraphOutlinedIcon from "@mui/icons-material/AutoGraphOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";

import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getAssessmentGradingPolicy, putAssessmentGradingPolicy } from "../../../api/assessments";
import type { AssessmentGradingPolicyIn, GradingBasis } from "../../../types/assessments";

/** ───────────────────────────────────────────────────────────────────────────
 *  Opções de base com rótulo e help-inline
 *  ─────────────────────────────────────────────────────────────────────────── */
const basisOptions: Array<{ value: GradingBasis; label: string; hint: string; secondary: string; icon: React.ReactNode }> = [
    {
        value: "by_points",
        label: "Por pontos",
        hint: "Percentual = pontos obtidos / pontos totais",
        secondary: "Soma os pesos das questões sobre o peso total da prova.",
        icon: <ScaleOutlinedIcon fontSize="small" />,
    },
    {
        value: "by_accuracy",
        label: "Por acurácia",
        hint: "Percentual = corretas / (respondidas ou total, conforme branco conta)",
        secondary: "Mede taxa de acertos; pode penalizar branco dependendo da opção abaixo.",
        icon: <AutoGraphOutlinedIcon fontSize="small" />,
    },
];

/** ───────────────────────────────────────────────────────────────────────────
 *  Validação (ordem crescente dos limiares)
 *  ─────────────────────────────────────────────────────────────────────────── */
const schema = z
    .object({
        basis: z.enum(["by_points", "by_accuracy"]),
        count_blank_as_wrong: z.boolean(),
        basic_min: z.number().min(0).max(100),
        adequate_min: z.number().min(0).max(100),
        advanced_min: z.number().min(0).max(100),
    })
    .refine((v) => v.basic_min <= v.adequate_min && v.adequate_min <= v.advanced_min, {
        message: "Respeite a sequência: Básico ≤ Adequado ≤ Avançado.",
        path: ["adequate_min"],
    });

type FormValues = z.output<typeof schema>;

/** ───────────────────────────────────────────────────────────────────────────
 *  Explicação contextual, compacta e objetiva
 *  ─────────────────────────────────────────────────────────────────────────── */
function BasisHint({ basis, countBlank }: { basis: GradingBasis | undefined; countBlank: boolean | undefined }) {
    if (!basis) return null;

    if (basis === "by_accuracy") {
        return (
            <Alert icon={<InfoOutlinedIcon />} severity="info" variant="outlined">
                <Typography variant="subtitle2" fontWeight={700}>
                    Por Acurácia
                </Typography>
                <Typography variant="body2">
                    <strong>Ideia:</strong> proporção de acertos.{" "}
                    {countBlank ? (
                        <>
                            Com “contar branco como errado”: <code>percent = 100 × acertos / total_questões</code>.
                        </>
                    ) : (
                        <>
                            Sem penalizar branco: <code>percent = 100 × acertos / respondidas</code>.
                        </>
                    )}
                </Typography>
            </Alert>
        );
    }

    return (
        <Alert icon={<InfoOutlinedIcon />} severity="info" variant="outlined">
            <Typography variant="subtitle2" fontWeight={700}>
                Por Pontos
            </Typography>
            <Typography variant="body2">
                <strong>Ideia:</strong> soma dos pesos das questões sobre o peso total. <br />
                <code>percent = 100 × pontos_certos / pontos_totais</code>. Branco já rende 0 ponto; a opção de branco não muda o cálculo.
            </Typography>
        </Alert>
    );
}

/** ───────────────────────────────────────────────────────────────────────────
 *  Componente principal
 *  ─────────────────────────────────────────────────────────────────────────── */
export default function AssessmentGradingPolicyTab() {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const qc = useQueryClient();

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["assessmentGradingPolicy", assessmentId],
        queryFn: () => getAssessmentGradingPolicy(Number(assessmentId)),
        enabled: !!assessmentId,
        staleTime: 30_000,
    });

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
        watch,
        setValue,
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        values: data
            ? {
                  basis: data.basis,
                  count_blank_as_wrong: data.count_blank_as_wrong,
                  basic_min: data.basic_min,
                  adequate_min: data.adequate_min,
                  advanced_min: data.advanced_min,
              }
            : undefined,
    });

    React.useEffect(() => {
        if (data) {
            reset({
                basis: data.basis,
                count_blank_as_wrong: data.count_blank_as_wrong,
                basic_min: data.basic_min,
                adequate_min: data.adequate_min,
                advanced_min: data.advanced_min,
            });
        }
    }, [data, reset]);

    const [snack, setSnack] = React.useState<{ open: boolean; msg: string; sev: "success" | "error" } | null>(null);

    const onSubmit = handleSubmit(async (values) => {
        try {
            const payload: AssessmentGradingPolicyIn = {
                basis: values.basis,
                count_blank_as_wrong: values.count_blank_as_wrong,
                basic_min: Number(values.basic_min),
                adequate_min: Number(values.adequate_min),
                advanced_min: Number(values.advanced_min),
            };

            await putAssessmentGradingPolicy(Number(assessmentId), payload);

            setSnack({ open: true, msg: "Política de classificação atualizada.", sev: "success" });

            qc.invalidateQueries({ queryKey: ["assessmentGradingPolicy", assessmentId] });
            qc.invalidateQueries({ queryKey: ["assessmentMatrix", assessmentId] });
            qc.invalidateQueries({ queryKey: ["assessmentOverview", assessmentId] });
        } catch (e: any) {
            const msg = e?.response?.data?.message || "Falha ao salvar.";
            setSnack({ open: true, msg, sev: "error" });
        }
    });

    const chosenBasis = watch("basis");
    const countBlank = watch("count_blank_as_wrong");
    const basicMin = watch("basic_min");
    const adequateMin = watch("adequate_min");
    const advancedMin = watch("advanced_min");

    const thresholdsValid = basicMin <= adequateMin && adequateMin <= advancedMin;

    /** Presets úteis (1 clique) */
    const applyPreset = (b: number, a: number, av: number) => {
        setValue("basic_min", b);
        setValue("adequate_min", a);
        setValue("advanced_min", av);
    };

    return (
        <Card>
            <CardContent>
                <Stack spacing={2}>
                    {/* Título + resumo curto */}
                    <Box>
                        <Typography variant="h6" fontWeight={700}>
                            Classificação da avaliação
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.85 }}>
                            Defina como a nota é calculada e quais percentuais delimitam Abaixo do Básico, Básico, Adequado e Avançado.
                        </Typography>
                    </Box>

                    {/* Erro de carregamento */}
                    {isError && (
                        <Alert
                            severity="error"
                            action={
                                <Button size="small" startIcon={<ReplayIcon />} onClick={() => refetch()}>
                                    Tentar novamente
                                </Button>
                            }
                        >
                            Erro ao carregar a política.
                        </Alert>
                    )}

                    {!isLoading && data && (
                        <>
                            {/* Seção: Base de cálculo */}
                            <Card variant="outlined">
                                <CardContent>
                                    <Stack spacing={2}>
                                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                                            <TextField
                                                select
                                                label="Base de cálculo"
                                                fullWidth
                                                defaultValue={data.basis}
                                                {...register("basis")}
                                                error={!!errors.basis}
                                                helperText={errors.basis?.message || basisOptions.find((b) => b.value === chosenBasis)?.hint}
                                            >
                                                {basisOptions.map((opt) => (
                                                    <MenuItem key={opt.value} value={opt.value}>
                                                        <ListItemIcon>{opt.icon}</ListItemIcon>
                                                        <ListItemText primary={opt.label} secondary={opt.secondary} />
                                                    </MenuItem>
                                                ))}
                                            </TextField>

                                            <Box>
                                                <FormControlLabel
                                                    control={<Switch defaultChecked={data.count_blank_as_wrong} {...register("count_blank_as_wrong")} />}
                                                    label="Contar em branco como errado"
                                                />
                                                <FormHelperText sx={{ ml: 1.75 }}>
                                                    {chosenBasis === "by_accuracy"
                                                        ? "Ajusta o denominador (respondidas vs. total)."
                                                        : "Em 'Por pontos', branco já é 0 ponto."}
                                                </FormHelperText>
                                            </Box>
                                        </Stack>

                                        {/* Explicação compacta com fórmula */}
                                        <BasisHint basis={chosenBasis} countBlank={!!countBlank} />
                                    </Stack>
                                </CardContent>
                            </Card>

                            {/* Seção: Faixas (limiares) + Presets + Status */}
                            <Card variant="outlined">
                                <CardContent>
                                    <Stack spacing={2}>
                                        <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap spacing={1}>
                                            <Typography variant="subtitle1" fontWeight={700} sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                                                <TuneOutlinedIcon fontSize="small" /> Faixas de desempenho (%)
                                            </Typography>

                                            {/* Presets de 1 clique */}
                                            <Stack direction="row" spacing={1}>
                                                <Button size="small" variant="outlined" onClick={() => applyPreset(50, 70, 85)}>
                                                    Equilibrado (50/70/85)
                                                </Button>
                                                <Button size="small" variant="outlined" onClick={() => applyPreset(60, 75, 90)}>
                                                    Rigoroso (60/75/90)
                                                </Button>
                                                <Button size="small" variant="outlined" onClick={() => applyPreset(40, 60, 80)}>
                                                    Formativo (40/60/80)
                                                </Button>
                                            </Stack>
                                        </Stack>

                                        {/* Inputs */}
                                        <Box
                                            sx={(t) => ({
                                                display: "grid",
                                                gap: 2,
                                                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                                                border: `1px dashed ${t.palette.divider}`,
                                                borderRadius: 1,
                                                p: 2,
                                            })}
                                        >
                                            <TextField
                                                label="Básico (mín.)"
                                                type="number"
                                                inputProps={{ min: 0, max: 100, step: 1 }}
                                                {...register("basic_min", { valueAsNumber: true })}
                                                error={!!errors.basic_min}
                                                helperText={errors.basic_min?.message || "≥ Abaixo do Básico"}
                                                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                            />
                                            <TextField
                                                label="Adequado (mín.)"
                                                type="number"
                                                inputProps={{ min: 0, max: 100, step: 1 }}
                                                {...register("adequate_min", { valueAsNumber: true })}
                                                error={!!errors.adequate_min}
                                                helperText={errors.adequate_min?.message || "≥ Básico"}
                                                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                            />
                                            <TextField
                                                label="Avançado (mín.)"
                                                type="number"
                                                inputProps={{ min: 0, max: 100, step: 1 }}
                                                {...register("advanced_min", { valueAsNumber: true })}
                                                error={!!errors.advanced_min}
                                                helperText={errors.advanced_min?.message || "≥ Adequado"}
                                                InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                                            />
                                        </Box>

                                        {/* Status de validação + Legenda de cores */}
                                        <Stack
                                            direction={{ xs: "column", sm: "row" }}
                                            spacing={2}
                                            alignItems={{ xs: "flex-start", sm: "center" }}
                                            justifyContent="space-between"
                                        >
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                {thresholdsValid ? (
                                                    <Chip
                                                        color="success"
                                                        variant="outlined"
                                                        icon={<CheckCircleOutlineIcon />}
                                                        label={`Faixas válidas: ${basicMin}% ≤ ${adequateMin}% ≤ ${advancedMin}%`}
                                                    />
                                                ) : (
                                                    <Chip
                                                        color="error"
                                                        variant="outlined"
                                                        icon={<ErrorOutlineIcon />}
                                                        label="Corrija a ordem: Básico ≤ Adequado ≤ Avançado"
                                                    />
                                                )}
                                            </Stack>

                                            {/* Legenda rápida */}
                                            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                                                <Chip size="small" color="error" variant="outlined" label="Abaixo do Básico" />
                                                <Chip size="small" color="warning" variant="outlined" label="Básico" />
                                                <Chip size="small" color="info" variant="outlined" label="Adequado" />
                                                <Chip size="small" color="success" variant="outlined" label="Avançado" />
                                            </Stack>
                                        </Stack>

                                        <Divider />

                                        {/* Dica rápida */}
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ opacity: 0.9 }}>
                                            <HelpOutlineOutlinedIcon fontSize="small" />
                                            <Typography variant="body2">
                                                O percentual calculado cairá em uma dessas faixas. Ajuste os limites conforme sua matriz de expectativas.
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                </CardContent>
                            </Card>

                            {/* Ações */}
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Button
                                    variant="outlined"
                                    onClick={() =>
                                        data &&
                                        reset({
                                            basis: data.basis,
                                            count_blank_as_wrong: data.count_blank_as_wrong,
                                            basic_min: data.basic_min,
                                            adequate_min: data.adequate_min,
                                            advanced_min: data.advanced_min,
                                        })
                                    }
                                >
                                    Restaurar
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={onSubmit}
                                    disabled={isSubmitting || !thresholdsValid}
                                    aria-pressed={isSubmitting ? "true" : "false"}
                                >
                                    Salvar
                                </Button>
                            </Stack>
                        </>
                    )}
                </Stack>
            </CardContent>

            {snack && (
                <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => (s ? { ...s, open: false } : s))}>
                    <Alert onClose={() => setSnack(null)} severity={snack.sev} variant="filled">
                        {snack.msg}
                    </Alert>
                </Snackbar>
            )}
        </Card>
    );
}
