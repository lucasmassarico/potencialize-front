import React from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Box,
    Card,
    CardContent,
    Alert,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Stack,
    Pagination,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Tooltip,
    Chip,
    Skeleton,
    Switch,
    FormControlLabel,
    IconButton,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { getAssessmentMatrix } from "../../../api/assessments";
import type { MatrixCell, MatrixQuestion } from "../../../types/assessments";
import { getStudentAssessmentResults, createStudentAnswer, updateStudentAnswer, deleteStudentAnswer } from "../../../api/studentAnswers";
import type { AnswerOption } from "../../../types/studentAnswers";
import EditIcon from "@mui/icons-material/Edit";
import UploadIcon from "@mui/icons-material/Upload";
import StudentGradeDialog from "../components/StudentGradeDialog";
import AnswersBulkDialog from "../components/AnswersBulkDialog";

type AnswerIndex = Map<string, { id?: number; marked?: AnswerOption }>; // key: `${studentId}-${questionId}`

export default function AssessmentMatrix() {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const qc = useQueryClient();

    const [page, setPage] = React.useState(1);
    const [perPage, setPerPage] = React.useState(50); // backend: até 200

    const [editMode, setEditMode] = React.useState(false);
    const [answerIdx, setAnswerIdx] = React.useState<AnswerIndex>(new Map());

    const [gradeOpen, setGradeOpen] = React.useState(false);
    const [bulkOpen, setBulkOpen] = React.useState(false);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["assessmentMatrix", assessmentId, page, perPage],
        queryFn: () => getAssessmentMatrix(Number(assessmentId), { students_page: page, per_page: perPage }),
        enabled: !!assessmentId,
        staleTime: 30_000,
    });

    const cellMap = React.useMemo(() => {
        const m = new Map<string, MatrixCell>();
        (data?.cells || []).forEach((c) => m.set(`${c.student_id}-${c.question_id}`, c));
        return m;
    }, [data]);

    // Quando entrar no modo edição, buscamos os "answer_id" por aluno da página (1 req por aluno).
    React.useEffect(() => {
        let cancelled = false;
        async function hydrateAnswerIds() {
            if (!editMode || !data) return;
            const acc: AnswerIndex = new Map(answerIdx); // preserva o que já tem
            const promises = (data.students || []).map(async (s) => {
                const res = await getStudentAssessmentResults(s.id, Number(assessmentId));
                const list = (res.answers || res.responses || []) as Array<{ id: number; question_id: number; marked_option: AnswerOption }>;
                list.forEach((ans) => {
                    acc.set(`${s.id}-${ans.question_id}`, { id: ans.id, marked: ans.marked_option });
                });
            });
            await Promise.all(promises);
            if (!cancelled) setAnswerIdx(acc);
        }
        hydrateAnswerIds();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editMode, data, assessmentId]);

    const getCellStyles = (marked?: string, isCorrect?: boolean) => {
        if (!marked) return {};
        return (theme: any) => ({
            backgroundColor: isCorrect ? alpha(theme.palette.success.main, 0.18) : alpha(theme.palette.error.main, 0.18),
            outline: `1px solid ${isCorrect ? alpha(theme.palette.success.main, 0.35) : alpha(theme.palette.error.main, 0.35)}`,
            outlineOffset: -1,
        });
    };

    const renderHead = (q: MatrixQuestion, idx: number) => (
        <Tooltip
            key={q.id}
            title={
                <Box>
                    <b>Q{idx + 1}</b> — peso {q.weight}
                    <br />
                    Nível: {q.skill_level}
                    <br />
                    Correta: {q.correct_option.toUpperCase()}
                </Box>
            }
            arrow
        >
            <TableCell
                align="center"
                sx={{
                    position: "sticky",
                    top: 0,
                    backgroundColor: "background.paper",
                    zIndex: 2,
                    whiteSpace: "nowrap",
                    borderBottom: (t) => `1px solid ${t.palette.divider}`,
                }}
            >
                <Stack spacing={0.5} alignItems="center">
                    <Typography variant="caption" fontWeight={700}>
                        Q{idx + 1}
                    </Typography>
                    <Chip size="small" variant="outlined" label={q.skill_level} />
                </Stack>
            </TableCell>
        </Tooltip>
    );

    // Upsert “manual”: POST se não tem id; PUT se tem; DELETE se vazio (“—”).
    async function upsertAnswer(studentId: number, questionId: number, next: AnswerOption | null) {
        const key = `${studentId}-${questionId}`;
        const current = answerIdx.get(key); // { id?, marked? }

        // Otimista local
        setAnswerIdx((prev) => {
            const clone = new Map(prev);
            if (next) clone.set(key, { id: current?.id, marked: next });
            else clone.delete(key);
            return clone;
        });

        try {
            if (!next) {
                if (current?.id) await deleteStudentAnswer(current.id);
            } else if (current?.id) {
                await updateStudentAnswer(current.id, { marked_option: next });
            } else {
                const created = await createStudentAnswer({ student_id: studentId, question_id: questionId, marked_option: next });
                setAnswerIdx((prev) => {
                    const clone = new Map(prev);
                    clone.set(key, { id: created.id, marked: created.marked_option });
                    return clone;
                });
            }
            // atualiza matriz para refletir "is_correct"
            qc.invalidateQueries({ queryKey: ["assessmentMatrix", assessmentId] });
        } catch (e) {
            // Recarrega tudo em caso de erro
            qc.invalidateQueries({ queryKey: ["assessmentMatrix", assessmentId] });
        }
    }

    // Editor inline da célula
    function CellEditor({ studentId, questionId, shown, disabled }: { studentId: number; questionId: number; shown: string; disabled: boolean }) {
        const [value, setValue] = React.useState(shown);
        React.useEffect(() => setValue(shown), [shown]);

        const handleChange: React.ChangeEventHandler<HTMLSelectElement> = async (e) => {
            const raw = e.target.value;
            const next = raw === "-" ? null : (raw.toLowerCase() as AnswerOption);
            setValue(raw);
            await upsertAnswer(studentId, questionId, next);
        };

        return (
            <select
                aria-label="Resposta do aluno"
                value={value}
                onChange={handleChange}
                disabled={disabled}
                style={{
                    fontWeight: 700,
                    border: "none",
                    background: "transparent",
                    outline: "none",
                    cursor: disabled ? "default" : "pointer",
                }}
            >
                <option value="-">—</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
                <option value="D">D</option>
                <option value="E">E</option>
            </select>
        );
    }

    return (
        <Card>
            <CardContent sx={{ display: "grid", gap: 2 }}>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
                    <Typography variant="h6" sx={{ flex: 1 }}>
                        Matriz de Desempenho
                    </Typography>

                    <FormControl size="small" sx={{ width: 140 }}>
                        <InputLabel id="per-page">Alunos por Página</InputLabel>
                        <Select
                            labelId="per-page"
                            label="Alunos por Página"
                            value={perPage}
                            onChange={(e) => {
                                setPage(1);
                                setPerPage(Number(e.target.value));
                            }}
                        >
                            {[20, 50, 100, 200].map((n) => (
                                <MenuItem key={n} value={n}>
                                    {n}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControlLabel control={<Switch checked={editMode} onChange={(_, v) => setEditMode(v)} />} label="Editar respostas" />

                    <IconButton title="Gabarito por aluno" onClick={() => setGradeOpen(true)}>
                        <EditIcon />
                    </IconButton>
                    <IconButton title="Importar respostas (CSV/TSV)" onClick={() => setBulkOpen(true)}>
                        <UploadIcon />
                    </IconButton>
                </Stack>

                {isLoading && <Skeleton variant="text" width="100%" />}
                {isError && <Alert severity="error">Erro ao carregar a matriz.</Alert>}

                {data && (
                    <>
                        <TableContainer sx={{ maxWidth: "100%", overflow: "auto", borderRadius: 1, border: (t) => `1px solid ${t.palette.divider}` }}>
                            <Table size="small" stickyHeader aria-label="Matriz de Avaliação">
                                <TableHead>
                                    <TableRow>
                                        <TableCell
                                            sx={{
                                                position: "sticky",
                                                left: 0,
                                                zIndex: 3,
                                                top: 0,
                                                backgroundColor: "background.paper",
                                                whiteSpace: "nowrap",
                                                borderBottom: (t) => `1px solid ${t.palette.divider}`,
                                            }}
                                        >
                                            Alunos ({data.pagination.total_students})
                                        </TableCell>
                                        {data.questions.map(renderHead)}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.students.map((s) => (
                                        <TableRow key={s.id} hover>
                                            <TableCell
                                                sx={{
                                                    position: "sticky",
                                                    left: 0,
                                                    zIndex: 1,
                                                    backgroundColor: "background.paper",
                                                    whiteSpace: "nowrap",
                                                    maxWidth: 260,
                                                }}
                                                title={s.name}
                                            >
                                                <Typography noWrap>{s.name}</Typography>
                                            </TableCell>

                                            {data.questions.map((q) => {
                                                const c = cellMap.get(`${s.id}-${q.id}`);
                                                const shown = c?.marked_option ? c.marked_option.toUpperCase() : "—";

                                                return (
                                                    <TableCell key={`${s.id}-${q.id}`} align="center" sx={getCellStyles(c?.marked_option, c?.is_correct)}>
                                                        {editMode ? (
                                                            <CellEditor studentId={s.id} questionId={q.id} shown={shown} disabled={false} />
                                                        ) : (
                                                            <Typography variant="body2" fontWeight={700}>
                                                                {shown}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
                            <Pagination page={data.pagination.page} count={data.pagination.total_pages} onChange={(_, p) => setPage(p)} />
                        </Stack>

                        <Stack direction="row" spacing={2} alignItems="center" sx={{ opacity: 0.9 }}>
                            <Box
                                sx={(t) => ({
                                    width: 16,
                                    height: 16,
                                    borderRadius: 0.5,
                                    background: alpha(t.palette.success.main, 0.3),
                                    border: `1px solid ${alpha(t.palette.success.main, 0.5)}`,
                                })}
                            />
                            <Typography variant="caption">Correto</Typography>
                            <Box
                                sx={(t) => ({
                                    width: 16,
                                    height: 16,
                                    borderRadius: 0.5,
                                    background: alpha(t.palette.error.main, 0.3),
                                    border: `1px solid ${alpha(t.palette.error.main, 0.5)}`,
                                })}
                            />
                            <Typography variant="caption">Incorreto</Typography>
                            <Box sx={{ width: 16, height: 16, borderRadius: 0.5, border: (t) => `1px dashed ${t.palette.divider}` }} />
                            <Typography variant="caption">Não Respondeu</Typography>
                        </Stack>
                    </>
                )}

                {/* Dialogs auxiliares */}
                <StudentGradeDialog
                    open={gradeOpen}
                    assessment={data?.assessment}
                    questions={data?.questions || []}
                    students={data?.students || []}
                    onClose={(changed) => {
                        setGradeOpen(false);
                        if (changed) qc.invalidateQueries({ queryKey: ["assessmentMatrix", assessmentId] });
                    }}
                />
                <AnswersBulkDialog
                    open={bulkOpen}
                    assessmentId={Number(assessmentId)}
                    students={data?.students || []}
                    questions={data?.questions || []}
                    onClose={(changed) => {
                        setBulkOpen(false);
                        if (changed) qc.invalidateQueries({ queryKey: ["assessmentMatrix", assessmentId] });
                    }}
                />
            </CardContent>
        </Card>
    );
}
