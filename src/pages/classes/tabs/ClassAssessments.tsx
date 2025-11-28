// src/pages/classes/tabs/ClassAssessments.tsx
import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ReplayIcon from "@mui/icons-material/Replay";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import dayjs from "../../../lib/dayjs";
import { listAssessments, deleteAssessment } from "../../../api/assessments";
import type { AssessmentOut } from "../../../types/assessments";
import ConfirmDialog from "../../../components/ConfirmDialog";
import { useClassContext } from "./useClassContext";
import AssessmentFormDialog from "../components/AssessmentFormDialog";
import { TableSkeleton } from "../../../components/Skeletons";
import { useNavigate, Link as RouterLink } from "react-router-dom";

/** Helpers para label/cor do chip */
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

/** Card clicável (mobile/tablet) no mesmo padrão dos cards de Turmas */
function AssessmentCard({ a, onEdit, onDelete }: { a: AssessmentOut; onEdit: (a: AssessmentOut) => void; onDelete: (a: AssessmentOut) => void }) {
    const nav = useNavigate();
    const dateLabel = dayjs(a.date).format("DD/MM/YYYY HH:mm");

    return (
        <Card variant="outlined" sx={{ height: "100%" }}>
            <CardActionArea
                onClick={() => nav(`/assessments/${a.id}`)}
                sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                }}
                aria-label={`Abrir avaliação ${a.title}`}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap title={a.title}>
                        {a.title}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={0.5} sx={{ alignItems: "center" }}>
                        <Chip size="small" label={dateLabel} />
                        <Chip size="small" variant="outlined" color={weightChipColor(a.weight_mode)} label={weightLabel(a.weight_mode)} />
                    </Stack>
                </Box>

                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                    {/* Ações rápidas sem abrir o card */}
                    <IconButton
                        aria-label="editar avaliação"
                        onClick={(e) => {
                            e.stopPropagation();
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

/** Skeleton de cards (mobile) no mesmo espírito do de Turmas */
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

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ["assessments"],
        queryFn: () => listAssessments("id,title,date,weight_mode,class_id"),
        staleTime: 30_000,
    });

    const list = (data || []).filter((a) => a.class_id === classId);

    const [formOpen, setFormOpen] = React.useState(false);
    const [editItem, setEditItem] = React.useState<AssessmentOut | null>(null);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [toDelete, setToDelete] = React.useState<AssessmentOut | null>(null);
    const [snack, setSnack] = React.useState<{ open: boolean; message: string; severity: "success" | "error" | "info" } | null>(null);

    const handleDelete = async () => {
        if (!toDelete) return;
        try {
            await deleteAssessment(toDelete.id);
            setSnack({ open: true, message: "Avaliação removida.", severity: "success" });
            setConfirmOpen(false);
            setToDelete(null);
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
                    onClick={() => {
                        setEditItem(null);
                        setFormOpen(true);
                    }}
                >
                    Nova avaliação
                </Button>
            </Box>

            <Card>
                <CardContent>
                    {isLoading && (isMdUp ? <TableSkeleton headers={["Título", "Data", "Peso", "Ações"]} rows={5} /> : <CardsSkeleton />)}

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
                                    onClick={() => {
                                        setEditItem(null);
                                        setFormOpen(true);
                                    }}
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
                            {/* Mobile / Tablet: Cards clicáveis */}
                            <Box sx={{ display: { xs: "block", md: "none" } }}>
                                <Grid container spacing={2}>
                                    {list.map((a) => (
                                        <Grid key={a.id} size={{ xs: 12, sm: 6 }}>
                                            <AssessmentCard
                                                a={a}
                                                onEdit={(it) => {
                                                    setEditItem(it);
                                                    setFormOpen(true);
                                                }}
                                                onDelete={(it) => {
                                                    setToDelete(it);
                                                    setConfirmOpen(true);
                                                }}
                                            />
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>

                            {/* Desktop: Tabela com cues de clique (igual ao padrão de Turmas) */}
                            <Box sx={{ display: { xs: "none", md: "block" } }}>
                                <TableContainer>
                                    <Table size="small" aria-label="Lista de avaliações da turma">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Título</TableCell>
                                                <TableCell width={180}>Data</TableCell>
                                                <TableCell width={160}>Peso</TableCell>
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
                                                    onClick={() => nav(`/assessments/${a.id}`)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            nav(`/assessments/${a.id}`);
                                                        }
                                                    }}
                                                    aria-label={`Abrir avaliação ${a.title}`}
                                                >
                                                    <TableCell sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <MUILink
                                                            component={RouterLink}
                                                            to={`/assessments/${a.id}`}
                                                            color="inherit"
                                                            underline="none" // ← remove sublinhado
                                                            onClick={(e) => e.stopPropagation()}
                                                            aria-label={`Abrir avaliação ${a.title}`}
                                                            sx={{
                                                                fontWeight: 700,
                                                                display: "inline-flex",
                                                                alignItems: "center",
                                                                gap: 0.5,
                                                                textDecoration: "none !important", // ← garante contra overrides do tema
                                                                "&:hover": { textDecoration: "none" },
                                                                "&:focus-visible": { textDecoration: "none" },
                                                                cursor: "inherit", // ← deixa cursor da linha prevalecer
                                                            }}
                                                        >
                                                            {a.title}
                                                        </MUILink>

                                                        <ChevronRightIcon
                                                            fontSize="small"
                                                            className="row-chevron"
                                                            sx={{
                                                                ml: 0.5,
                                                                opacity: 0,
                                                                transform: "translateX(-4px)",
                                                                transition: "all .15s ease",
                                                            }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <time dateTime={dayjs(a.date).toISOString()}>{dayjs(a.date).format("DD/MM/YYYY HH:mm")}</time>
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
                                                    <TableCell align="right">
                                                        <IconButton
                                                            aria-label="editar"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditItem(a);
                                                                setFormOpen(true);
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
                    if (changed) qc.invalidateQueries({ queryKey: ["assessments"] });
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
