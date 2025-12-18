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
    TextField,
    Pagination,
    Stack,
    Chip,
    Grid,
    useMediaQuery,
    CardActionArea,
    InputAdornment,
    Tooltip,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import ReplayIcon from "@mui/icons-material/Replay";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";

import { listAllStudentsByClass, deleteStudent } from "../../../api/students";
import type { StudentOut } from "../../../types/students";
import ConfirmDialog from "../../../components/ConfirmDialog";
import { useClassContext } from "./useClassContext";
import StudentFormDialog from "../components/StudentFormDialog";
import StudentsBulkDialog from "../components/StudentsBulkDialog";
import { TableSkeleton } from "../../../components/Skeletons";

function useDebounced<T>(value: T, delay = 220) {
    const [v, setV] = React.useState(value);
    React.useEffect(() => {
        const h = setTimeout(() => setV(value), delay);
        return () => clearTimeout(h);
    }, [value, delay]);
    return v;
}

/** Card clicável para mobile (abre edição do aluno) */
function StudentCard({ s, onEdit, onDelete }: { s: StudentOut; onEdit: (s: StudentOut) => void; onDelete: (s: StudentOut) => void }) {
    const handleOpen = () => {
        onEdit(s);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpen();
        }
    };

    return (
        <Card variant="outlined" sx={{ height: "100%" }}>
            <CardActionArea
                component="div" // <-- deixa de ser <button>, vira <div>
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
                aria-label={`Editar aluno ${s.name}`}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap title={s.name}>
                        {s.name}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={0.5} sx={{ alignItems: "center" }}>
                        <Chip size="small" variant="outlined" label={`Código: ${s.register_code || "—"}`} />
                    </Stack>
                </Box>

                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                    <IconButton
                        aria-label="editar aluno"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEdit(s);
                        }}
                    >
                        <EditIcon />
                    </IconButton>
                    <IconButton
                        aria-label="excluir aluno"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(s);
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
                            <Box sx={{ width: "60%", height: 28, bgcolor: "action.hover", borderRadius: 1, mb: 1 }} />
                            <Stack direction="row" spacing={1}>
                                <Box sx={{ width: 130, height: 24, bgcolor: "action.hover", borderRadius: 1 }} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
}

export default function ClassStudents() {
    const { classId } = useClassContext();
    const qc = useQueryClient();

    const [page, setPage] = React.useState(1);
    const [perPage] = React.useState(20);
    const [name, setName] = React.useState("");
    const [registerCode, setRegisterCode] = React.useState("");

    const debouncedName = useDebounced(name);
    const debouncedCode = useDebounced(registerCode);

    const {
        data: all,
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: ["studentsAll", { classId }],
        queryFn: () => listAllStudentsByClass(classId, 100), // ajustável
        staleTime: 60_000,
    });

    const filtered = React.useMemo(() => {
        const sName = debouncedName.trim().toLowerCase();
        const sCode = debouncedCode.trim().toLowerCase();
        return (all || []).filter((al) => {
            const byName = !sName || al.name.toLowerCase().includes(sName);
            const byCode = !sCode || (al.register_code || "").toLowerCase().includes(sCode);
            return byName && byCode;
        });
    }, [all, debouncedName, debouncedCode]);

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const start = (page - 1) * perPage;
    const pageItems = filtered.slice(start, start + perPage);

    React.useEffect(() => setPage(1), [debouncedName, debouncedCode]);

    const [bulkOpen, setBulkOpen] = React.useState(false);
    const [formOpen, setFormOpen] = React.useState(false);
    const [editItem, setEditItem] = React.useState<StudentOut | null>(null);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [toDelete, setToDelete] = React.useState<StudentOut | null>(null);
    const [snack, setSnack] = React.useState<{ open: boolean; message: string; severity: "success" | "error" | "info" } | null>(null);

    const handleDelete = async () => {
        if (!toDelete) return;
        try {
            await deleteStudent(toDelete.id);

            qc.setQueryData<StudentOut[] | undefined>(["studentsAll", { classId }], (prev) => prev?.filter((s) => s.id !== toDelete.id));

            setSnack({ open: true, message: "Aluno removido.", severity: "success" });
            setConfirmOpen(false);
            setToDelete(null);

            qc.invalidateQueries({ queryKey: ["studentsAll"], refetchType: "active" });
        } catch {
            setSnack({ open: true, message: "Falha ao remover o aluno.", severity: "error" });
        }
    };

    const isMdUp = useMediaQuery("(min-width:900px)");

    const clearFilters = () => {
        setName("");
        setRegisterCode("");
        setPage(1);
    };

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            {/* Toolbar com filtros, contadores e ações */}
            <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ xs: "stretch", md: "center" }}>
                <Typography variant="h6" sx={{ flex: 1 }}>
                    Alunos
                    {!!all?.length && (
                        <Typography component="span" variant="body2" sx={{ ml: 1, opacity: 0.7 }}>
                            {total} visíveis de {all.length}
                        </Typography>
                    )}
                </Typography>

                <TextField
                    size="small"
                    label="Nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: name ? (
                            <InputAdornment position="end">
                                <Tooltip title="Limpar">
                                    <IconButton size="small" onClick={() => setName("")} aria-label="Limpar filtro de nome">
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </InputAdornment>
                        ) : null,
                    }}
                />

                <TextField
                    size="small"
                    label="Código de chamada"
                    value={registerCode}
                    onChange={(e) => setRegisterCode(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: registerCode ? (
                            <InputAdornment position="end">
                                <Tooltip title="Limpar">
                                    <IconButton size="small" onClick={() => setRegisterCode("")} aria-label="Limpar filtro de código">
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </InputAdornment>
                        ) : null,
                    }}
                />

                {(name || registerCode) && (
                    <Button variant="text" onClick={clearFilters}>
                        Limpar filtros
                    </Button>
                )}

                <Stack direction="row" spacing={1}>
                    <Button variant="outlined" onClick={() => setBulkOpen(true)}>
                        Importar em lote
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                            setEditItem(null);
                            setFormOpen(true);
                        }}
                        sx={{ px: 3 }}
                    >
                        Aluno
                    </Button>
                </Stack>
            </Stack>

            <Card>
                <CardContent>
                    {isLoading && (isMdUp ? <TableSkeleton headers={["Nome", "Código", "Ações"]} rows={8} /> : <CardsSkeleton />)}

                    {isError && (
                        <Alert
                            severity="error"
                            action={
                                <Button size="small" startIcon={<ReplayIcon />} onClick={() => refetch()}>
                                    Tentar novamente
                                </Button>
                            }
                        >
                            Erro ao carregar alunos.
                        </Alert>
                    )}

                    {!isLoading && !isError && pageItems && pageItems.length === 0 && (
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
                                    Adicionar aluno
                                </Button>
                            }
                        >
                            Nenhum aluno encontrado.
                        </Alert>
                    )}

                    {!isLoading && !isError && pageItems && pageItems.length > 0 && (
                        <>
                            {/* Mobile / Tablet: Cards */}
                            <Box sx={{ display: { xs: "block", md: "none" } }}>
                                <Grid container spacing={2}>
                                    {pageItems.map((s) => (
                                        <Grid key={s.id} size={{ xs: 12, sm: 6 }}>
                                            <StudentCard
                                                s={s}
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

                            {/* Desktop: Tabela com chevron e cues de clique (abre edição) */}
                            <Box sx={{ display: { xs: "none", md: "block" } }}>
                                <TableContainer>
                                    <Table size="small" aria-label="Lista de alunos da turma">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Nome</TableCell>
                                                <TableCell width={160}>Código</TableCell>
                                                <TableCell align="right" width={120}>
                                                    Ações
                                                </TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {pageItems.map((s) => (
                                                <TableRow
                                                    key={s.id}
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
                                                        setEditItem(s);
                                                        setFormOpen(true);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            setEditItem(s);
                                                            setFormOpen(true);
                                                        }
                                                    }}
                                                    aria-label={`Editar aluno ${s.name}`}
                                                >
                                                    <TableCell sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                        <Typography sx={{ fontWeight: 700 }}>{s.name}</Typography>
                                                        <ChevronRightIcon
                                                            fontSize="small"
                                                            className="row-chevron"
                                                            sx={{ ml: 0.5, opacity: 0, transform: "translateX(-4px)", transition: "all .15s ease" }}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip size="small" variant="outlined" label={s.register_code || "—"} />
                                                    </TableCell>
                                                    <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                                                        <IconButton
                                                            aria-label={`Editar ${s.name}`}
                                                            onClick={() => {
                                                                setEditItem(s);
                                                                setFormOpen(true);
                                                            }}
                                                        >
                                                            <EditIcon />
                                                        </IconButton>
                                                        <IconButton
                                                            aria-label={`Excluir ${s.name}`}
                                                            onClick={() => {
                                                                setToDelete(s);
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

                                {/* paginação + range */}
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        {total === 0 ? "0 de 0" : `${start + 1}–${Math.min(start + perPage, total)} de ${total}`}
                                    </Typography>
                                    <Pagination page={page} count={totalPages} onChange={(_, p) => setPage(p)} />
                                </Stack>
                            </Box>
                        </>
                    )}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={confirmOpen}
                title="Remover aluno?"
                description={toDelete ? `Remover "${toDelete.name}"?` : undefined}
                confirmText="Remover"
                onConfirm={handleDelete}
                onClose={() => setConfirmOpen(false)}
            />

            <StudentFormDialog
                open={formOpen}
                initial={editItem || undefined}
                classId={classId}
                onClose={(changed, saved) => {
                    setFormOpen(false);
                    setEditItem(null);
                    if (changed && saved) {
                        qc.setQueryData<StudentOut[] | undefined>(["studentsAll", { classId }], (prev) => {
                            if (!prev) return prev;
                            const idx = prev.findIndex((s) => s.id === saved.id);
                            if (idx >= 0) {
                                const next = prev.slice();
                                next[idx] = saved;
                                return next;
                            }
                            if (saved.class_id !== classId) return prev;
                            return [saved, ...prev];
                        });
                        qc.invalidateQueries({ queryKey: ["studentsAll"], refetchType: "active" });
                    }
                }}
            />

            <StudentsBulkDialog
                open={bulkOpen}
                classId={classId}
                onClose={(imported) => {
                    setBulkOpen(false);
                    if (imported) {
                        qc.invalidateQueries({ queryKey: ["studentsAll"] });
                        setPage(1);
                        setSnack({ open: true, message: "Importação concluída.", severity: "success" });
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
