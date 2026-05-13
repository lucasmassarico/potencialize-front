import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    FormControl,
    Grid,
    InputAdornment,
    InputLabel,
    LinearProgress,
    ListItemIcon,
    Menu,
    MenuItem,
    Paper,
    Select,
    type SelectChangeEvent,
    Skeleton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableSortLabel,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import SearchIcon from "@mui/icons-material/Search";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";

import { getAssessmentMatrix, getAssessmentOverview } from "../../../api/assessments";
import type { AssessmentOverviewDTO, OverviewByQuestion, OverviewRankCriteria, OverviewRankedItem, SkillLevel } from "../../../types/assessments";
import type { AssessmentOverviewStudentPerformanceInput } from "../utils/assessmentOverviewReport";

const SKILL_LABELS: Record<SkillLevel, string> = {
    abaixo: "Abaixo do Básico",
    basico: "Básico",
    adequado: "Adequado",
    avancado: "Avançado",
};

const SKILL_ORDER: Record<SkillLevel, number> = {
    abaixo: 1,
    basico: 2,
    adequado: 3,
    avancado: 4,
};

type SemanticColor = "error" | "warning" | "info" | "success";

const SKILL_COLOR: Record<SkillLevel, SemanticColor> = {
    abaixo: "error",
    basico: "warning",
    adequado: "info",
    avancado: "success",
};

const OPTION_LETTERS = ["a", "b", "c", "d", "e"] as const;
type OptionLetter = (typeof OPTION_LETTERS)[number];

const SUBJECT_LABELS: Record<string, string> = {
    portugues: "Português",
    matematica: "Matemática",
    ciencias: "Ciências",
    historia: "História",
    geografia: "Geografia",
    ingles: "Inglês",
    artes: "Artes",
    educacao_fisica: "Educação Física",
    tecnologia: "Tecnologia",
    redacao: "Redação",
    geral: "Geral",
    outro: "Outro",
};

const formatPercent = (v: number | null | undefined, digits = 1): string => {
    if (v == null || !Number.isFinite(v)) return "—";
    const clamped = Math.max(0, Math.min(1, v));
    return `${(clamped * 100).toFixed(digits)}%`;
};

const safeNumber = (v: number | undefined | null): number => (Number.isFinite(v as number) ? (v as number) : 0);

const questionNumberLabel = (q: { display_order?: number; question_id: number }): string => `Questão ${q.display_order ?? q.question_id}`;

const subjectLabel = (kind?: string, other?: string | null): string | null => {
    if (!kind) return null;
    if (kind === "outro") return other?.trim() || "Outro";
    return SUBJECT_LABELS[kind] ?? kind;
};

const formatRankBasis = (basis: string): string => {
    const map: Record<string, string> = {
        accuracy_asc: "Menor taxa de acerto",
        accuracy_desc: "Maior taxa de acerto",
        accuracy: "Taxa de acerto",
    };
    return map[basis] ?? basis;
};

const buildRankCriteriaText = (criteria: OverviewRankCriteria | undefined): string => {
    if (!criteria) return "";
    const top = criteria.top_n ?? 3;
    const min = criteria.min_answers ?? 5;
    return `Top ${top} questões pelo critério "${formatRankBasis(criteria.basis)}". Considera apenas questões com no mínimo ${min} respostas.`;
};

const csvEscape = (value: unknown): string => {
    const s = value == null ? "" : String(value);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
};

const downloadBlob = (filename: string, blob: Blob): void => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const slugify = (s: string): string => {
    const cleaned = s
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
    return cleaned || "avaliacao";
};

const PDF_STUDENT_EXPORT_PAGE_SIZE = 200;

const fetchStudentPerformanceForPdf = async (assessmentId: number): Promise<AssessmentOverviewStudentPerformanceInput> => {
    const firstPage = await getAssessmentMatrix(assessmentId, {
        students_page: 1,
        per_page: PDF_STUDENT_EXPORT_PAGE_SIZE,
    });
    const totalPages = Math.max(1, safeNumber(firstPage.pagination.total_pages));
    const remainingPages =
        totalPages > 1
            ? await Promise.all(
                  Array.from({ length: totalPages - 1 }, (_, index) =>
                      getAssessmentMatrix(assessmentId, {
                          students_page: index + 2,
                          per_page: PDF_STUDENT_EXPORT_PAGE_SIZE,
                      }),
                  ),
              )
            : [];
    const pages = [firstPage, ...remainingPages];
    const studentsById = new Map<number, AssessmentOverviewStudentPerformanceInput["students"][number]>();
    const summariesByStudentId = new Map<number, AssessmentOverviewStudentPerformanceInput["studentSummaries"][number]>();

    pages.forEach((page) => {
        page.students.forEach((student) => {
            if (!studentsById.has(student.id)) studentsById.set(student.id, student);
        });
        page.student_summaries.forEach((summary) => {
            summariesByStudentId.set(summary.student_id, summary);
        });
    });

    return {
        students: Array.from(studentsById.values()),
        studentSummaries: Array.from(summariesByStudentId.values()),
    };
};

interface KPICardProps {
    title: string;
    value: string;
    subtitle?: string;
    color?: SemanticColor;
}

function KPICard({ title, value, subtitle, color }: KPICardProps) {
    const theme = useTheme();
    const accent = color ? theme.palette[color].main : theme.palette.primary.main;
    return (
        <Card sx={{ height: "100%", borderTop: `3px solid ${accent}` }}>
            <CardContent>
                <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.6 }}>
                    {title}
                </Typography>
                <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5, mb: 0.5, color: "text.primary" }}>
                    {value}
                </Typography>
                {subtitle && (
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {subtitle}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}

function SkillChip({ level, size = "small" }: { level: SkillLevel; size?: "small" | "medium" }) {
    return <Chip size={size} color={SKILL_COLOR[level]} variant="outlined" label={SKILL_LABELS[level]} />;
}

function AccuracyBar({ value, color = "primary" }: { value: number; color?: "primary" | SemanticColor }) {
    const pct = Math.max(0, Math.min(1, value)) * 100;
    return (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 140 }}>
            <LinearProgress variant="determinate" value={pct} color={color} sx={{ flex: 1, height: 8, borderRadius: 999 }} aria-label="Taxa de acerto" />
            <Typography variant="caption" fontWeight={600} sx={{ minWidth: 44, textAlign: "right" }}>
                {formatPercent(value)}
            </Typography>
        </Stack>
    );
}

interface OptionDistributionBarProps {
    dist: OverviewByQuestion["option_distribution"];
    correct: OptionLetter;
}

function OptionDistributionBar({ dist, correct }: OptionDistributionBarProps) {
    const theme = useTheme();
    const segments: Array<{ key: OptionLetter | "blank"; label: string; count: number }> = [
        ...OPTION_LETTERS.map((l) => ({ key: l, label: l.toUpperCase(), count: safeNumber(dist[l]) })),
        { key: "blank", label: "Branco", count: safeNumber(dist.blank) },
    ];
    const total = segments.reduce((acc, t) => acc + t.count, 0);

    if (total === 0) {
        return (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Sem distribuição
            </Typography>
        );
    }

    return (
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 200 }} aria-label="Distribuição por alternativa">
            {segments.map((seg) => {
                const pct = (seg.count / total) * 100;
                const isCorrect = seg.key === correct;
                const isBlank = seg.key === "blank";
                const bg = isCorrect ? theme.palette.success.main : isBlank ? theme.palette.grey[400] : theme.palette.grey[500];
                if (pct === 0) return null;
                return (
                    <Tooltip key={seg.key} title={`${seg.label}${isCorrect ? " (gabarito)" : ""}: ${seg.count} (${pct.toFixed(0)}%)`} arrow>
                        <Box
                            sx={{
                                flex: pct,
                                minWidth: 6,
                                height: 14,
                                borderRadius: 0.5,
                                backgroundColor: bg,
                                border: isCorrect ? `1px solid ${theme.palette.success.dark}` : "none",
                            }}
                        />
                    </Tooltip>
                );
            })}
        </Stack>
    );
}

function RankedQuestionCard({ item, accent }: { item: OverviewRankedItem; accent: SemanticColor }) {
    const theme = useTheme();
    return (
        <Paper variant="outlined" sx={{ p: 1.5, borderLeft: `3px solid ${theme.palette[accent].main}` }}>
            <Stack spacing={1}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1} flexWrap="wrap">
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="body2" fontWeight={700}>
                            {questionNumberLabel(item)}
                        </Typography>
                        <SkillChip level={item.skill_level} />
                        {item.descriptor_code && <Chip size="small" variant="outlined" label={item.descriptor_code} />}
                    </Stack>
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        {item.answers} respostas
                    </Typography>
                </Stack>
                <Typography variant="body2" sx={{ color: "text.primary" }}>
                    {item.text_short || "(sem enunciado)"}
                </Typography>
                <AccuracyBar value={safeNumber(item.accuracy)} color={accent} />
            </Stack>
        </Paper>
    );
}

function AssessmentOverviewSkeleton() {
    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Grid container spacing={2}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                        <Card>
                            <CardContent>
                                <Skeleton width={120} />
                                <Skeleton width={80} height={42} />
                                <Skeleton width={140} />
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 12 }}>
                    <Card>
                        <CardContent>
                            <Skeleton width={180} height={28} />
                            <Skeleton variant="rounded" height={220} sx={{ mt: 1 }} />
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
            <Card>
                <CardContent>
                    <Skeleton width={220} height={28} />
                    <Skeleton variant="rounded" height={300} sx={{ mt: 1 }} />
                </CardContent>
            </Card>
        </Box>
    );
}

type SortKey = "id" | "accuracy" | "answers";
type SortDir = "asc" | "desc";

export default function AssessmentOverview() {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const theme = useTheme();
    const { data, isLoading, isError } = useQuery({
        queryKey: ["assessmentOverview", assessmentId],
        queryFn: () => getAssessmentOverview(Number(assessmentId)),
        enabled: !!assessmentId,
    });

    const [search, setSearch] = useState<string>("");
    const [skillFilter, setSkillFilter] = useState<SkillLevel | "all">("all");
    const [descriptorFilter, setDescriptorFilter] = useState<string>("all");
    const [sortKey, setSortKey] = useState<SortKey>("accuracy");
    const [sortDir, setSortDir] = useState<SortDir>("asc");
    const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);
    const [isPdfExporting, setIsPdfExporting] = useState(false);
    const [pdfExportError, setPdfExportError] = useState<string | null>(null);

    const ov: AssessmentOverviewDTO | undefined = data;

    const skillsSorted = useMemo(() => {
        if (!ov) return [];
        return [...ov.by_skill].sort((a, b) => SKILL_ORDER[a.skill_level] - SKILL_ORDER[b.skill_level]);
    }, [ov]);

    const descriptorOptions = useMemo(() => {
        if (!ov) return [] as Array<{ id: number; code: string; label: string }>;
        const map = new Map<number, { id: number; code: string; label: string }>();
        for (const q of ov.by_question) {
            if (q.descriptor_id != null && !map.has(q.descriptor_id)) {
                const code = q.descriptor_code ?? `#${q.descriptor_id}`;
                const title = q.descriptor_title ?? "";
                map.set(q.descriptor_id, {
                    id: q.descriptor_id,
                    code,
                    label: title ? `${code} — ${title}` : code,
                });
            }
        }
        return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
    }, [ov]);

    const filteredQuestions = useMemo<OverviewByQuestion[]>(() => {
        if (!ov) return [];
        const term = search.trim().toLowerCase();
        const list = ov.by_question.filter((q) => {
            if (skillFilter !== "all" && q.skill_level !== skillFilter) return false;
            if (descriptorFilter !== "all" && String(q.descriptor_id ?? "") !== descriptorFilter) return false;
            if (term) {
                const haystack =
                    `${q.display_order} ${q.display_label ?? ""} ${q.question_id} ${q.text_short ?? ""} ${q.descriptor_code ?? ""} ${q.descriptor_title ?? ""}`.toLowerCase();
                if (!haystack.includes(term)) return false;
            }
            return true;
        });
        const dir = sortDir === "asc" ? 1 : -1;
        return list.sort((a, b) => {
            const av = sortKey === "id" ? (a.display_order ?? a.question_id) : sortKey === "answers" ? a.answers : a.accuracy;
            const bv = sortKey === "id" ? (b.display_order ?? b.question_id) : sortKey === "answers" ? b.answers : b.accuracy;
            return (av - bv) * dir;
        });
    }, [ov, search, skillFilter, descriptorFilter, sortKey, sortDir]);

    if (isLoading) return <AssessmentOverviewSkeleton />;
    if (isError || !ov) return <Alert severity="error">Falha ao carregar overview.</Alert>;

    const participation = safeNumber(ov.population.participation_rate);
    const studentsAnswered = safeNumber(ov.population.students_answered_any);
    const studentsTotal = safeNumber(ov.population.students_in_class);
    const accuracy = safeNumber(ov.overall.accuracy);
    const totalAnswers = safeNumber(ov.overall.total_answers);
    const totalQuestions = safeNumber(ov.overall.total_questions);
    const correct = safeNumber(ov.overall.correct);
    const hardestTop = ov.hardest[0];
    const subject = subjectLabel(ov.assessment.subject_kind, ov.assessment.subject_other ?? null);
    const filenameBase = `${slugify(ov.assessment.title || `avaliacao-${ov.assessment.id}`)}-overview`;

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }
    };

    const handleExportCSV = () => {
        setExportAnchor(null);
        const header = ["#", "Enunciado", "Nível", "Descritor", "Peso", "Gabarito", "Respondidas", "Corretas", "Acerto (%)", "A", "B", "C", "D", "E", "Branco"];
        const rows = ov.by_question.map((q) => [
            q.display_order ?? q.question_id,
            q.text_short ?? "",
            SKILL_LABELS[q.skill_level],
            q.descriptor_code ?? "",
            q.weight,
            q.correct_option.toUpperCase(),
            q.answers,
            q.correct,
            (q.accuracy * 100).toFixed(1),
            q.option_distribution.a,
            q.option_distribution.b,
            q.option_distribution.c,
            q.option_distribution.d,
            q.option_distribution.e,
            q.option_distribution.blank,
        ]);
        const csv = [header, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
        const utf8Bom = String.fromCharCode(0xfeff);
        const blob = new Blob([utf8Bom + csv], { type: "text/csv;charset=utf-8" });
        downloadBlob(`${filenameBase}.csv`, blob);
    };

    const handleExportXLSX = async () => {
        setExportAnchor(null);
        const XLSX = await import("xlsx");
        const wb = XLSX.utils.book_new();

        const summary: Array<Array<string | number>> = [
            ["Avaliação", ov.assessment.title],
            ["Data", ov.assessment.date],
            ["Disciplina", subject ?? "—"],
            [],
            ["Indicador", "Valor"],
            ["Taxa de acerto geral", `${(accuracy * 100).toFixed(1)}%`],
            ["Participação", `${(participation * 100).toFixed(1)}%`],
            ["Alunos que responderam", `${studentsAnswered}/${studentsTotal}`],
            ["Questões respondidas", `${totalAnswers}/${totalQuestions}`],
            ["Respostas corretas", correct],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Resumo");

        const skillSheet = [
            ["Nível", "Questões", "Respondidas", "Corretas", "Acerto (%)", "Alunos que responderam"],
            ...skillsSorted.map((s) => [SKILL_LABELS[s.skill_level], s.questions, s.answers, s.correct, (s.accuracy * 100).toFixed(1), s.students_answered]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(skillSheet), "Por nível");

        const questionsSheet = [
            [
                "#",
                "Enunciado",
                "Nível",
                "Descritor",
                "Título do descritor",
                "Peso",
                "Gabarito",
                "Respondidas",
                "Corretas",
                "Acerto (%)",
                "A",
                "B",
                "C",
                "D",
                "E",
                "Branco",
            ],
            ...ov.by_question.map((q) => [
                q.display_order ?? q.question_id,
                q.text_short ?? "",
                SKILL_LABELS[q.skill_level],
                q.descriptor_code ?? "",
                q.descriptor_title ?? "",
                q.weight,
                q.correct_option.toUpperCase(),
                q.answers,
                q.correct,
                (q.accuracy * 100).toFixed(1),
                q.option_distribution.a,
                q.option_distribution.b,
                q.option_distribution.c,
                q.option_distribution.d,
                q.option_distribution.e,
                q.option_distribution.blank,
            ]),
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(questionsSheet), "Por questão");

        const rankedHeader = ["#", "Enunciado", "Nível", "Descritor", "Acerto (%)", "Respondidas"];
        const toRankedRow = (q: OverviewRankedItem) => [
            q.display_order ?? q.question_id,
            q.text_short ?? "",
            SKILL_LABELS[q.skill_level],
            q.descriptor_code ?? "",
            (q.accuracy * 100).toFixed(1),
            q.answers,
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([rankedHeader, ...ov.hardest.map(toRankedRow)]), "Mais difíceis");
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([rankedHeader, ...ov.easiest.map(toRankedRow)]), "Mais fáceis");

        XLSX.writeFile(wb, `${filenameBase}.xlsx`);
    };

    const handleExportPDF = async () => {
        setExportAnchor(null);
        setPdfExportError(null);
        setIsPdfExporting(true);
        try {
            const [{ exportAssessmentOverviewPdf }, studentPerformance] = await Promise.all([
                import("../utils/assessmentOverviewPdf"),
                fetchStudentPerformanceForPdf(ov.assessment.id),
            ]);
            exportAssessmentOverviewPdf(ov, studentPerformance);
        } catch {
            setPdfExportError("Não foi possível gerar o PDF. Tente novamente.");
        } finally {
            setIsPdfExporting(false);
        }
    };

    const skillsBarLabels = skillsSorted.map((s) => SKILL_LABELS[s.skill_level]);
    const skillsBarValues = skillsSorted.map((s) => Number((s.accuracy * 100).toFixed(1)));
    const skillsBarColors = skillsSorted.map((s) => theme.palette[SKILL_COLOR[s.skill_level]].main);
    const dateLabel = ov.assessment.date ? new Date(`${ov.assessment.date}T00:00:00`).toLocaleDateString("pt-BR") : null;

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KPICard
                        title="Taxa de acerto"
                        value={formatPercent(accuracy)}
                        subtitle={`${correct} de ${totalAnswers} respostas`}
                        color={accuracy >= 0.7 ? "success" : accuracy >= 0.5 ? "info" : accuracy >= 0.3 ? "warning" : "error"}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KPICard
                        title="Participação"
                        value={formatPercent(participation)}
                        subtitle={`${studentsAnswered} de ${studentsTotal} alunos responderam`}
                        color={participation >= 0.8 ? "success" : participation >= 0.5 ? "info" : "warning"}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KPICard title="Questões" value={String(totalQuestions)} subtitle="Total de questões da prova" />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                    <KPICard
                        title="Questão crítica"
                        value={hardestTop ? questionNumberLabel(hardestTop) : "—"}
                        subtitle={hardestTop ? `${formatPercent(hardestTop.accuracy)} de acerto · ${hardestTop.answers} respostas` : "Sem dados suficientes"}
                        color="error"
                    />
                </Grid>
            </Grid>

            <Stack className="no-print" direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} justifyContent="space-between">
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    {subject && <Chip size="small" variant="outlined" label={subject} />}
                    {dateLabel && <Chip size="small" variant="outlined" label={dateLabel} />}
                </Stack>

                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={(e) => setExportAnchor(e.currentTarget)}
                        aria-haspopup="menu"
                        aria-expanded={Boolean(exportAnchor)}
                        disabled={isPdfExporting}
                    >
                        {isPdfExporting ? "Gerando..." : "Exportar"}
                    </Button>
                    <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
                        <MenuItem onClick={handleExportPDF} disabled={isPdfExporting}>
                            <ListItemIcon>
                                <PictureAsPdfOutlinedIcon fontSize="small" />
                            </ListItemIcon>
                            PDF
                        </MenuItem>
                        <MenuItem onClick={handleExportXLSX}>
                            <ListItemIcon>
                                <TableChartOutlinedIcon fontSize="small" />
                            </ListItemIcon>
                            Excel (.xlsx)
                        </MenuItem>
                        <MenuItem onClick={handleExportCSV}>
                            <ListItemIcon>
                                <DescriptionOutlinedIcon fontSize="small" />
                            </ListItemIcon>
                            CSV
                        </MenuItem>
                    </Menu>
                </Stack>
            </Stack>

            {pdfExportError && (
                <Alert className="no-print" severity="error" onClose={() => setPdfExportError(null)}>
                    {pdfExportError}
                </Alert>
            )}

            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 12 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                                Taxa de acerto por nível
                            </Typography>
                            {skillsSorted.length === 0 ? (
                                <Alert severity="info">Sem dados por nível.</Alert>
                            ) : (
                                <BarChart
                                    height={260}
                                    hideLegend
                                    layout="horizontal"
                                    yAxis={[
                                        {
                                            scaleType: "band",
                                            data: skillsBarLabels,
                                            colorMap: {
                                                type: "ordinal",
                                                values: skillsBarLabels,
                                                colors: skillsBarColors,
                                            },
                                        },
                                    ]}
                                    xAxis={[{ min: 0, max: 100, valueFormatter: (v: number | null) => `${v ?? 0}%` }]}
                                    series={[
                                        {
                                            data: skillsBarValues,
                                            label: "Taxa de acerto",
                                            valueFormatter: (v: number | null) => (v == null ? "—" : `${v.toFixed(1)}%`),
                                        },
                                    ]}
                                    margin={{ left: 24, right: 20, top: 8, bottom: 24 }}
                                />
                            )}
                            <Stack spacing={1} sx={{ mt: 1.5 }}>
                                {skillsSorted.map((s) => (
                                    <Stack key={s.skill_level} direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
                                        <Box sx={{ minWidth: 50 }}>
                                            <SkillChip level={s.skill_level} />
                                        </Box>
                                        <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 140 }}>
                                            {s.correct}/{s.answers} corretas
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: "text.secondary", minWidth: 110 }}>
                                            {s.students_answered} alunos
                                        </Typography>
                                    </Stack>
                                ))}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                <Tooltip title={buildRankCriteriaText(ov.hardest_criteria)} arrow>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        Questões com pior desempenho
                                    </Typography>
                                </Tooltip>
                                <Chip size="small" variant="outlined" label={`mín. ${ov.hardest_criteria?.min_answers ?? 5} respostas`} />
                            </Stack>
                            {ov.hardest.length === 0 ? (
                                <Alert severity="info">
                                    Ainda não há questões ranqueadas. Aguarde mais respostas (mínimo {ov.hardest_criteria?.min_answers ?? 5} por questão).
                                </Alert>
                            ) : (
                                <Stack spacing={1}>
                                    {ov.hardest.map((q) => (
                                        <RankedQuestionCard key={q.question_id} item={q} accent="error" />
                                    ))}
                                </Stack>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Card>
                        <CardContent>
                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                <Tooltip title={buildRankCriteriaText(ov.easiest_criteria)} arrow>
                                    <Typography variant="subtitle1" fontWeight={700}>
                                        Questões com melhor desempenho
                                    </Typography>
                                </Tooltip>
                                <Chip size="small" variant="outlined" label={`mín. ${ov.easiest_criteria?.min_answers ?? 5} respostas`} />
                            </Stack>
                            {ov.easiest.length === 0 ? (
                                <Alert severity="info">
                                    Ainda não há questões ranqueadas. Aguarde mais respostas (mínimo {ov.easiest_criteria?.min_answers ?? 5} por questão).
                                </Alert>
                            ) : (
                                <Stack spacing={1}>
                                    {ov.easiest.map((q) => (
                                        <RankedQuestionCard key={q.question_id} item={q} accent="success" />
                                    ))}
                                </Stack>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Card>
                <CardContent>
                    <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} justifyContent="space-between" sx={{ mb: 2 }}>
                        <Typography variant="subtitle1" fontWeight={700}>
                            Desempenho por questão
                        </Typography>
                        <Stack className="no-print" direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ minWidth: { md: 560 } }}>
                            <TextField
                                size="small"
                                placeholder="Buscar enunciado, descritor, número…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" />
                                        </InputAdornment>
                                    ),
                                }}
                                sx={{ flex: 1 }}
                            />
                            <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel id="skill-filter-label">Nível</InputLabel>
                                <Select
                                    labelId="skill-filter-label"
                                    label="Nível"
                                    value={skillFilter}
                                    onChange={(e: SelectChangeEvent) => setSkillFilter(e.target.value as SkillLevel | "all")}
                                >
                                    <MenuItem value="all">Todos</MenuItem>
                                    {(Object.keys(SKILL_LABELS) as SkillLevel[]).map((k) => (
                                        <MenuItem key={k} value={k}>
                                            {SKILL_LABELS[k]}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 200 }} disabled={descriptorOptions.length === 0}>
                                <InputLabel id="desc-filter-label">Descritor</InputLabel>
                                <Select
                                    labelId="desc-filter-label"
                                    label="Descritor"
                                    value={descriptorFilter}
                                    onChange={(e: SelectChangeEvent) => setDescriptorFilter(e.target.value)}
                                >
                                    <MenuItem value="all">Todos</MenuItem>
                                    {descriptorOptions.map((d) => (
                                        <MenuItem key={d.id} value={String(d.id)}>
                                            {d.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                    </Stack>

                    {filteredQuestions.length === 0 ? (
                        <Alert severity="info">
                            {ov.by_question.length === 0 ? "Sem respostas nas questões desta avaliação." : "Nenhuma questão corresponde aos filtros aplicados."}
                        </Alert>
                    ) : (
                        <TableContainer sx={{ maxHeight: 560 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sortDirection={sortKey === "id" ? sortDir : false}>
                                            <TableSortLabel
                                                active={sortKey === "id"}
                                                direction={sortKey === "id" ? sortDir : "asc"}
                                                onClick={() => handleSort("id")}
                                            >
                                                #
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell>Enunciado</TableCell>
                                        <TableCell>Nível</TableCell>
                                        <TableCell>Descritor</TableCell>
                                        <TableCell align="center" sortDirection={sortKey === "answers" ? sortDir : false}>
                                            <TableSortLabel
                                                active={sortKey === "answers"}
                                                direction={sortKey === "answers" ? sortDir : "asc"}
                                                onClick={() => handleSort("answers")}
                                            >
                                                Respondidas
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell align="center">Gabarito</TableCell>
                                        <TableCell sortDirection={sortKey === "accuracy" ? sortDir : false}>
                                            <TableSortLabel
                                                active={sortKey === "accuracy"}
                                                direction={sortKey === "accuracy" ? sortDir : "asc"}
                                                onClick={() => handleSort("accuracy")}
                                            >
                                                Acerto
                                            </TableSortLabel>
                                        </TableCell>
                                        <TableCell>Distribuição A·B·C·D·E·Branco</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {filteredQuestions.map((q) => (
                                        <TableRow key={q.question_id} hover>
                                            <TableCell sx={{ whiteSpace: "nowrap" }}>
                                                <Typography variant="body2" fontWeight={600}>
                                                    {questionNumberLabel(q)}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 360 }}>
                                                <Tooltip title={q.text_short || ""} arrow placement="top-start">
                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            display: "-webkit-box",
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: "vertical",
                                                            overflow: "hidden",
                                                        }}
                                                    >
                                                        {q.text_short || "(sem enunciado)"}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell>
                                                <SkillChip level={q.skill_level} />
                                            </TableCell>
                                            <TableCell>
                                                {q.descriptor_code ? (
                                                    <Tooltip title={q.descriptor_title ?? ""} arrow>
                                                        <Chip size="small" variant="outlined" label={q.descriptor_code} />
                                                    </Tooltip>
                                                ) : (
                                                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                                        —
                                                    </Typography>
                                                )}
                                            </TableCell>
                                            <TableCell align="center">{q.answers}</TableCell>
                                            <TableCell align="center">
                                                <Chip size="small" color="success" variant="outlined" label={q.correct_option.toUpperCase()} />
                                            </TableCell>
                                            <TableCell sx={{ minWidth: 160 }}>
                                                <AccuracyBar value={safeNumber(q.accuracy)} color={SKILL_COLOR[q.skill_level]} />
                                            </TableCell>
                                            <TableCell>
                                                <OptionDistributionBar dist={q.option_distribution} correct={q.correct_option as OptionLetter} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
