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
    Chip,
    MenuItem,
    Box,
} from "@mui/material";
import PublicIcon from "@mui/icons-material/Public";
import PersonIcon from "@mui/icons-material/Person";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createDescriptor, updateDescriptor } from "../../../api/descriptors";
import type { DescriptorCreate, DescriptorOut } from "../../../types/descriptors";

const schema = z.object({
    code: z
        .string()
        .min(1, "Informe o código")
        .max(16, "Máx. 16 caracteres"),
    title: z.string().min(1, "Informe o título").max(200, "Máx. 200 caracteres"),
    description: z.string().max(2000, "Máx. 2000 caracteres").optional(),
    area: z.string().max(80, "Máx. 80 caracteres").optional(),
    grade_year: z
        .union([z.coerce.number().int().min(1).max(9), z.literal("")])
        .optional()
        .transform((v) => (v === "" || v === undefined ? undefined : (v as number))),
});

type FormValues = z.infer<typeof schema>;

interface Props {
    open: boolean;
    initial?: DescriptorOut;
    currentRole: "admin" | "teacher";
    onClose: (changed: boolean) => void;
}

const YEARS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function DescriptorFormDialog({ open, initial, currentRole, onClose }: Props) {
    const isEdit = !!initial;
    const isGlobalEdit = isEdit && initial?.owner_teacher_id == null;

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            code: initial?.code || "",
            title: initial?.title || "",
            description: initial?.description || "",
            area: initial?.area || "",
            grade_year: initial?.grade_year ?? undefined,
        },
    });

    React.useEffect(() => {
        if (open) {
            reset({
                code: initial?.code || "",
                title: initial?.title || "",
                description: initial?.description || "",
                area: initial?.area || "",
                grade_year: initial?.grade_year ?? undefined,
            });
            setErrMsg(null);
        }
    }, [open, initial, reset]);

    const [errMsg, setErrMsg] = React.useState<string | null>(null);

    const onSubmit = handleSubmit(async (values) => {
        setErrMsg(null);
        try {
            const payload: DescriptorCreate = {
                code: values.code.trim().toUpperCase(),
                title: values.title.trim(),
                description: values.description?.trim() || undefined,
                area: values.area?.trim() || undefined,
                grade_year: values.grade_year,
            };
            if (isEdit) {
                await updateDescriptor(initial!.id, payload);
            } else {
                await createDescriptor(payload);
            }
            onClose(true);
        } catch (e: any) {
            const msg = e?.response?.data?.message || "Erro ao salvar descritor";
            setErrMsg(msg);
        }
    });

    const willBeGlobal = currentRole === "admin" && (!isEdit || isGlobalEdit);

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{isEdit ? "Editar descritor" : "Novo descritor"}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <Box>
                        {willBeGlobal ? (
                            <Chip
                                icon={<PublicIcon />}
                                label="Descritor global — visível para todos"
                                color="primary"
                                variant="outlined"
                                size="small"
                            />
                        ) : (
                            <Chip
                                icon={<PersonIcon />}
                                label="Descritor pessoal — visível apenas para você"
                                color="secondary"
                                variant="outlined"
                                size="small"
                            />
                        )}
                    </Box>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            label="Código"
                            placeholder="Ex.: D1"
                            sx={{ maxWidth: { sm: 160 } }}
                            inputProps={{ style: { textTransform: "uppercase" } }}
                            {...register("code")}
                            error={!!errors.code}
                            helperText={errors.code?.message}
                        />
                        <TextField
                            label="Título"
                            fullWidth
                            {...register("title")}
                            error={!!errors.title}
                            helperText={errors.title?.message}
                        />
                    </Stack>

                    <TextField
                        label="Descrição (opcional)"
                        multiline
                        minRows={3}
                        {...register("description")}
                        error={!!errors.description}
                        helperText={errors.description?.message}
                    />

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                            label="Área (opcional)"
                            placeholder="Ex.: Matemática"
                            {...register("area")}
                            error={!!errors.area}
                            helperText={errors.area?.message}
                        />
                        <TextField
                            select
                            label="Ano (opcional)"
                            defaultValue={initial?.grade_year ?? ""}
                            sx={{ minWidth: { sm: 180 } }}
                            {...register("grade_year")}
                            error={!!errors.grade_year}
                            helperText={errors.grade_year?.message as string | undefined}
                        >
                            <MenuItem value="">Sem ano</MenuItem>
                            {YEARS.map((y) => (
                                <MenuItem key={y} value={y}>
                                    {y}º ano
                                </MenuItem>
                            ))}
                        </TextField>
                    </Stack>

                    {errMsg && <Alert severity="error">{errMsg}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)}>Cancelar</Button>
                <Button variant="contained" disabled={isSubmitting} onClick={onSubmit}>
                    {isEdit ? "Salvar" : "Criar"}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
