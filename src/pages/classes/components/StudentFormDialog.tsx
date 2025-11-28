// src/pages/classes/components/StudentFormDialog.tsx
import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, Alert } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createStudent, updateStudent } from "../../../api/students";
import type { StudentOut } from "../../../types/students";

const schema = z.object({
    name: z.string().min(1, "Informe o nome"),
    register_code: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
    open: boolean;
    initial?: StudentOut;
    classId: number;
    onClose: (changed: boolean, saved?: StudentOut) => void;
}

export default function StudentFormDialog({ open, initial, classId, onClose }: Props) {
    const isEdit = !!initial;

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: "", register_code: "" },
    });

    React.useEffect(() => {
        reset({
            name: initial?.name ?? "",
            register_code: initial?.register_code ?? "",
        });
    }, [initial, reset, open]);

    const [errMsg, setErrMsg] = React.useState<string | null>(null);

    const onSubmit = handleSubmit(async (values) => {
        setErrMsg(null);
        try {
            const payload = {
                name: values.name,
                register_code: values.register_code || undefined,
                class_id: classId,
            };
            const saved = isEdit ? await updateStudent(initial!.id, payload) : await createStudent(payload);
            onClose(true, saved);
        } catch (e: any) {
            const msg = e?.response?.data?.message || "Erro ao salvar aluno";
            setErrMsg(msg);
        }
    });

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{isEdit ? "Editar aluno" : "Novo aluno"}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField label="Nome" fullWidth autoFocus {...register("name")} error={!!errors.name} helperText={errors.name?.message} />
                    <TextField
                        label="Código de chamada"
                        fullWidth
                        {...register("register_code")}
                        error={!!errors.register_code}
                        helperText={errors.register_code?.message || "Opcional. Use números/curto para fácil chamada."}
                        inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                    />
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
