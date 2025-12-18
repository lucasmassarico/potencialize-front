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
    CircularProgress,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { getAssessmentMatrix } from "../../../api/assessments";
import type { MatrixCell, MatrixQuestion } from "../../../types/assessments";
import { getStudentAssessmentResults, createStudentAnswer, updateStudentAnswer, deleteStudentAnswer } from "../../../api/studentAnswers";
import type { AnswerOption, StudentAssessmentResultsOut } from "../../../types/studentAnswers";
import EditIcon from "@mui/icons-material/Edit";
import UploadIcon from "@mui/icons-material/Upload";
import StudentGradeDialog from "../components/StudentGradeDialog";
import AnswersBulkDialog from "../components/AnswersBulkDialog";
import type { SkillLevel } from "../../../types/questions";

type AnswerIndex = Map<string, { id?: number; marked?: AnswerOption }>; // key: `${studentId}-${questionId}`

const SKILL_LABEL: Record<SkillLevel, string> = {
    abaixo: "Abaixo do Básico",
    basico: "Básico",
    adequado: "Adequado",
    avancado: "Avançado",
};

const skillChipColor = (s: SkillLevel): "error" | "warning" | "info" | "success" => {
    switch (s) {
        case "abaixo":
            return "error";
        case "basico":
            return "warning";
        case "adequado":
            return "info";
        case "avancado":
            return "success";
    }
};

const predictedChipColor = (key?: string): "error" | "warning" | "info" | "success" | "default" => {
    switch ((key || "").toUpperCase()) {
        case "ABAIXO_BASICO":
            return "error"; // vermelho
        case "BASICO":
            return "warning"; // laranja
        case "ADEQUADO":
            return "info"; // azul
        case "AVANCADO":
            return "success"; // verde
        default:
            return "default";
    }
};

export default function AssessmentMatrix() {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const qc = useQueryClient();

    const [page, setPage] = React.useState(1);
    const [perPage, setPerPage] = React.useState(50); // backend: até 200

    const [editMode, setEditMode] = React.useState(false);
    const [answerIdx, setAnswerIdx] = React.useState<AnswerIndex>(new Map());

    const [gradeOpen, setGradeOpen] = React.useState(false);
    const [bulkOpen, setBulkOpen] = React.useState(false);

    // Células com request em andamento (para o editor inline)
    const MIN_PENDING_MS = 500;
    const [pending, setPending] = React.useState<Set<string>>(new Set());
    const pendingSinceRef = React.useRef<Map<string, number>>(new Map());
    const markPending = React.useCallback((key: string) => {
        setPending((prev) => {
            if (prev.has(key)) return prev;
            const clone = new Set(prev);
            clone.add(key);
            pendingSinceRef.current.set(key, performance.now());
            return clone;
        });
    }, []);
    const unmarkPending = React.useCallback((key: string) => {
        const startedAt = pendingSinceRef.current.get(key);
        const now = performance.now();
        const elapsed = startedAt ? now - startedAt : MIN_PENDING_MS;
        const remaining = MIN_PENDING_MS - elapsed;
        const clear = () => {
            setPending((prev) => {
                if (!prev.has(key)) return prev;
                const clone = new Set(prev);
                clone.delete(key);
                return clone;
            });
            pendingSinceRef.current.delete(key);
        };
        if (remaining <= 0) clear();
        else setTimeout(clear, remaining);
    }, []);
    const isPending = React.useCallback((key: string) => pending.has(key), [pending]);

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

    // ----- RESULTADO/PREDIÇÃO POR ALUNO (nova coluna) -----
    type StudentResultLite = {
        label: string;
        key: string;
        percent: number; // 0..100
        basis: "by_points" | "by_accuracy";
        totals?: StudentAssessmentResultsOut["score"]["totals"];
        policy?: StudentAssessmentResultsOut["policy"];
    };

    const [resultMap, setResultMap] = React.useState<Map<number, StudentResultLite>>(new Map());
    const [resultLoading, setResultLoading] = React.useState<Set<number>>(new Set());

    const fetchStudentResult = React.useCallback(
        async (studentId: number) => {
            setResultLoading((s) => new Set(s).add(studentId));
            try {
                const res = await getStudentAssessmentResults(studentId, Number(assessmentId));
                setResultMap((prev) => {
                    const clone = new Map(prev);
                    clone.set(studentId, {
                        label: res.predicted_level?.label ?? "—",
                        key: res.predicted_level?.key ?? "",
                        percent: res.score?.percent ?? 0,
                        basis: res.score?.basis ?? "by_points",
                        totals: res.score?.totals,
                        policy: res.policy,
                    });
                    return clone;
                });
            } finally {
                setResultLoading((s) => {
                    const clone = new Set(s);
                    clone.delete(studentId);
                    return clone;
                });
            }
        },
        [assessmentId]
    );

    // Busca resultados da página atual (1 request por aluno visualizado)
    React.useEffect(() => {
        let cancelled = false;
        async function run() {
            if (!data) return;
            const promises = (data.students || []).map(async (s) => {
                await fetchStudentResult(s.id);
            });
            await Promise.all(promises);
            if (cancelled) return;
        }
        run();
        return () => {
            cancelled = true;
        };
    }, [data, fetchStudentResult]);

    // ----- Hydrate dos answer_id quando entrar em modo edição (já existia) -----
    React.useEffect(() => {
        let cancelled = false;
        async function hydrateAnswerIds() {
            if (!editMode || !data) return;
            const acc: AnswerIndex = new Map(answerIdx);
            const promises = (data.students || []).map(async (s) => {
                const res = await getStudentAssessmentResults(s.id, Number(assessmentId));
                const list = (res.answers || (res as any).responses || []) as Array<{
                    answer_id?: number;
                    id?: number;
                    question_id: number;
                    marked_option: AnswerOption;
                }>;
                list.forEach((ans) => {
                    const aid = typeof ans.answer_id === "number" ? ans.answer_id : ans.id!;
                    acc.set(`${s.id}-${ans.question_id}`, { id: aid, marked: ans.marked_option });
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

    const getCellStyles = (marked?: string, isCorrect?: boolean, pendingFlag?: boolean) => {
        if (pendingFlag) return {};
        if (!marked) return {};
        return (theme: any) => ({
            backgroundColor: isCorrect ? alpha(theme.palette.success.main, 0.18) : alpha(theme.palette.error.main, 0.18),
            outline: `1px solid ${isCorrect ? alpha(theme.palette.success.main, 0.35) : alpha(theme.palette.error.main, 0.35)}`,
            outlineOffset: -1,
        });
    };

    const renderHead = (q: MatrixQuestion, idx: number) => {
        const lvl = q.skill_level as SkillLevel;
        return (
            <Tooltip
                key={q.id}
                title={
                    <Box>
                        <b>Q{idx + 1}</b> — peso {q.weight}
                        <br />
                        Nível: {SKILL_LABEL[lvl]}
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
                        <Chip size="small" color={skillChipColor(lvl)} variant="filled" label={SKILL_LABEL[lvl]} />
                    </Stack>
                </TableCell>
            </Tooltip>
        );
    };

    // Recalcular resultado do aluno quando editar uma resposta
    const refreshRowResult = React.useCallback(
        async (studentId: number) => {
            await fetchStudentResult(studentId);
        },
        [fetchStudentResult]
    );

    // Upsert “manual”: POST/PUT/DELETE
    async function upsertAnswer(studentId: number, questionId: number, next: AnswerOption | null) {
        const key = `${studentId}-${questionId}`;
        const current = answerIdx.get(key);

        markPending(key);

        // Otimista local
        setAnswerIdx((prev) => {
            const clone = new Map(prev);
            if (next) clone.set(key, { id: current?.id, marked: next });
            else clone.delete(key);
            return clone;
        });

        try {
            if (!next) {
                let answerId = current?.id;
                if (!answerId) {
                    const res = await getStudentAssessmentResults(studentId, Number(assessmentId));
                    const list = (res.answers || (res as any).responses || []) as Array<{ answer_id?: number; id?: number; question_id: number }>;
                    answerId = list.find((a) => a.question_id === questionId)?.id;
                }
                if (answerId) await deleteStudentAnswer(answerId);
            } else if (current?.id) {
                await updateStudentAnswer(current.id, { marked_option: next });
            } else {
                try {
                    const created = await createStudentAnswer({
                        student_id: studentId,
                        question_id: questionId,
                        marked_option: next,
                    });
                    setAnswerIdx((prev) => {
                        const clone = new Map(prev);
                        clone.set(key, { id: created.id, marked: created.marked_option });
                        return clone;
                    });
                } catch (e: any) {
                    const status = e?.response?.status;
                    if (status === 409) {
                        const res = await getStudentAssessmentResults(studentId, Number(assessmentId));
                        const list = (res.answers || (res as any).responses || []) as Array<{ answer_id?: number; id?: number; question_id: number }>;
                        const existingId = list.find((a) => a.question_id === questionId)?.id;
                        if (existingId) {
                            await updateStudentAnswer(existingId, { marked_option: next });
                            setAnswerIdx((prev) => {
                                const clone = new Map(prev);
                                clone.set(key, { id: existingId, marked: next });
                                return clone;
                            });
                        }
                    } else {
                        throw e;
                    }
                }
            }

            // Revalida a matriz e atualiza o resultado do aluno alterado
            qc.invalidateQueries({ queryKey: ["assessmentMatrix", assessmentId] });
            await refreshRowResult(studentId);
        } catch {
            qc.invalidateQueries({ queryKey: ["assessmentMatrix", assessmentId] });
        } finally {
            unmarkPending(key);
        }
    }

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
                        <TableContainer
                            sx={{
                                maxWidth: "100%",
                                overflow: "auto",
                                borderRadius: 1,
                                border: (t) => `1px solid ${t.palette.divider}`,
                            }}
                        >
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
                                        {/* ➕ NOVA COLUNA: Resultado (predição do aluno) */}
                                        <TableCell
                                            width={200}
                                            sx={{
                                                top: 0,
                                                position: "sticky",
                                                left: 240, // ajuste fino se quiser manter “Resultado” parcialmente preso; remova 'position' e 'left' se preferir não-sticky
                                                zIndex: 2,
                                                backgroundColor: "background.paper",
                                                borderBottom: (t) => `1px solid ${t.palette.divider}`,
                                            }}
                                        >
                                            Resultado
                                        </TableCell>

                                        {data.questions.map(renderHead)}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.students.map((s) => {
                                        const res = resultMap.get(s.id);
                                        const loading = resultLoading.has(s.id);
                                        const chipLabel = res ? `${res.label} • ${Math.round(res.percent)}%` : "—";

                                        return (
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

                                                {/* ➕ CÉLULA DO RESULTADO */}
                                                <TableCell
                                                    sx={{
                                                        whiteSpace: "nowrap",
                                                        maxWidth: 240,
                                                    }}
                                                >
                                                    {loading ? (
                                                        <Stack direction="row" spacing={1} alignItems="center">
                                                            <CircularProgress size={16} />
                                                            <Typography variant="body2" sx={{ opacity: 0.7 }}>
                                                                Calculando…
                                                            </Typography>
                                                        </Stack>
                                                    ) : res ? (
                                                        <Tooltip
                                                            arrow
                                                            title={
                                                                <Box>
                                                                    <b>{res.label}</b> — {res.percent.toFixed(1)}%
                                                                    <br />
                                                                    Base: {res.basis === "by_points" ? "Por pontos" : "Por acurácia"}
                                                                    {res.totals && (
                                                                        <>
                                                                            <br />
                                                                            Respondidas/Corretas: {res.totals.answered}/{res.totals.correct}
                                                                            <br />
                                                                            Questões: {res.totals.questions}
                                                                            {res.basis === "by_points" && (
                                                                                <>
                                                                                    <br />
                                                                                    Pontos: {res.totals.points_correct} / {res.totals.points_total}
                                                                                </>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                    {res.policy && (
                                                                        <>
                                                                            <br />
                                                                            Classificação: Básico ≥ {res.policy.basic_min}% · Adequado ≥{" "}
                                                                            {res.policy.adequate_min}% · Avançado ≥ {res.policy.advanced_min}%
                                                                            <br />
                                                                            Branco conta? {res.policy.count_blank_as_wrong ? "Sim" : "Não"}
                                                                        </>
                                                                    )}
                                                                </Box>
                                                            }
                                                        >
                                                            <Chip size="small" variant="filled" color={predictedChipColor(res.key)} label={chipLabel} />
                                                        </Tooltip>
                                                    ) : (
                                                        <Chip size="small" label="—" />
                                                    )}
                                                </TableCell>

                                                {data.questions.map((q) => {
                                                    const key = `${s.id}-${q.id}`;
                                                    const pendingFlag = isPending(key);
                                                    const c = cellMap.get(key);
                                                    const shown = c?.marked_option ? c.marked_option.toUpperCase() : "—";

                                                    return (
                                                        <TableCell key={key} align="center" sx={getCellStyles(c?.marked_option, c?.is_correct, pendingFlag)}>
                                                            {pendingFlag ? (
                                                                <CircularProgress size={16} />
                                                            ) : editMode ? (
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
                                        );
                                    })}
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
                            <Box
                                sx={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: 0.5,
                                    border: (t) => `1px dashed ${t.palette.divider}`,
                                }}
                            />
                            <Typography variant="caption">Não Respondeu</Typography>
                        </Stack>

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
                    </>
                )}
            </CardContent>
        </Card>
    );
}
