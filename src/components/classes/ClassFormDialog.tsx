import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, Alert } from "@mui/material";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClass, updateClass } from "../../api/classes";
import type { ClassOut, ClassCreate } from "../../types/classes";
import TeachersCombo from "../TeachersCombo";
import type { TeacherOut } from "../../types/teachers";

const schema = z.object({
    name: z.string().min(1, "Informe o nome").max(120, "Máx. 120 caracteres"),
    year: z
        .number({
            error: (iss) => (iss.input === undefined ? "Informe o ano" : "Ano inválido"),
        })
        .int()
        .min(1900, { error: "Ano mínimo é 1900" })
        .max(2030, { error: "Ano máximo é 2030" }),
    teacher_id: z.number().int().positive().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
    open: boolean;
    initial?: ClassOut;
    currentRole: "admin" | "teacher";
    onClose: (changed: boolean) => void;
}

export default function ClassFormDialog({ open, initial, currentRole, onClose }: Props) {
    const isEdit = !!initial;
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: initial?.name || "",
            year: initial?.year || 2025,
            teacher_id: initial ? initial.teacher?.id : undefined,
        },
    });

    const [teacher, setTeacher] = React.useState<TeacherOut | null>(
        initial
            ? {
                  id: initial.teacher?.id!,
                  name: initial.teacher?.name!,
                  email: "",
                  role: "teacher",
              }
            : null
    );
    const [errMsg, setErrMsg] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (currentRole === "admin") setValue("teacher_id", teacher?.id);
    }, [teacher, currentRole, setValue]);

    const onSubmit = handleSubmit(async (values) => {
        setErrMsg(null);
        try {
            const payload: ClassCreate = {
                name: values.name,
                year: Number(values.year),
            };
            if (currentRole === "admin" && values.teacher_id) payload.teacher_id = values.teacher_id;
            if (isEdit) {
                await updateClass(initial!.id, payload);
            } else {
                await createClass(payload);
            }
            onClose(true);
        } catch (e: any) {
            const msg = e?.response?.data?.message || "Erro ao salvar turma";
            setErrMsg(msg);
        }
    });

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
            <DialogTitle>{isEdit ? "Editar turma" : "Nova turma"}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} sx={{ mt: 1 }}>
                    <TextField
                        label="Nome"
                        fullWidth
                        defaultValue={initial?.name || ""}
                        {...register("name")}
                        error={!!errors.name}
                        helperText={errors.name?.message}
                    />
                    <TextField
                        label="Ano"
                        type="number"
                        inputProps={{ min: 1900, max: 2100 }}
                        defaultValue={initial?.year || 2025}
                        {...register("year")}
                        error={!!errors.year}
                        helperText={errors.year?.message}
                    />

                    {currentRole === "admin" && (
                        <>
                            <TeachersCombo
                                label="Professor(a)"
                                value={teacher}
                                onChange={(t) => {
                                    setTeacher(t);
                                    setValue("teacher_id", t?.id);
                                }}
                            />
                            {errors.teacher_id && <Alert severity="warning">Selecione um professor(a)</Alert>}
                        </>
                    )}

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
