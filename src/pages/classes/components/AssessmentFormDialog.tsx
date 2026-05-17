import React from "react";
import {
    Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    TextField,
    Alert,
    MenuItem,
    ListItemIcon,
    ListItemText,
} from "@mui/material";
import ScaleOutlinedIcon from "@mui/icons-material/ScaleOutlined";
import AutoGraphOutlinedIcon from "@mui/icons-material/AutoGraphOutlined";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "../../../lib/dayjs";
import { normalizeAxiosError } from "../../../lib/error";
import { createAssessment, updateAssessment } from "../../../api/assessments";
import { listClasses } from "../../../api/classes";
import type { AssessmentOut, WeightMode, SubjectKind } from "../../../types/assessments";
import type { ClassOut } from "../../../types/classes";
import { buildAssessmentPayload } from "../utils/assessmentFormPayload";

const subjectEnum = z.enum([
    "portugues",
    "matematica",
    "ciencias",
    "historia",
    "geografia",
    "ingles",
    "artes",
    "educacao_fisica",
    "tecnologia",
    "redacao",
    "geral",
    "outro",
]);

const schema = z
    .object({
        title: z.string().trim().min(1, "Informe o título").max(160, "Use até 160 caracteres."),
        date: z.string().min(1, "Informe a data"),
        weight_mode: z.enum(["fixed_all", "by_skill", "per_question"]),
        subject_kind: subjectEnum,
        subject_other: z
            .string()
            .max(80, "Use até 80 caracteres.")
            .optional()
            .transform((v) => (v ?? "").trim()),
    })
    .refine((data) => data.subject_kind !== "outro" || (data.subject_other?.length ?? 0) > 0, { path: ["subject_other"], message: "Informe a disciplina." });

type FormValues = z.input<typeof schema>;

function getDefaultValues(initial?: AssessmentOut): FormValues {
    return {
        title: initial?.title || "",
        date: initial ? dayjs(initial.date).format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
        weight_mode: (initial?.weight_mode as WeightMode) || "fixed_all",
        subject_kind: (initial?.subject_kind as SubjectKind) || "geral",
        subject_other: initial?.subject_other || "",
    };
}

interface Props {
    open: boolean;
    initial?: AssessmentOut;
    /** Quando definido, fixa a turma; quando undefined, mostra Autocomplete de turma. */
    classId?: number;
    onClose: (changed: boolean) => void;
}

export default function AssessmentFormDialog({ open, initial, classId, onClose }: Props) {
    const isEdit = !!initial;
    const isStandalone = classId === undefined;

    const fixedClassId = classId ?? initial?.class_id;
    const [selectedClassId, setSelectedClassId] = React.useState<number | undefined>(fixedClassId);
    const [classError, setClassError] = React.useState<string | null>(null);

    const classesQuery = useQuery({
        queryKey: ["classes", "list-for-assessment-form"],
        queryFn: () => listClasses("id,name,year"),
        enabled: open && isStandalone && !isEdit,
        staleTime: 60_000,
    });

    React.useEffect(() => {
        if (open) {
            setSelectedClassId(fixedClassId);
            setClassError(null);
        }
    }, [open, fixedClassId]);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: getDefaultValues(initial),
        shouldFocusError: true,
    });

    const [errMsg, setErrMsg] = React.useState<string | null>(null);
    const chosenSubject = watch("subject_kind");

    React.useEffect(() => {
        if (!open) return;
        reset(getDefaultValues(initial));
        setErrMsg(null);
    }, [initial, open, reset]);

    const onSubmit = handleSubmit(async (values) => {
        setErrMsg(null);
        const effectiveClassId = classId ?? initial?.class_id ?? selectedClassId;
        if (!effectiveClassId) {
            setClassError("Selecione a turma.");
            return;
        }
        try {
            const payload = buildAssessmentPayload(values, effectiveClassId);
            if (isEdit) {
                await updateAssessment(initial!.id, payload);
            } else {
                await createAssessment(payload);
            }
            onClose(true);
        } catch (e: unknown) {
            setErrMsg(normalizeAxiosError(e).message || "Erro ao salvar avaliação");
        }
    });

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{isEdit ? "Editar avaliação" : "Nova avaliação"}</DialogTitle>

            <DialogContent dividers aria-busy={isSubmitting ? "true" : "false"} aria-live="polite">
                <form onSubmit={onSubmit} id="assessment-form">
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {isStandalone && !isEdit && (
                            <Autocomplete<ClassOut>
                                options={classesQuery.data ?? []}
                                loading={classesQuery.isLoading}
                                getOptionLabel={(c) => (c.year ? `${c.name} · ${c.year}` : c.name)}
                                isOptionEqualToValue={(opt, val) => opt.id === val.id}
                                value={(classesQuery.data ?? []).find((c) => c.id === selectedClassId) ?? null}
                                onChange={(_, val) => {
                                    setSelectedClassId(val?.id);
                                    if (val) setClassError(null);
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label="Turma"
                                        error={!!classError}
                                        helperText={classError || "Selecione a turma desta avaliação."}
                                        required
                                    />
                                )}
                            />
                        )}

                        <TextField
                            label="Título"
                            autoFocus={!isStandalone || isEdit}
                            fullWidth
                            {...register("title")}
                            error={!!errors.title}
                            helperText={errors.title?.message}
                        />

                        <TextField
                            label="Data"
                            type="date"
                            {...register("date")}
                            error={!!errors.date}
                            helperText={errors.date?.message || "Informe a data da avaliação."}
                            InputLabelProps={{ shrink: true }}
                        />

                        <TextField
                            select
                            label="Disciplina"
                            {...register("subject_kind")}
                            error={!!errors.subject_kind}
                            helperText={errors.subject_kind?.message || "Selecione a disciplina desta avaliação."}
                        >
                            {(
                                [
                                    ["geral", "Geral"],
                                    ["portugues", "Português"],
                                    ["matematica", "Matemática"],
                                    ["ciencias", "Ciências"],
                                    ["historia", "História"],
                                    ["geografia", "Geografia"],
                                    ["ingles", "Inglês"],
                                    ["artes", "Artes"],
                                    ["educacao_fisica", "Educação Física"],
                                    ["tecnologia", "Tecnologia"],
                                    ["redacao", "Redação"],
                                    ["outro", "Outro"],
                                ] as Array<[SubjectKind, string]>
                            ).map(([val, label]) => (
                                <MenuItem key={val} value={val}>
                                    <ListItemIcon>
                                        <MenuBookOutlinedIcon fontSize="small" />
                                    </ListItemIcon>
                                    <ListItemText primary={label} />
                                </MenuItem>
                            ))}
                        </TextField>

                        {chosenSubject === "outro" && (
                            <TextField
                                label="Disciplina (Outro)"
                                placeholder="Ex.: Robótica Educacional"
                                {...register("subject_other")}
                                error={!!errors.subject_other}
                                helperText={errors.subject_other?.message || "Informe o nome da disciplina."}
                            />
                        )}

                        <TextField
                            select
                            label="Modo de peso"
                            {...register("weight_mode")}
                            error={!!errors.weight_mode}
                            helperText={errors.weight_mode?.message || "Como as questões serão ponderadas no cálculo da nota."}
                        >
                            <MenuItem value="fixed_all">
                                <ListItemIcon>
                                    <ScaleOutlinedIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary="Mesmo peso" secondary="Todas as questões valem igualmente." />
                            </MenuItem>
                            <MenuItem value="by_skill">
                                <ListItemIcon>
                                    <AutoGraphOutlinedIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary="Por nível" secondary="Pesos variam por nível de habilidade." />
                            </MenuItem>
                            <MenuItem value="per_question">
                                <ListItemIcon>
                                    <QuizOutlinedIcon fontSize="small" />
                                </ListItemIcon>
                                <ListItemText primary="Por questão" secondary="Cada questão define seu próprio peso." />
                            </MenuItem>
                        </TextField>

                        {errMsg && (
                            <Alert severity="error" role="alert" aria-live="assertive">
                                {errMsg}
                            </Alert>
                        )}
                    </Stack>
                </form>
            </DialogContent>

            <DialogActions>
                <Button onClick={() => onClose(false)}>Cancelar</Button>
                <Button form="assessment-form" type="submit" variant="contained" disabled={isSubmitting} aria-pressed={isSubmitting ? "true" : "false"}>
                    {isEdit ? "Salvar" : "Criar"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
