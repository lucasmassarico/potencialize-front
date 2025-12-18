// src/pages/classes/ClassesList.tsx
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
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Grid,
    Chip,
    Skeleton,
    Link as MUILink,
    useMediaQuery,
    CardActionArea,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { useNavigate, Link as RouterLink } from "react-router-dom";

import { listClasses, deleteClass } from "../../api/classes";
import type { ClassOut } from "../../types/classes";
import ConfirmDialog from "../../components/ConfirmDialog";
import { useAuth } from "../../hooks/useAuth";
import ClassFormDialog from "../../components/classes/ClassFormDialog";

function useClasses() {
    return useQuery({
        queryKey: ["classes"],
        queryFn: async () => {
            // Usa X-Fields para reduzir payload (sem students/assessments)
            const data = await listClasses("id,name,year,teacher{id,name}");
            return data;
        },
    });
}

/** Card clicável para mobile (xs/sm) */
function ClassCard({ c, onEdit, onDelete }: { c: ClassOut; onEdit: (c: ClassOut) => void; onDelete: (c: ClassOut) => void }) {
    const nav = useNavigate();

    const handleOpen = () => {
        nav(`/classes/${c.id}`);
    };

    const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpen();
        }
    };

    return (
        <Card variant="outlined" sx={{ height: "100%" }}>
            <CardActionArea
                component="div" // <--- deixa de ser <button> e vira <div>
                role="button"
                tabIndex={0}
                onClick={handleOpen}
                onKeyDown={handleKeyDown}
                sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                }}
                aria-label={`Abrir turma ${c.name}`}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap title={c.name}>
                        {c.name}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={0.5}>
                        <Chip size="small" label={`Ano ${c.year}`} />
                        <Chip size="small" variant="outlined" label={c.teacher?.name ?? "—"} />
                    </Stack>
                </Box>

                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                    {/* Ações rápidas sem abrir o card */}
                    <IconButton
                        aria-label="editar turma"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(c);
                        }}
                    >
                        <EditIcon />
                    </IconButton>
                    <IconButton
                        aria-label="excluir turma"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(c);
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

/** Skeletons reutilizáveis */
function TableSkeleton() {
    return (
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Ano</TableCell>
                    <TableCell>Professor(a)</TableCell>
                    <TableCell align="right">Ações</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell>
                            <Skeleton width="60%" />
                        </TableCell>
                        <TableCell>
                            <Skeleton width={60} />
                        </TableCell>
                        <TableCell>
                            <Skeleton width="40%" />
                        </TableCell>
                        <TableCell align="right">
                            <Skeleton variant="circular" width={28} height={28} />
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function CardsSkeleton() {
    return (
        <Grid container spacing={2}>
            {Array.from({ length: 4 }).map((_, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6 }}>
                    <Card variant="outlined">
                        <CardContent>
                            <Skeleton width="60%" height={28} />
                            <Stack direction="row" spacing={1} mt={1}>
                                <Skeleton variant="rounded" width={64} height={24} />
                                <Skeleton variant="rounded" width={120} height={24} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
}

export default function ClassesList() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const qc = useQueryClient();

    const nav = useNavigate();

    const { data, isLoading, isError } = useClasses();
    const [search, setSearch] = React.useState("");
    const [order, setOrder] = React.useState<"recent" | "name_asc" | "name_desc" | "year_desc" | "year_asc">("recent");

    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [toDelete, setToDelete] = React.useState<ClassOut | null>(null);

    const [formOpen, setFormOpen] = React.useState(false);
    const [editItem, setEditItem] = React.useState<ClassOut | null>(null);

    const [snack, setSnack] = React.useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info";
    } | null>(null);

    const rows = React.useMemo(() => {
        const items = (data || []).slice();
        const filtered = items.filter((c) => {
            const s = search.trim().toLowerCase();
            if (!s) return true;
            return c.name.toLowerCase().includes(s) || String(c.year).includes(s) || c.teacher?.name?.toLowerCase().includes(s);
        });
        filtered.sort((a, b) => {
            switch (order) {
                case "name_asc":
                    return a.name.localeCompare(b.name);
                case "name_desc":
                    return b.name.localeCompare(a.name);
                case "year_desc":
                    return b.year - a.year;
                case "year_asc":
                    return a.year - b.year;
                case "recent":
                default:
                    return b.id - a.id;
            }
        });
        return filtered;
    }, [data, search, order]);

    const handleDelete = async () => {
        if (!toDelete) return;
        try {
            await deleteClass(toDelete.id);
            setSnack({
                open: true,
                message: "Turma removida com sucesso.",
                severity: "success",
            });
            setConfirmOpen(false);
            setToDelete(null);
            qc.invalidateQueries({ queryKey: ["classes"] });
        } catch {
            setSnack({
                open: true,
                message: "Falha ao remover a turma.",
                severity: "error",
            });
        }
    };

    const isMdUp = useMediaQuery("(min-width:900px)"); // md breakpoint padrão do MUI

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
                <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
                    Turmas
                </Typography>
                <TextField placeholder="Buscar por nome, ano ou professor" size="small" value={search} onChange={(e) => setSearch(e.target.value)} />
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel id="order-label">Ordenar por</InputLabel>
                    <Select labelId="order-label" label="Ordenar por" value={order} onChange={(e) => setOrder(e.target.value as any)}>
                        <MenuItem value="recent">Mais recentes</MenuItem>
                        <MenuItem value="name_asc">Nome (A–Z)</MenuItem>
                        <MenuItem value="name_desc">Nome (Z–A)</MenuItem>
                        <MenuItem value="year_desc">Ano (desc)</MenuItem>
                        <MenuItem value="year_asc">Ano (asc)</MenuItem>
                    </Select>
                </FormControl>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                        setEditItem(null);
                        setFormOpen(true);
                    }}
                >
                    Turma
                </Button>
            </Stack>

            <Card>
                <CardContent>
                    {isLoading && (isMdUp ? <TableSkeleton /> : <CardsSkeleton />)}
                    {isError && <Alert severity="error">Erro ao carregar turmas.</Alert>}

                    {!isLoading && rows.length === 0 && <Alert severity="info">Nenhuma turma encontrada.</Alert>}

                    {!isLoading && rows.length > 0 && (
                        <>
                            {/* Mobile / Tablet: Cards clicáveis */}
                            <Box sx={{ display: { xs: "block", md: "none" } }}>
                                <Grid container spacing={2}>
                                    {rows.map((c) => (
                                        <Grid key={c.id} size={{ xs: 12, sm: 6 }}>
                                            <ClassCard
                                                c={c}
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

                            {/* Desktop: Tabela com cues de clique */}
                            <Box sx={{ display: { xs: "none", md: "block" } }}>
                                <TableContainer>
                                    <Table size="small" aria-label="Lista de turmas">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Nome</TableCell>
                                                <TableCell width={120}>Ano</TableCell>
                                                <TableCell>Professor(a)</TableCell>
                                                <TableCell align="right" width={120}>
                                                    Ações
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rows.map((c) => (
                                                <TableRow
                                                    key={c.id}
                                                    hover
                                                    data-clicklable-row="true"
                                                    sx={(theme) => ({
                                                        cursor: "pointer",
                                                        transition: "background-color .15s ease, transform .05s ease",
                                                        "&:hover": {
                                                            backgroundColor: theme.palette.action.hover,
                                                        },
                                                        "&:active": { transform: "scale(0.999)" },
                                                        "&:focus-visible": {
                                                            outline: `2px solid ${theme.palette.primary.main}`,
                                                            outlineOffset: 2,
                                                        },
                                                        // Chevron aparece no hover/focus
                                                        "&:hover .row-chevron, &:focus-visible .row-chevron": { opacity: 1, transform: "translateX(0)" },
                                                    })}
                                                    tabIndex={0}
                                                    role="button"
                                                    onClick={() => nav(`/classes/${c.id}`)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            nav(`/classes/${c.id}`);
                                                        }
                                                    }}
                                                    aria-label={`Abrir turma ${c.name}`}
                                                >
                                                    <TableCell sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <MUILink
                                                            component={RouterLink}
                                                            to={`/classes/${c.id}`}
                                                            underline="hover"
                                                            color="inherit"
                                                            onClick={(e) => e.stopPropagation()}
                                                            aria-label={`Abrir turma ${c.name}`}
                                                            sx={{ fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 0.5 }}
                                                        >
                                                            {c.name}
                                                        </MUILink>
                                                        <ChevronRightIcon
                                                            fontSize="small"
                                                            className="row-chevron"
                                                            sx={{ ml: 0.5, opacity: 0, transform: "translateX(-4px)", transition: "all .15s ease" }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip size="small" label={c.year} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2">{c.teacher?.name ?? "—"}</Typography>
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        <IconButton
                                                            aria-label="editar"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditItem(c);
                                                                setFormOpen(true);
                                                            }}
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                        <IconButton
                                                            aria-label="excluir"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setToDelete(c);
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
                title="Remover turma?"
                description={toDelete ? `Tem certeza que deseja remover "${toDelete.name}"? Esta ação não poderá ser desfeita.` : undefined}
                confirmText="Remover"
                onConfirm={handleDelete}
                onClose={() => setConfirmOpen(false)}
            />

            <ClassFormDialog
                open={formOpen}
                initial={editItem || undefined}
                currentRole={isAdmin ? "admin" : "teacher"}
                onClose={(changed) => {
                    setFormOpen(false);
                    setEditItem(null);
                    if (changed) qc.invalidateQueries({ queryKey: ["classes"] });
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
