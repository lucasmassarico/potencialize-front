// src/pages/classes/tabs/ClassAssessments.tsx
import React from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Box,
    Button,
    Card,
    CardContent,
    IconButton,
    Snackbar,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    Link as MUILink,
    Chip,
    Stack,
    Grid,
    useMediaQuery,
    CardActionArea,
    Skeleton,
    Pagination,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ReplayIcon from "@mui/icons-material/Replay";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import dayjs from "../../../lib/dayjs";
import { listAssessments, deleteAssessment } from "../../../api/assessments";
import type { AssessmentOut } from "../../../types/assessments";
import ConfirmDialog from "../../../components/ConfirmDialog";
import { useClassContext } from "./useClassContext";
import AssessmentFormDialog from "../components/AssessmentFormDialog";
import { TableSkeleton } from "../../../components/Skeletons";
import { useNavigate, Link as RouterLink } from "react-router-dom";

const ASSESSMENTS_PER_PAGE = 20;

/** Helpers para label/cor */
function weightLabel(mode: AssessmentOut["weight_mode"]) {
    switch (mode) {
        case "fixed_all":
            return "Mesmo peso";
        case "by_skill":
            return "Por nível";
        case "per_question":
            return "Por questão";
        default:
            return String(mode);
    }
}
function weightChipColor(mode: AssessmentOut["weight_mode"]): "default" | "info" | "secondary" {
    switch (mode) {
        case "by_skill":
            return "info";
        case "per_question":
            return "secondary";
        default:
            return "default";
    }
}

function subjectLabel(kind?: string, other?: string | null) {
    const map: Record<string, string> = {
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
    if (!kind) return "—";
    if (kind === "outro") return (other || "").trim() || "Outro";
    return map[kind] ?? String(kind);
}

/** Card clicável (mobile/tablet) */
function AssessmentCard({
    a,
    classId,
    onEdit,
    onDelete,
}: {
    a: AssessmentOut;
    classId: number;
    onEdit: (a: AssessmentOut) => void;
    onDelete: (a: AssessmentOut) => void;
}) {
    const nav = useNavigate();
    const dateLabel = dayjs(a.date).format("DD/MM/YYYY");

    return (
        <Card variant="outlined" sx={{ height: "100%" }}>
            <CardActionArea
                onClick={() => nav(`/classes/${classId}/assessments/${a.id}`)}
                sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}
                aria-label={`Abrir avaliação ${a.title}`}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap title={a.title}>
                        {a.title}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={0.5} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                        <Chip size="small" label={dateLabel} />
                        <Chip size="small" variant="outlined" color={weightChipColor(a.weight_mode)} label={weightLabel(a.weight_mode)} />
                        <Chip
                            size="small"
                            variant="outlined"
                            icon={<MenuBookOutlinedIcon />}
                            label={subjectLabel(a.subject_kind, a.subject_other)}
                        />
                    </Stack>
                </Box>

                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                    <IconButton
                        aria-label="editar avaliação"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.currentTarget.blur();
                            onEdit(a);
                        }}
                    >
                        <EditIcon />
                    </IconButton>
                    <IconButton
                        aria-label="excluir avaliação"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(a);
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

/** Skeleton de cards (mobile) */
function CardsSkeleton() {
    return (
        <Grid container spacing={2}>
            {Array.from({ length: 4 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6 }}>
                    <Card variant="outlined">
                        <CardContent>
                            <Skeleton width="60%" height={28} />
                            <Stack direction="row" spacing={1} mt={1}>
                                <Skeleton variant="rounded" width={120} height={24} />
                                <Skeleton variant="rounded" width={110} height={24} />
                                <Skeleton variant="rounded" width={150} height={24} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
}

export default function ClassAssessments() {
    const { classId } = useClassContext();
    const qc = useQueryClient();
    const nav = useNavigate();
    const isMdUp = useMediaQuery("(min-width:900px)");
    const [page, setPage] = React.useState(1);

    React.useEffect(() => {
        setPage(1);
    }, [classId]);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["assessments", "class", { classId, page, perPage: ASSESSMENTS_PER_PAGE }],
        queryFn: () =>
            listAssessments({
                params: {
                    class_id: classId,
                    page,
                    per_page: ASSESSMENTS_PER_PAGE,
                    sort: "-date",
                },
            }),
        placeholderData: keepPreviousData,
        staleTime: 30_000,
    });

    const list = data?.items ?? [];
    const totalPages = Math.max(1, data?.total_pages ?? 1);

    const [formOpen, setFormOpen] = React.useState(false);
    const [editItem, setEditItem] = React.useState<AssessmentOut | null>(null);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [toDelete, setToDelete] = React.useState<AssessmentOut | null>(null);
    const [snack, setSnack] = React.useState<{ open: boolean; message: string; severity: "success" | "error" | "info" } | null>(null);

    const openCreateForm = React.useCallback((event?: React.MouseEvent<HTMLElement>) => {
        event?.currentTarget.blur();
        setEditItem(null);
        setFormOpen(true);
    }, []);

    const openEditForm = React.useCallback((assessment: AssessmentOut, event?: React.MouseEvent<HTMLElement>) => {
        event?.currentTarget.blur();
        setEditItem(assessment);
        setFormOpen(true);
    }, []);

    const handleDelete = async () => {
        if (!toDelete) return;
        try {
            await deleteAssessment(toDelete.id);
            setSnack({ open: true, message: "Avaliação removida.", severity: "success" });
            setConfirmOpen(false);
            setToDelete(null);
            if (list.length === 1 && page > 1) setPage(page - 1);
            qc.invalidateQueries({ queryKey: ["assessments"] });
        } catch {
            setSnack({ open: true, message: "Falha ao remover a avaliação.", severity: "error" });
        }
    };

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography variant="h6" sx={{ flex: 1 }}>
                    Avaliações
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openCreateForm}
                >
                    Nova avaliação
                </Button>
            </Box>

            <Card>
                <CardContent>
                    {isLoading && (isMdUp ? <TableSkeleton headers={["Título", "Data", "Peso", "Disciplina", "Ações"]} rows={5} /> : <CardsSkeleton />)}

                    {isError && (
                        <Alert
                            severity="error"
                            action={
                                <Button size="small" startIcon={<ReplayIcon />} onClick={() => refetch()}>
                                    Tentar novamente
                                </Button>
                            }
                        >
                            Erro ao carregar avaliações.
                        </Alert>
                    )}

                    {!isLoading && !isError && list.length === 0 && (
                        <Alert
                            severity="info"
                            action={
                                <Button
                                    color="info"
                                    variant="outlined"
                                    onClick={openCreateForm}
                                >
                                    Criar avaliação
                                </Button>
                            }
                        >
                            Nenhuma avaliação desta turma.
                        </Alert>
                    )}

                    {!isLoading && !isError && list.length > 0 && (
                        <>
                            {/* Mobile / Tablet: Cards */}
                            <Box sx={{ display: { xs: "block", md: "none" } }}>
                                <Grid container spacing={2}>
                                    {list.map((a) => (
                                        <Grid key={a.id} size={{ xs: 12, sm: 6 }}>
                                            <AssessmentCard
                                                a={a}
                                                classId={classId}
                                                onEdit={openEditForm}
                                                onDelete={(it) => {
                                                    setToDelete(it);
                                                    setConfirmOpen(true);
                                                }}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>

                            {/* Desktop: Tabela */}
                            <Box sx={{ display: { xs: "none", md: "block" } }}>
                                <TableContainer>
                                    <Table size="small" aria-label="Lista de avaliações da turma">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Título</TableCell>
                                                <TableCell width={180}>Data</TableCell>
                                                <TableCell width={160}>Peso</TableCell>
                                                <TableCell width={220}>Disciplina</TableCell>
                                                <TableCell align="right" width={120}>
                                                    Ações
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {list.map((a) => (
                                                <TableRow
                                                    key={a.id}
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
                                                    onClick={() => nav(`/classes/${classId}/assessments/${a.id}`)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            nav(`/classes/${classId}/assessments/${a.id}`);
                                                        }
                                                    }}
                                                    aria-label={`Abrir avaliação ${a.title}`}
                                                >
                                                    <TableCell sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <MUILink
                                                            component={RouterLink}
                                                            to={`/classes/${classId}/assessments/${a.id}`}
                                                            color="inherit"
                                                            underline="none"
                                                            onClick={(e) => e.stopPropagation()}
                                                            aria-label={`Abrir avaliação ${a.title}`}
                                                            sx={{
                                                                fontWeight: 700,
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: 0.5,
                                                                textDecoration: "none !important",
                                                                "&:hover": { textDecoration: "none" },
                                                                "&:focus-visible": { textDecoration: "none" },
                                                                cursor: "inherit",
                                                            }}
                                                        >
                                                            {a.title}
                                                        </MUILink>

                                                        <ChevronRightIcon
                                                            fontSize="small"
                                                            className="row-chevron"
                                                            sx={{ ml: 0.5, opacity: 0, transform: "translateX(-4px)", transition: "all .15s ease" }}
                                                        />
                                                    </TableCell>

                                                    <TableCell>
                                                        <time dateTime={dayjs(a.date).format("YYYY-MM-DD")}>{dayjs(a.date).format("DD/MM/YYYY")}</time>
                                                    </TableCell>

                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            color={weightChipColor(a.weight_mode)}
                                                            variant="outlined"
                                                            label={weightLabel(a.weight_mode)}
                                                            aria-label={`Modo de peso: ${weightLabel(a.weight_mode)}`}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </TableCell>

                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            variant="outlined"
                                                            icon={<MenuBookOutlinedIcon />}
                                                            label={subjectLabel(a.subject_kind, a.subject_other)}
                                                            onClick={(e) => e.stopPropagation()}
                                                        />
                                                    </TableCell>

                                                    <TableCell align="right">
                                                        <IconButton
                                                            aria-label="editar"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openEditForm(a, e);
                                                            }}
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                        <IconButton
                                                            aria-label="excluir"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setToDelete(a);
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
                            </Box>
                        </>
                    )}

                    {!isLoading && !isError && totalPages > 1 && (
                        <Stack direction="row" justifyContent="center" sx={{ mt: 2 }}>
                            <Pagination page={page} count={totalPages} onChange={(_, value) => setPage(value)} />
                        </Stack>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={confirmOpen}
                title="Remover avaliação?"
                description={toDelete ? `Remover "${toDelete.title}"?` : undefined}
                confirmText="Remover"
                onConfirm={handleDelete}
                onClose={() => setConfirmOpen(false)}
            />

            <AssessmentFormDialog
                open={formOpen}
                initial={editItem || undefined}
                classId={classId}
                onClose={(changed) => {
                    setFormOpen(false);
                    setEditItem(null);
                    if (changed) {
                        setPage(1);
                        qc.invalidateQueries({ queryKey: ["assessments"] });
                    }
                }}
            />

            {snack && (
                <Snackbar open={!!snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => (s ? { ...s, open: false } : s))}>
                    <Alert onClose={() => setSnack(null)} severity={snack.severity} variant="filled">
                        {snack.message}
                    </Alert>
                </Snackbar>
            )}
        </Box>
    );
}
