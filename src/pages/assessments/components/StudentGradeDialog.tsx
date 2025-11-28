// src/pages/assessments/components/StudentGradeDialog.tsx
// Editor por aluno: navegação por TAB/⇦⇨ e envio incremental (create/update/delete)
import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Typography,
    Alert,
} from "@mui/material";
import type { MatrixQuestion } from "../../../types/assessments";
import { getStudentAssessmentResults, createStudentAnswer, updateStudentAnswer, deleteStudentAnswer } from "../../../api/studentAnswers";
import type { AnswerOption } from "../../../types/studentAnswers";

interface Props {
    open: boolean;
    assessment?: { id: number; class_id: number; title?: string };
    questions: MatrixQuestion[];
    students: Array<{ id: number; name: string }>;
    onClose: (changed: boolean) => void;
}

export default function StudentGradeDialog({ open, assessment, questions, students, onClose }: Props) {
    const [studentId, setStudentId] = React.useState<number | "">("");
    const [table, setTable] = React.useState<Record<number, { answerId?: number; marked?: AnswerOption }>>({});
    const [err, setErr] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);

    React.useEffect(() => {
        if (!open) {
            setStudentId("");
            setTable({});
            setErr(null);
        }
    }, [open]);

    // Carrega respostas existentes do aluno selecionado
    React.useEffect(() => {
        let cancel = false;
        async function pull() {
            if (!open || !assessment?.id || !studentId) return;
            setErr(null);
            const res = await getStudentAssessmentResults(Number(studentId), assessment.id);
            const list = (res.answers || res.responses || []) as Array<{ id: number; question_id: number; marked_option: AnswerOption }>;
            if (cancel) return;
            const next: Record<number, { answerId?: number; marked?: AnswerOption }> = {};
            list.forEach((a) => {
                next[a.question_id] = { answerId: a.id, marked: a.marked_option };
            });
            setTable(next);
        }
        pull();
        return () => {
            cancel = true;
        };
    }, [open, assessment?.id, studentId]);

    const setMark = (questionId: number, value: string) => {
        const v = value === "-" ? undefined : (value.toLowerCase() as AnswerOption);
        setTable((prev) => ({ ...prev, [questionId]: { answerId: prev[questionId]?.answerId, marked: v } }));
    };

    const handleSave = async () => {
        if (!assessment?.id || !studentId) return;
        setSubmitting(true);
        setErr(null);
        try {
            // Envia cada alteração individualmente (garante create/update/delete corretos)
            for (const q of questions) {
                const cell = table[q.id];
                if (!cell || typeof cell.marked === "undefined") {
                    // se havia uma resposta e agora ficou vazio → DELETE
                    if (cell?.answerId) await deleteStudentAnswer(cell.answerId);
                    continue;
                }
                if (cell.answerId) {
                    await updateStudentAnswer(cell.answerId, { marked_option: cell.marked });
                } else {
                    await createStudentAnswer({ student_id: Number(studentId), question_id: q.id, marked_option: cell.marked });
                }
            }
            onClose(true);
        } catch (e: any) {
            setErr(e?.response?.data?.message || "Erro ao salvar respostas do aluno.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="lg" fullWidth>
            <DialogTitle>Gabarito por aluno</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <FormControl size="small" sx={{ width: 360 }}>
                        <InputLabel id="student">Aluno</InputLabel>
                        <Select labelId="student" label="Aluno" value={studentId} onChange={(e) => setStudentId(e.target.value as number)}>
                            {students.map((s) => (
                                <MenuItem key={s.id} value={s.id}>
                                    {s.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {!studentId && (
                        <Typography variant="body2" sx={{ opacity: 0.8 }}>
                            Selecione um aluno para lançar as respostas.
                        </Typography>
                    )}

                    {studentId && (
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell width={80}>#</TableCell>
                                    <TableCell>Questão</TableCell>
                                    <TableCell width={280}>Resposta</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {questions.map((q, idx) => (
                                    <TableRow key={q.id}>
                                        <TableCell>Q{idx + 1}</TableCell>
                                        <TableCell title={`Nível: ${q.skill_level} | Correta: ${q.correct_option?.toUpperCase()}`}>
                                            <Typography variant="body2" noWrap>
                                                Nível: {q.skill_level} | Correta: {q.correct_option.toUpperCase()}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            <select
                                                value={table[q.id]?.marked?.toUpperCase() || "-"}
                                                onChange={(e) => setMark(q.id, e.target.value)}
                                                style={{ fontWeight: 700, padding: 6, minWidth: 120 }}
                                            >
                                                <option value="-">—</option>
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="C">C</option>
                                                <option value="D">D</option>
                                                <option value="E">E</option>
                                            </select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}

                    {err && <Alert severity="error">{err}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)}>Cancelar</Button>
                <Button variant="contained" disabled={!studentId || submitting} onClick={handleSave}>
                    Salvar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
