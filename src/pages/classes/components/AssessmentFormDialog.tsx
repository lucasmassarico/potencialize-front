import React from "react";
import {
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
    FormHelperText,
} from "@mui/material";
import ScaleOutlinedIcon from "@mui/icons-material/ScaleOutlined";
import AutoGraphOutlinedIcon from "@mui/icons-material/AutoGraphOutlined";
import QuizOutlinedIcon from "@mui/icons-material/QuizOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import dayjs from "../../../lib/dayjs";
import { createAssessment, updateAssessment } from "../../../api/assessments";
import type { AssessmentOut, AssessmentCreate, WeightMode, SubjectKind } from "../../../types/assessments";

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
        title: z.string().min(1, "Informe o título"),
        date: z.string().min(1, "Informe a data"),
        weight_mode: z.enum(["fixed_all", "by_skill", "per_question"]),
        subject_kind: subjectEnum,
        subject_other: z
            .string()
            .optional()
            .transform((v) => (v ?? "").trim()),
    })
    .refine((data) => data.subject_kind !== "outro" || (data.subject_other?.length ?? 0) > 0, { path: ["subject_other"], message: "Informe a disciplina." });

type FormValues = z.input<typeof schema>;

interface Props {
    open: boolean;
    initial?: AssessmentOut;
    classId: number;
    onClose: (changed: boolean) => void;
}

export default function AssessmentFormDialog({ open, initial, classId, onClose }: Props) {
    const isEdit = !!initial;

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            title: initial?.title || "",
            date: initial ? dayjs(initial.date).format("YYYY-MM-DDTHH:mm") : dayjs().format("YYYY-MM-DDTHH:mm"),
            weight_mode: (initial?.weight_mode as WeightMode) || "fixed_all",
            subject_kind: (initial?.subject_kind as SubjectKind) || "geral",
            subject_other: initial?.subject_other || "",
        },
        shouldFocusError: true,
    });

    const [errMsg, setErrMsg] = React.useState<string | null>(null);
    const chosenSubject = watch("subject_kind");

    const onSubmit = handleSubmit(async (values) => {
        setErrMsg(null);
        try {
            const payload: AssessmentCreate = {
                title: values.title,
                date: values.date,
                weight_mode: values.weight_mode,
                class_id: classId,
                subject_kind: values.subject_kind,
                subject_other: values.subject_kind === "outro" ? values.subject_other || "" : null,
            };
            if (isEdit) {
                await updateAssessment(initial!.id, payload);
            } else {
                await createAssessment(payload);
            }
            onClose(true);
        } catch (e: any) {
            const msg = e?.response?.data?.message || "Erro ao salvar avaliação";
            setErrMsg(msg);
        }
    });

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{isEdit ? "Editar avaliação" : "Nova avaliação"}</DialogTitle>

            <DialogContent dividers aria-busy={isSubmitting ? "true" : "false"} aria-live="polite">
                <form onSubmit={onSubmit} id="assessment-form">
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Título"
                            autoFocus
                            fullWidth
                            defaultValue={initial?.title || ""}
                            {...register("title")}
                            error={!!errors.title}
                            helperText={errors.title?.message}
                        />

                        <TextField
                            label="Data"
                            type="datetime-local"
                            defaultValue={initial ? dayjs(initial.date).format("YYYY-MM-DDTHH:mm") : dayjs().format("YYYY-MM-DDTHH:mm")}
                            {...register("date")}
                            error={!!errors.date}
                            helperText={errors.date?.message || "Use o formato local (com horas e minutos)."}
                            InputLabelProps={{ shrink: true }}
                            inputProps={{ "aria-describedby": "date-hint" }}
                        />
                        <FormHelperText id="date-hint">A data usa o fuso do navegador.</FormHelperText>

                        <TextField
                            select
                            label="Disciplina"
                            defaultValue={initial?.subject_kind || "geral"}
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
                            defaultValue={initial?.weight_mode || "fixed_all"}
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
