import React from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Pagination,
    Select,
    Skeleton,
    Snackbar,
    Stack,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tabs,
    TextField,
    Tooltip,
    Typography,
    useMediaQuery,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import PublicIcon from "@mui/icons-material/Public";

import { deleteDescriptor, listDescriptors } from "../../api/descriptors";
import type { DescriptorOut, DescriptorScope } from "../../types/descriptors";
import { useAuth } from "../../hooks/useAuth";
import ConfirmDialog from "../../components/ConfirmDialog";
import TeachersCombo from "../../components/TeachersCombo";
import type { TeacherOut } from "../../types/teachers";
import DescriptorFormDialog from "./components/DescriptorFormDialog";

const TEACHER_TABS: { value: DescriptorScope; label: string }[] = [
    { value: "visible", label: "Todos visíveis" },
    { value: "mine", label: "Meus" },
];

const ADMIN_TABS: { value: DescriptorScope; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "global", label: "Globais" },
    { value: "mine", label: "Meus" },
    { value: "by_teacher", label: "Por professor" },
];

const YEARS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

type SortOption = "-id" | "code" | "-code" | "title" | "-title" | "grade_year" | "-grade_year";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: "-id", label: "Mais recentes" },
    { value: "code", label: "Código (A–Z)" },
    { value: "-code", label: "Código (Z–A)" },
    { value: "title", label: "Título (A–Z)" },
    { value: "-title", label: "Título (Z–A)" },
    { value: "grade_year", label: "Ano (asc)" },
    { value: "-grade_year", label: "Ano (desc)" },
];

function OwnershipChip({ d, currentTeacherId }: { d: DescriptorOut; currentTeacherId?: number }) {
    if (d.owner_teacher_id == null) {
        return <Chip size="small" icon={<PublicIcon />} label="Global" color="primary" variant="outlined" />;
    }
    if (currentTeacherId && d.owner_teacher_id === currentTeacherId) {
        return <Chip size="small" icon={<PersonIcon />} label="Minha" color="secondary" variant="outlined" />;
    }
    return <Chip size="small" icon={<PersonIcon />} label="Outro professor" variant="outlined" />;
}

function TableSkeleton() {
    return (
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>Código</TableCell>
                    <TableCell>Título</TableCell>
                    <TableCell>Área</TableCell>
                    <TableCell>Ano</TableCell>
                    <TableCell>Autoria</TableCell>
                    <TableCell align="right">Ações</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                        <TableCell><Skeleton width={48} /></TableCell>
                        <TableCell><Skeleton width="70%" /></TableCell>
                        <TableCell><Skeleton width="40%" /></TableCell>
                        <TableCell><Skeleton width={40} /></TableCell>
                        <TableCell><Skeleton variant="rounded" width={80} height={24} /></TableCell>
                        <TableCell align="right"><Skeleton variant="circular" width={28} height={28} /></TableCell>
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
                            <Skeleton width="40%" height={28} />
                            <Skeleton width="80%" />
                            <Stack direction="row" spacing={1} mt={1}>
                                <Skeleton variant="rounded" width={64} height={24} />
                                <Skeleton variant="rounded" width={80} height={24} />
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
}

export default function DescriptorsList() {
    const { user } = useAuth();
    const isAdmin = user?.role === "admin";
    const qc = useQueryClient();
    const isMdUp = useMediaQuery("(min-width:900px)");

    const tabs = isAdmin ? ADMIN_TABS : TEACHER_TABS;
    const [scope, setScope] = React.useState<DescriptorScope>(isAdmin ? "all" : "visible");

    const [q, setQ] = React.useState("");
    const [area, setArea] = React.useState("");
    const [gradeYear, setGradeYear] = React.useState("");
    const [sort, setSort] = React.useState<SortOption>("-id");
    const [byTeacher, setByTeacher] = React.useState<TeacherOut | null>(null);

    const [page, setPage] = React.useState(1);
    const perPage = 20;

    React.useEffect(() => {
        setPage(1);
    }, [scope, q, area, gradeYear, sort, byTeacher]);

    const byTeacherId = scope === "by_teacher" ? byTeacher?.id : undefined;
    const isMissingByTeacher = scope === "by_teacher" && !byTeacherId;

    const { data, isLoading, isError } = useQuery({
        queryKey: ["descriptors", { scope, q, area, gradeYear, sort, page, perPage, byTeacherId }],
        queryFn: () =>
            listDescriptors({
                scope,
                q: q.trim() || undefined,
                area: area.trim() || undefined,
                grade_year: gradeYear === "" ? undefined : Number(gradeYear),
                sort,
                page,
                per_page: perPage,
                by_teacher_id: byTeacherId,
            }),
        enabled: !isMissingByTeacher,
        placeholderData: keepPreviousData,
    });

    const rows = data?.items ?? [];
    const totalPages = data?.total_pages ?? 1;

    const [formOpen, setFormOpen] = React.useState(false);
    const [editItem, setEditItem] = React.useState<DescriptorOut | null>(null);

    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [toDelete, setToDelete] = React.useState<DescriptorOut | null>(null);

    const [snack, setSnack] = React.useState<{
        open: boolean;
        message: string;
        severity: "success" | "error" | "info";
    } | null>(null);

    const canEdit = (d: DescriptorOut) => {
        if (isAdmin) return true;
        return d.owner_teacher_id != null && d.owner_teacher_id === user?.teacher_id;
    };

    const handleDelete = async () => {
        if (!toDelete) return;
        try {
            await deleteDescriptor(toDelete.id);
            setSnack({ open: true, message: "Descritor removido.", severity: "success" });
            setConfirmOpen(false);
            setToDelete(null);
            qc.invalidateQueries({ queryKey: ["descriptors"] });
        } catch {
            setSnack({ open: true, message: "Falha ao remover descritor.", severity: "error" });
        }
    };

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
                <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
                    Descritores
                </Typography>
                <TextField
                    placeholder="Buscar por código, título, área…"
                    size="small"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    sx={{ minWidth: { sm: 260 } }}
                />
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel id="sort-label">Ordenar por</InputLabel>
                    <Select
                        labelId="sort-label"
                        label="Ordenar por"
                        value={sort}
                        onChange={(e) => setSort(e.target.value as SortOption)}
                    >
                        {SORT_OPTIONS.map((o) => (
                            <MenuItem key={o.value} value={o.value}>
                                {o.label}
                            </MenuItem>
                        ))}
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
                    Descritor
                </Button>
            </Stack>

            <Card>
                <CardContent>
                    <Tabs
                        value={scope}
                        onChange={(_, v) => setScope(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{ mb: 2 }}
                    >
                        {tabs.map((t) => (
                            <Tab key={t.value} value={t.value} label={t.label} />
                        ))}
                    </Tabs>

                    <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
                        <TextField
                            label="Área"
                            size="small"
                            value={area}
                            onChange={(e) => setArea(e.target.value)}
                            sx={{ maxWidth: { md: 240 } }}
                        />
                        <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel id="year-label">Ano</InputLabel>
                            <Select
                                labelId="year-label"
                                label="Ano"
                                value={gradeYear}
                                onChange={(e) => setGradeYear(e.target.value)}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                {YEARS.map((y) => (
                                    <MenuItem key={y} value={String(y)}>
                                        {y}º ano
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {isAdmin && scope === "by_teacher" && (
                            <Box sx={{ minWidth: 260, flex: 1 }}>
                                <TeachersCombo
                                    label="Professor(a)"
                                    value={byTeacher}
                                    onChange={setByTeacher}
                                />
                            </Box>
                        )}
                    </Stack>

                    {isMissingByTeacher && (
                        <Alert severity="info" sx={{ mb: 2 }}>
                            Selecione um professor(a) para listar os descritores dele.
                        </Alert>
                    )}

                    {isLoading && !isMissingByTeacher && (isMdUp ? <TableSkeleton /> : <CardsSkeleton />)}
                    {isError && <Alert severity="error">Erro ao carregar descritores.</Alert>}

                    {!isLoading && !isMissingByTeacher && rows.length === 0 && (
                        <Alert severity="info">
                            {scope === "mine"
                                ? "Você ainda não criou descritores próprios. Clique em 'Descritor' para começar."
                                : "Nenhum descritor encontrado com os filtros atuais."}
                        </Alert>
                    )}

                    {!isLoading && rows.length > 0 && (
                        <>
                            <Box sx={{ display: { xs: "block", md: "none" } }}>
                                <Grid container spacing={2}>
                                    {rows.map((d) => (
                                        <Grid key={d.id} size={{ xs: 12, sm: 6 }}>
                                            <Card variant="outlined">
                                                <CardContent>
                                                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                                        <Chip
                                                            size="small"
                                                            label={d.code}
                                                            sx={{ fontFamily: "monospace", fontWeight: 700 }}
                                                        />
                                                        <OwnershipChip d={d} currentTeacherId={user?.teacher_id} />
                                                    </Stack>
                                                    <Typography fontWeight={700} sx={{ mt: 0.5 }}>
                                                        {d.title}
                                                    </Typography>
                                                    {d.description && (
                                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                            {d.description}
                                                        </Typography>
                                                    )}
                                                    <Stack direction="row" spacing={1} mt={1.5} alignItems="center">
                                                        {d.area && <Chip size="small" variant="outlined" label={d.area} />}
                                                        {d.grade_year != null && (
                                                            <Chip size="small" variant="outlined" label={`${d.grade_year}º ano`} />
                                                        )}
                                                        <Box sx={{ flex: 1 }} />
                                                        {canEdit(d) ? (
                                                            <>
                                                                <IconButton
                                                                    aria-label="editar"
                                                                    size="small"
                                                                    onClick={() => {
                                                                        setEditItem(d);
                                                                        setFormOpen(true);
                                                                    }}
                                                                >
                                                                    <EditIcon fontSize="small" />
                                                                </IconButton>
                                                                <IconButton
                                                                    aria-label="excluir"
                                                                    size="small"
                                                                    onClick={() => {
                                                                        setToDelete(d);
                                                                        setConfirmOpen(true);
                                                                    }}
                                                                >
                                                                    <DeleteIcon fontSize="small" />
                                                                </IconButton>
                                                            </>
                                                        ) : (
                                                            <Tooltip title="Descritor global — somente admins editam">
                                                                <LockIcon fontSize="small" color="disabled" />
                                                            </Tooltip>
                                                        )}
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>

                            <Box sx={{ display: { xs: "none", md: "block" } }}>
                                <TableContainer>
                                    <Table size="small" aria-label="Lista de descritores" sx={{ tableLayout: "fixed", width: "100%" }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ width: 180 }}>Código</TableCell>
                                                <TableCell sx={{ maxWidth: 0 }}>Título</TableCell>
                                                <TableCell sx={{ width: 160 }}>Área</TableCell>
                                                <TableCell sx={{ width: 80 }}>Ano</TableCell>
                                                <TableCell sx={{ width: 150 }}>Autoria</TableCell>
                                                <TableCell align="right" sx={{ width: 110 }}>Ações</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {rows.map((d) => (
                                                <TableRow key={d.id} hover>
                                                    <TableCell>
                                                        <Chip
                                                            size="small"
                                                            label={d.code}
                                                            sx={{ fontFamily: "monospace", fontWeight: 700, maxWidth: "100%" }}
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ maxWidth: 0 }}>
                                                        <Typography
                                                            fontWeight={600}
                                                            noWrap
                                                            title={d.title}
                                                            sx={{ overflow: "hidden", textOverflow: "ellipsis" }}
                                                        >
                                                            {d.title}
                                                        </Typography>
                                                        {d.description && (
                                                            <Typography variant="body2" color="text.secondary" noWrap title={d.description} sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                                                                {d.description}
                                                            </Typography>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{d.area || "—"}</TableCell>
                                                    <TableCell>{d.grade_year != null ? `${d.grade_year}º` : "—"}</TableCell>
                                                    <TableCell>
                                                        <OwnershipChip d={d} currentTeacherId={user?.teacher_id} />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {canEdit(d) ? (
                                                            <>
                                                                <IconButton
                                                                    aria-label="editar"
                                                                    onClick={() => {
                                                                        setEditItem(d);
                                                                        setFormOpen(true);
                                                                    }}
                                                                >
                                                                    <EditIcon />
                                                                </IconButton>
                                                                <IconButton
                                                                    aria-label="excluir"
                                                                    onClick={() => {
                                                                        setToDelete(d);
                                                                        setConfirmOpen(true);
                                                                    }}
                                                                >
                                                                    <DeleteIcon />
                                                                </IconButton>
                                                            </>
                                                        ) : (
                                                            <Tooltip title="Descritor global — somente admins editam">
                                                                <LockIcon fontSize="small" color="disabled" />
                                                            </Tooltip>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Box>

                            {totalPages > 1 && (
                                <Stack alignItems="center" sx={{ mt: 2 }}>
                                    <Pagination
                                        count={totalPages}
                                        page={page}
                                        onChange={(_, p) => setPage(p)}
                                        color="primary"
                                    />
                                </Stack>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            <DescriptorFormDialog
                open={formOpen}
                initial={editItem || undefined}
                currentRole={isAdmin ? "admin" : "teacher"}
                onClose={(changed) => {
                    setFormOpen(false);
                    setEditItem(null);
                    if (changed) {
                        setSnack({ open: true, message: "Descritor salvo.", severity: "success" });
                        qc.invalidateQueries({ queryKey: ["descriptors"] });
                    }
                }}
            />

            <ConfirmDialog
                open={confirmOpen}
                title="Remover descritor?"
                description={
                    toDelete
                        ? `Tem certeza que deseja remover "${toDelete.code} — ${toDelete.title}"? Questões associadas ficarão sem descritor.`
                        : undefined
                }
                confirmText="Remover"
                onConfirm={handleDelete}
                onClose={() => setConfirmOpen(false)}
            />

            {snack && (
                <Snackbar
                    open={snack.open}
                    autoHideDuration={4000}
                    onClose={() => setSnack((s) => (s ? { ...s, open: false } : s))}
                >
                    <Alert onClose={() => setSnack(null)} severity={snack.severity} variant="filled">
                        {snack.message}
                    </Alert>
                </Snackbar>
            )}
        </Box>
    );
}
