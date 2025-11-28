import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    TextField,
    FormControl,
    Select,
    MenuItem,
    Alert,
    ToggleButtonGroup,
    ToggleButton,
    InputAdornment,
    FormLabel,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { QuestionOut, SkillLevel, Option } from "../../../types/questions";
import { createQuestion, updateQuestion } from "../../../api/questions";
import { getAssessment } from "../../../api/assessments";
import { useQuery } from "@tanstack/react-query";

const schema = z.object({
    text: z.string().min(1, "Informe o enunciado"),

    skill_level: z.enum(["abaixo", "basico", "adequado", "avancado"]),

    weight: z.coerce.number().min(0, "Peso deve ser ≥ 0"),

    correct_option: z.enum(["a", "b", "c", "d", "e"]),

    descriptor_id: z.number().int().positive().nullable().optional(),
});

const SKILL_LABEL: Record<SkillLevel, string> = {
    abaixo: "Abaixo do Básico",
    basico: "Básico",
    adequado: "Adequado",
    avancado: "Avançado",
};

interface Props {
    open: boolean;
    initial?: QuestionOut;
    assessmentId: number;
    onClose: (changed: boolean) => void;
    showWeight?: boolean;
}

type Schema = typeof schema;
type FormInput = z.input<Schema>; // antes da validação/coerção
type FormOutput = z.output<Schema>; // depois da validação (o que o Zod entrega)

export default function QuestionFormDialog({ open, initial, assessmentId, onClose }: Props) {
    const isEdit = !!initial;

    const { data: assess } = useQuery({
        queryKey: ["assessment-meta", assessmentId],
        queryFn: () => getAssessment(Number(assessmentId), "id,title,weight_mode"),
        enabled: !!assessmentId,
        staleTime: 30_000,
    });

    const isPerQuestion = assess?.weight_mode === "per_question";
    const isBySkill = assess?.weight_mode === "by_skill";

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
        setValue,
        watch,
    } = useForm<FormInput, any, FormOutput>({
        resolver: zodResolver(schema),
        defaultValues: {
            text: "",
            skill_level: "basico", // Valor fixo ao criar, quando o campo não aparece
            weight: 1,
            correct_option: "a",
            descriptor_id: null,
        },
    });

    React.useEffect(() => {
        reset({
            text: initial?.text ?? "",
            skill_level: initial?.skill_level ?? "basico", // Valores fixos, quando oculto
            weight: initial?.weight ?? 1,
            correct_option: initial?.correct_option ?? "a",
            descriptor_id: initial?.descriptor_id ?? null,
        });
    }, [initial, reset, open]);

    const [errMsg, setErrMsg] = React.useState<string | null>(null);

    const onSubmit = handleSubmit(async (values) => {
        setErrMsg(null);

        const weightToSend = isPerQuestion ? values.weight : 1; // Envia o peso quando for "per_question"

        const payload = {
            text: values.text,
            skill_level: isBySkill ? values.skill_level : "basico", // Envia "basico" quando não for "by_skill"
            weight: weightToSend,
            correct_option: values.correct_option,
            assessment_id: assessmentId,
            descriptor_id: values.descriptor_id ?? null,
        };

        try {
            if (isEdit) await updateQuestion(initial!.id, payload);
            else await createQuestion(payload);
            onClose(true);
        } catch (e: any) {
            const msg = e?.response?.data?.message || "Erro ao salvar questão.";
            setErrMsg(msg);
        }
    });

    const opt = watch("correct_option");

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="md" fullWidth>
            <DialogTitle>{isEdit ? "Editar questão" : "Nova questão"}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Enunciado"
                        fullWidth
                        multiline
                        minRows={3}
                        autoFocus
                        {...register("text")}
                        error={!!errors.text}
                        helperText={errors.text?.message}
                    />

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        {isBySkill && (
                            <FormControl fullWidth>
                                <Select
                                    displayEmpty
                                    value={watch("skill_level")}
                                    onChange={(e) => setValue("skill_level", e.target.value as SkillLevel)}
                                    renderValue={(v) => SKILL_LABEL[v as SkillLevel]}
                                    aria-label="Nível"
                                >
                                    {(["abaixo", "basico", "adequado", "avancado"] as SkillLevel[]).map((s) => (
                                        <MenuItem key={s} value={s}>
                                            {SKILL_LABEL[s]}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {isPerQuestion && ( // Mostrar peso apenas quando for per_question
                            <TextField
                                label="Peso"
                                type="number"
                                inputProps={{ step: "0.1", min: 0 }}
                                fullWidth
                                {...register("weight")}
                                error={!!errors.weight}
                                helperText={errors.weight?.message || "Peso relativo (ex.: 0, 1, 1.5, 2…)"}
                                InputProps={{ startAdornment: <InputAdornment position="start">×</InputAdornment> }}
                            />
                        )}

                        <FormControl fullWidth>
                            <FormLabel sx={{ mb: 1 }}>Alternativa correta</FormLabel>
                            <ToggleButtonGroup
                                exclusive
                                value={opt}
                                onChange={(_, val) => {
                                    if (val) setValue("correct_option", val as Option);
                                }}
                                aria-label="Alternativa correta"
                                sx={{
                                    flexWrap: "wrap",
                                    p: 0.5,
                                    border: (t) => `1px solid ${t.palette.divider}`,
                                    borderRadius: 1,
                                    "& .MuiToggleButton-root": {
                                        fontWeight: 700,
                                        minWidth: 33,
                                    },
                                    "& .Mui-selected": {
                                        bgcolor: (t) => t.palette.primary.main,
                                        color: (t) => t.palette.primary.contrastText,
                                        borderColor: (t) => t.palette.primary.dark,
                                        "&:hover": {
                                            bgcolor: (t) => t.palette.primary.dark,
                                        },
                                    },
                                }}
                            >
                                {(["a", "b", "c", "d", "e"] as Option[]).map((o) => (
                                    <ToggleButton key={o} value={o} aria-label={`Alternativa ${o.toUpperCase()}`}>
                                        {o.toUpperCase()}
                                    </ToggleButton>
                                ))}
                            </ToggleButtonGroup>
                        </FormControl>

                        <TextField
                            label="Descritor (opcional)"
                            type="number"
                            fullWidth
                            {...register("descriptor_id", {
                                setValueAs: (v) => (v === "" || v === undefined || v === null ? null : Number(v)),
                            })}
                            error={!!errors.descriptor_id}
                            helperText={errors.descriptor_id?.message || "Informe um inteiro (> 0) ou deixe em branco"}
                        />
                    </Stack>

                    {errMsg && <Alert severity="error">{errMsg}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button startIcon={<CloseIcon />} onClick={() => onClose(false)}>
                    Cancelar
                </Button>
                <Button startIcon={<SaveIcon />} variant="contained" disabled={isSubmitting} onClick={onSubmit}>
                    {isEdit ? "Salvar" : "Criar"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
