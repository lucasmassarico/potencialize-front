import React from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
    Box,
    Card,
    CardContent,
    Stack,
    Typography,
    Button,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Chip,
    Grid,
    useMediaQuery,
    CardActionArea,
    Skeleton,
    Link as MUILink,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ReplayIcon from "@mui/icons-material/Replay";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { listQuestions, deleteQuestion } from "../../../api/questions";
import type { QuestionOut, SkillLevel, Option } from "../../../types/questions";
import ConfirmDialog from "../../../components/ConfirmDialog";
import QuestionFormDialog from "../components/QuestionFormDialog";
import QuestionsBulkDialog from "../components/QuestionsBulkDialog";
import { TableSkeleton } from "../../../components/Skeletons";
import { getAssessment } from "../../../api/assessments";

import type { QuestionList } from "../../../types/questions";

const SKILL_OPTS: SkillLevel[] = ["abaixo", "basico", "adequado", "avancado"];
const OPTION_OPTS: Option[] = ["a", "b", "c", "d", "e"];

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

function CardsSkeleton() {
    return (
        <Grid container spacing={2}>
            {Array.from({ length: 4 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6 }}>
                    <Card variant="outlined">
                        <CardContent>
                            <Skeleton width="80%" height={24} />
                            <Stack direction="row" spacing={1} mt={1}>
                                <Skeleton variant="rounded" width={120} height={24} />
                                <Skeleton variant="rounded" width={60} height={24} />
                                <Skeleton variant="rounded" width={60} height={24} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
}

function QuestionCard({ q, onEdit, onDelete }: { q: QuestionOut; onEdit: (q: QuestionOut) => void; onDelete: (q: QuestionOut) => void }) {
    return (
        <Card variant="outlined" sx={{ height: "100%" }}>
            <CardActionArea
                onClick={() => onEdit(q)}
                sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}
                aria-label={`Editar questão #${q.id}`}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap title={q.text}>
                        #{q.id} — {q.text}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={0.75} sx={{ alignItems: "center" }}>
                        <Chip size="small" color={skillChipColor(q.skill_level)} variant="outlined" label={SKILL_LABEL[q.skill_level]} />
                        <Chip size="small" label={`Peso ${q.weight}`} />
                        <Chip size="small" variant="outlined" label={`Correta: ${q.correct_option.toUpperCase()}`} />
                    </Stack>
                </Box>
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                    <IconButton
                        aria-label="editar"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(q);
                        }}
                    >
                        <EditIcon />
                    </IconButton>
                    <IconButton
                        aria-label="excluir"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(q);
                        }}
                    >
                        <DeleteIcon />
                    </IconButton>
                    <ChevronRightIcon sx={{ ml: 0.5 }} />
                </Stack>
            </CardActionArea>
        </Card>
    );
}

export default function AssessmentQuestions() {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const qc = useQueryClient();
    const isMdUp = useMediaQuery("(min-width:900px)");

    // server filters
    const [page, setPage] = React.useState(1);
    const [perPage, setPerPage] = React.useState(20);
    const [skill, setSkill] = React.useState<SkillLevel | "">("");
    const [opt, setOpt] = React.useState<Option | "">("");
    const [descriptor, setDescriptor] = React.useState<string>("");

    // client text filter (debounced)
    const [q, setQ] = React.useState("");
    const [qInput, setQInput] = React.useState("");
    React.useEffect(() => {
        const t = setTimeout(() => setQ(qInput), 250);
        return () => clearTimeout(t);
    }, [qInput]);

    const { data: assess } = useQuery({
        queryKey: ["assessment-meta", assessmentId],
        queryFn: () => getAssessment(Number(assessmentId), "id,title,weight_mode"),
        enabled: !!assessmentId,
        staleTime: 30_000,
    });

    const isPerQuestion = assess?.weight_mode === "per_question";
    const isBySkill = assess?.weight_mode === "by_skill";

    const { data, isLoading, isError, refetch } = useQuery<QuestionList>({
        queryKey: ["questions", { assessmentId, page, perPage, skill: isBySkill ? skill : "", opt, descriptor }],
        queryFn: () =>
            listQuestions({
                page,
                per_page: perPage,
                assessment_id: Number(assessmentId),
                // 👇 só envia o filtro de nível se for by_skill
                skill_level: isBySkill ? skill || undefined : undefined,
                correct_option: opt || undefined,
                descriptor_id: descriptor ? Number(descriptor) : undefined,
                sort: "id",
            }),
        enabled: !!assessmentId,
        placeholderData: keepPreviousData,
        staleTime: 15_000,
    });

    const items = React.useMemo(() => {
        const text = q.trim().toLowerCase();
        if (!text) return data?.items || [];
        return (data?.items || []).filter((it) => it.text?.toLowerCase().includes(text));
    }, [data, q]);

    const [formOpen, setFormOpen] = React.useState(false);
    const [editItem, setEditItem] = React.useState<QuestionOut | null>(null);
    const [bulkOpen, setBulkOpen] = React.useState(false);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [toDelete, setToDelete] = React.useState<QuestionOut | null>(null);

    const handleDelete = async () => {
        if (!toDelete) return;
        await deleteQuestion(toDelete.id);
        setConfirmOpen(false);
        setToDelete(null);
        qc.invalidateQueries({ queryKey: ["questions"] });
    };

    const hasAnyFilter = !!(q || skill || opt || descriptor);

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
                <Typography variant="h6" sx={{ flex: 1 }}>
                    Questões
                </Typography>

                <TextField
                    size="small"
                    label="Buscar no texto"
                    value={qInput}
                    onChange={(e) => {
                        setQInput(e.target.value);
                        setPage(1);
                    }}
                />

                {isBySkill && (
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel id="skill">Nível</InputLabel>
                        <Select
                            labelId="skill"
                            label="Nível"
                            value={skill}
                            onChange={(e) => {
                                setSkill(e.target.value as any);
                                setPage(1);
                            }}
                        >
                            <MenuItem value="">Todos</MenuItem>
                            {SKILL_OPTS.map((s) => (
                                <MenuItem key={s} value={s}>
                                    {SKILL_LABEL[s]}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}

                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel id="opt">Correta</InputLabel>
                    <Select
                        labelId="opt"
                        label="Correta"
                        value={opt}
                        onChange={(e) => {
                            setOpt(e.target.value as any);
                            setPage(1);
                        }}
                    >
                        <MenuItem value="">Todas</MenuItem>
                        {OPTION_OPTS.map((o) => (
                            <MenuItem key={o} value={o}>
                                {o.toUpperCase()}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TextField
                    size="small"
                    type="number"
                    label="Descritor (ID)"
                    value={descriptor}
                    onChange={(e) => {
                        setDescriptor(e.target.value);
                        setPage(1);
                    }}
                    sx={{ width: 180 }}
                />

                {hasAnyFilter && (
                    <Button
                        variant="text"
                        onClick={() => {
                            setQInput("");
                            setQ("");
                            setSkill("");
                            setOpt("");
                            setDescriptor("");
                            setPage(1);
                        }}
                    >
                        Limpar filtros
                    </Button>
                )}

                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                        setEditItem(null);
                        setFormOpen(true);
                    }}
                >
                    Nova
                </Button>
                <Button variant="outlined" onClick={() => setBulkOpen(true)}>
                    Importar em lote
                </Button>
            </Stack>

            <Card>
                <CardContent>
                    {isLoading &&
                        (isMdUp ? (
                            <TableSkeleton
                                headers={["ID", "Texto", ...(isBySkill ? ["Nível"] : []), ...(isPerQuestion ? ["Peso"] : []), "Correta", "Descritor", "Ações"]}
                                rows={8}
                            />
                        ) : (
                            <CardsSkeleton />
                        ))}

                    {isError && (
                        <Alert
                            severity="error"
                            action={
                                <Button size="small" startIcon={<ReplayIcon />} onClick={() => refetch()}>
                                    Tentar novamente
                                </Button>
                            }
                        >
                            Erro ao carregar questões.
                        </Alert>
                    )}

                    {data && items.length === 0 && <Alert severity="info">Nenhuma questão encontrada.</Alert>}

                    {data && items.length > 0 && (
                        <>
                            {/* Mobile / Tablet: Cards */}
                            <Box sx={{ display: { xs: "block", md: "none" } }}>
                                <Grid container spacing={2}>
                                    {items.map((q) => (
                                        <Grid key={q.id} size={{ xs: 12, sm: 6 }}>
                                            <Card variant="outlined" sx={{ height: "100%" }}>
                                                <CardActionArea
                                                    onClick={() => {
                                                        setEditItem(q);
                                                        setFormOpen(true);
                                                    }}
                                                    sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}
                                                    aria-label={`Editar questão #${q.id}`}
                                                >
                                                    <Box sx={{ minWidth: 0 }}>
                                                        <Typography fontWeight={700} noWrap title={q.text}>
                                                            #{q.id} — {q.text}
                                                        </Typography>
                                                        <Stack direction="row" spacing={1} mt={0.75} sx={{ alignItems: "center" }}>
                                                            {/* 👇 Chip de Nível só quando by_skill */}
                                                            {isBySkill && (
                                                                <Chip
                                                                    size="small"
                                                                    color={skillChipColor(q.skill_level)}
                                                                    variant="outlined"
                                                                    label={SKILL_LABEL[q.skill_level]}
                                                                />
                                                            )}
                                                            {/* 👇 Chip de Peso só quando per_question (opcional, coerência com tabela) */}
                                                            {isPerQuestion && <Chip size="small" label={`Peso ${q.weight}`} />}
                                                            <Chip size="small" variant="outlined" label={`Correta: ${q.correct_option.toUpperCase()}`} />
                                                        </Stack>
                                                    </Box>
                                                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                                                        <IconButton
                                                            aria-label="editar"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditItem(q);
                                                                setFormOpen(true);
                                                            }}
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                        <IconButton
                                                            aria-label="excluir"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setToDelete(q);
                                                                setConfirmOpen(true);
                                                            }}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                        <ChevronRightIcon sx={{ ml: 0.5 }} />
                                                    </Stack>
                                                </CardActionArea>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>

                            {/* Desktop: Tabela */}
                            <Box sx={{ display: { xs: "none", md: "block" } }}>
                                <TableContainer>
                                    <Table size="small" aria-label="Lista de questões">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell width={64}>ID</TableCell>
                                                <TableCell>Texto</TableCell>
                                                {isBySkill && <TableCell width={160}>Nível</TableCell>}
                                                {isPerQuestion && <TableCell width={100}>Peso</TableCell>}
                                                <TableCell width={120}>Correta</TableCell>
                                                <TableCell width={130}>Descritor</TableCell>
                                                <TableCell align="right" width={120}>
                                                    Ações
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {items.map((q) => (
                                                <TableRow
                                                    key={q.id}
                                                    hover
                                                    data-clicklable-row="true"
                                                    sx={(theme) => ({
                                                        cursor: "pointer",
                                                        transition: "background-color .15s ease, transform .05s ease",
                                                        "&:hover": { backgroundColor: theme.palette.action.hover },
                                                        "&:active": { transform: "scale(0.999)" },
                                                        "&:focus-visible": {
                                                            outline: `2px solid ${theme.palette.primary.main}`,
                                                            outlineOffset: 2,
                                                        },
                                                        "&:hover .row-chevron, &:focus-visible .row-chevron": {
                                                            opacity: 1,
                                                            transform: "translateX(0)",
                                                        },
                                                    })}
                                                    tabIndex={0}
                                                    role="button"
                                                    onClick={() => {
                                                        setEditItem(q);
                                                        setFormOpen(true);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            setEditItem(q);
                                                            setFormOpen(true);
                                                        }
                                                    }}
                                                    aria-label={`Editar questão #${q.id}`}
                                                >
                                                    <TableCell>#{q.id}</TableCell>
                                                    <TableCell sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <MUILink
                                                            underline="hover"
                                                            color="inherit"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditItem(q);
                                                                setFormOpen(true);
                                                            }}
                                                            sx={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 0.5 }}
                                                        >
                                                            {q.text}
                                                        </MUILink>
                                                        <ChevronRightIcon
                                                            fontSize="small"
                                                            className="row-chevron"
                                                            sx={{ ml: 0.5, opacity: 0, transform: "translateX(-4px)", transition: "all .15s ease" }}
                                                        />
                                                    </TableCell>

                                                    {/* 👇 Coluna Nível só quando by_skill */}
                                                    {isBySkill && (
                                                        <TableCell>
                                                            <Chip
                                                                size="small"
                                                                color={skillChipColor(q.skill_level)}
                                                                variant="filled"
                                                                label={SKILL_LABEL[q.skill_level]}
                                                            />
                                                        </TableCell>
                                                    )}

                                                    {/* 👇 Coluna Peso só quando per_question */}
                                                    {isPerQuestion && <TableCell>{q.weight}</TableCell>}

                                                    <TableCell>{q.correct_option?.toUpperCase()}</TableCell>
                                                    <TableCell>{q.descriptor_id ?? "—"}</TableCell>
                                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                        <IconButton
                                                            aria-label="editar"
                                                            onClick={() => {
                                                                setEditItem(q);
                                                                setFormOpen(true);
                                                            }}
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                        <IconButton
                                                            aria-label="excluir"
                                                            onClick={() => {
                                                                setToDelete(q);
                                                                setConfirmOpen(true);
                                                            }}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>

                                {/* ...paginação inalterada... */}
                            </Box>
                        </>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={confirmOpen}
                title="Remover questão?"
                description={toDelete ? `Tem certeza que deseja remover a questão #${toDelete.id}?` : undefined}
                confirmText="Remover"
                onConfirm={handleDelete}
                onClose={() => setConfirmOpen(false)}
            />

            <QuestionFormDialog
                open={formOpen}
                assessmentId={Number(assessmentId)}
                initial={editItem || undefined}
                onClose={(changed) => {
                    setFormOpen(false);
                    setEditItem(null);
                    if (changed) qc.invalidateQueries({ queryKey: ["questions"] });
                }}
            />

            <QuestionsBulkDialog
                open={bulkOpen}
                assessmentId={Number(assessmentId)}
                onClose={(imported) => {
                    setBulkOpen(false);
                    if (imported) qc.invalidateQueries({ queryKey: ["questions"] });
                }}
            />
        </Box>
    );
}
