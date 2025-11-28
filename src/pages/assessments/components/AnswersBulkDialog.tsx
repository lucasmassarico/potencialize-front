// src/pages/assessments/components/AnswersBulkDialog.tsx
// Importa linhas: student_id;question_id;marked_option  → POST /student-answers/bulk
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
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
} from "@mui/material";
import { z } from "zod";
import { bulkCreateStudentAnswers } from "../../../api/studentAnswers";
import type { AnswerOption } from "../../../types/studentAnswers";

const rowSchema = z.object({
    student_id: z.coerce.number().int().positive(),
    question_id: z.coerce.number().int().positive(),
    marked_option: z.enum(["a", "b", "c", "d", "e"]),
});

function parse(raw: string) {
    const lines = raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    if (!lines.length) return { items: [], errors: [] as string[] };

    const head = lines[0].toLowerCase();
    const hasHeader = ["student", "question", "marked"].every((k) => head.includes(k));
    const body = hasHeader ? lines.slice(1) : lines;

    const items: Array<{ student_id: number; question_id: number; marked_option: AnswerOption }> = [];
    const errors: string[] = [];

    body.forEach((l, i) => {
        const [sid, qid, mark] = l.split(/;|\t|,/).map((x) => x.trim());
        const parsed = rowSchema.safeParse({
            student_id: sid,
            question_id: qid,
            marked_option: (mark || "").toLowerCase(),
        });
        if (!parsed.success) {
            errors.push(`Linha ${i + 1}: ${parsed.error.issues.map((x) => x.message).join(", ")}`);
            return;
        }
        items.push(parsed.data);
    });

    return { items, errors };
}

interface Props {
    open: boolean;
    assessmentId: number; // (informativo, não usado no bulk)
    students: Array<{ id: number; name: string }>;
    questions: Array<{ id: number; correct_option: string }>;
    onClose: (changed: boolean) => void;
}

export default function AnswersBulkDialog({ open, onClose }: Props) {
    const [raw, setRaw] = React.useState("");
    const [preview, setPreview] = React.useState<Array<{ student_id: number; question_id: number; marked_option: AnswerOption }>>([]);
    const [parseErrors, setParseErrors] = React.useState<string[]>([]);
    const [err, setErr] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (!open) {
            setRaw("");
            setPreview([]);
            setParseErrors([]);
            setErr(null);
        }
    }, [open]);

    const handlePreview = () => {
        const { items, errors } = parse(raw);
        setPreview(items);
        setParseErrors(errors);
    };

    const handleImport = async () => {
        if (!preview.length) return;
        setSubmitting(true);
        setErr(null);
        try {
            await bulkCreateStudentAnswers(preview); // Apenas inserts; duplicados → 409
            onClose(true);
        } catch (e: any) {
            setErr(e?.response?.data?.message || "Erro na importação em lote (verifique duplicados).");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="lg" fullWidth>
            <DialogTitle>Importar respostas (CSV/TSV)</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Typography variant="body2">
                        Formato: <b>student_id;question_id;marked_option</b> (A…E). Header é opcional.
                    </Typography>

                    <TextField
                        label="Colar CSV/TSV"
                        multiline
                        minRows={6}
                        fullWidth
                        placeholder="student_id;question_id;marked_option"
                        value={raw}
                        onChange={(e) => setRaw(e.target.value)}
                    />

                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" onClick={handlePreview}>
                            Pré-visualizar
                        </Button>
                        <Button variant="contained" disabled={!preview.length || submitting} onClick={handleImport}>
                            Importar
                        </Button>
                    </Stack>

                    {err && <Alert severity="error">{err}</Alert>}
                    {!!parseErrors.length && <Alert severity="warning">{parseErrors.length} erro(s) no parse.</Alert>}

                    {!!preview.length && (
                        <>
                            <Typography variant="subtitle2">Pré-visualização ({preview.length})</Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Aluno (ID)</TableCell>
                                        <TableCell>Questão (ID)</TableCell>
                                        <TableCell>Marcada</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {preview.map((p, i) => (
                                        <TableRow key={i}>
                                            <TableCell>{p.student_id}</TableCell>
                                            <TableCell>{p.question_id}</TableCell>
                                            <TableCell>{p.marked_option.toUpperCase()}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)}>Fechar</Button>
                <Button variant="contained" disabled={!preview.length || submitting} onClick={handleImport}>
                    Importar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
