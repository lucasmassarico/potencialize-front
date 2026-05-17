import * as React from "react";
import { Alert, Box, Button, Pagination, Snackbar, Stack } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ReplayIcon from "@mui/icons-material/Replay";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { EntityHeader } from "../../components/layout/EntityHeader";
import ConfirmDialog from "../../components/ConfirmDialog";
import AssessmentFormDialog from "../classes/components/AssessmentFormDialog";
import { deleteAssessment } from "../../api/assessments";
import type { AssessmentOut } from "../../types/assessments";

import { useAssessmentsListState } from "./list/hooks/useAssessmentsListState";
import { AssessmentsKpiStrip } from "./list/components/AssessmentsKpiStrip";
import { AssessmentsToolbar } from "./list/components/AssessmentsToolbar";
import { AssessmentsViewControls } from "./list/components/AssessmentsViewControls";
import { AssessmentsGroup } from "./list/components/AssessmentsGroup";
import { AssessmentRow } from "./list/components/AssessmentRow";

export default function AssessmentsList() {
    const qc = useQueryClient();
    const state = useAssessmentsListState();

    const [formOpen, setFormOpen] = React.useState(false);
    const [editItem, setEditItem] = React.useState<AssessmentOut | null>(null);
    const [toDelete, setToDelete] = React.useState<AssessmentOut | null>(null);
    const [snack, setSnack] = React.useState<{ open: boolean; msg: string; severity: "success" | "error" }>({ open: false, msg: "", severity: "success" });

    const releaseFocus = React.useCallback((event?: React.MouseEvent<HTMLElement>) => {
        event?.currentTarget.blur();
        if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }, []);

    const openCreateForm = React.useCallback(
        (event?: React.MouseEvent<HTMLElement>) => {
            releaseFocus(event);
            setEditItem(null);
            setFormOpen(true);
        },
        [releaseFocus],
    );

    const openEditForm = React.useCallback(
        (assessment: AssessmentOut) => {
            releaseFocus();
            setEditItem(assessment);
            setFormOpen(true);
        },
        [releaseFocus],
    );

    const deletion = useMutation({
        mutationFn: (id: number) => deleteAssessment(id),
        onSuccess: () => {
            if (state.filtered.length === 1 && state.page > 1) state.setPage(state.page - 1);
            qc.invalidateQueries({ queryKey: ["assessments"] });
            qc.invalidateQueries({ queryKey: ["classes"] });
            setSnack({ open: true, msg: "Avaliação excluída.", severity: "success" });
            setToDelete(null);
        },
        onError: () => {
            setSnack({ open: true, msg: "Falha ao excluir avaliação.", severity: "error" });
        },
    });

    const handleFormClose = (changed: boolean) => {
        setFormOpen(false);
        setEditItem(null);
        if (changed) {
            state.setPage(1);
            qc.invalidateQueries({ queryKey: ["assessments"] });
            qc.invalidateQueries({ queryKey: ["classes"] });
            setSnack({ open: true, msg: "Avaliação salva.", severity: "success" });
        }
    };

    const tabs = [{ key: "list", label: "Todas", to: "/assessments" }];

    return (
        <Box sx={{ display: "grid", gap: 3 }}>
            <EntityHeader
                eyebrow="Visão geral"
                crumbs={[{ label: "Avaliações" }]}
                title="Avaliações"
                tabs={tabs}
                tabValue="list"
                tabActions={
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddRoundedIcon />}
                        onClick={openCreateForm}
                        sx={{ textTransform: "none", fontWeight: 600 }}
                    >
                        Nova avaliação
                    </Button>
                }
            />

            <AssessmentsKpiStrip kpis={state.kpis} filtered={state.hasActiveFilters} isLoading={state.isLoading} pageScoped={state.totalPages > 1} />

            <AssessmentsToolbar
                filters={state.filters}
                setFilters={state.setFilters}
                clearFilters={state.clearFilters}
                hasActiveFilters={state.hasActiveFilters}
                classes={state.classes}
                totalShown={state.total}
            />

            <AssessmentsViewControls
                groupBy={state.groupBy}
                setGroupBy={state.setGroupBy}
                sortBy={state.sortBy}
                setSortBy={state.setSortBy}
            />

            {state.isError ? (
                <Alert
                    severity="error"
                    action={
                        <Button size="small" startIcon={<ReplayIcon />} onClick={() => state.refetch()}>
                            Tentar novamente
                        </Button>
                    }
                >
                    Erro ao carregar avaliações.
                </Alert>
            ) : state.isLoading ? (
                <ListLoading />
            ) : state.groups.length === 0 ? (
                <EmptyState
                    title={state.hasActiveFilters ? "Nenhuma avaliação corresponde aos filtros." : "Você ainda não tem avaliações."}
                    description={
                        state.hasActiveFilters
                            ? "Ajuste ou remova filtros para ver mais resultados."
                            : "Comece criando sua primeira avaliação para uma turma."
                    }
                    action={
                        state.hasActiveFilters ? (
                            <Button onClick={state.clearFilters} variant="outlined" sx={{ textTransform: "none" }}>
                                Limpar filtros
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                startIcon={<AddRoundedIcon />}
                                onClick={openCreateForm}
                                sx={{ textTransform: "none", fontWeight: 600 }}
                            >
                                Criar primeira avaliação
                            </Button>
                        )
                    }
                />
            ) : (
                <Stack spacing={2}>
                    {state.groups.map((g) => (
                        <AssessmentsGroup key={g.key} label={g.label} subLabel={g.subLabel} count={g.items.length}>
                            {g.items.map((a, idx) => {
                                const klass = state.classById.get(a.class_id);
                                const className = klass?.name;
                                return (
                                    <AssessmentRow
                                        key={a.id}
                                        assessment={a}
                                        className={className}
                                        showClass={state.groupBy !== "class"}
                                        isLast={idx === g.items.length - 1}
                                        onEdit={() => openEditForm(a)}
                                        onDelete={() => setToDelete(a)}
                                    />
                                );
                            })}
                        </AssessmentsGroup>
                    ))}
                    {state.totalPages > 1 && (
                        <Stack direction="row" justifyContent="center" sx={{ pt: 1 }}>
                            <Pagination page={state.page} count={state.totalPages} onChange={(_, value) => state.setPage(value)} />
                        </Stack>
                    )}
                </Stack>
            )}

            <AssessmentFormDialog
                open={formOpen}
                initial={editItem ?? undefined}
                classId={editItem?.class_id}
                onClose={handleFormClose}
            />

            <ConfirmDialog
                open={!!toDelete}
                title="Excluir avaliação?"
                description={toDelete ? `"${toDelete.title}" será removida permanentemente.` : ""}
                confirmText="Excluir"
                onClose={() => setToDelete(null)}
                onConfirm={() => {
                    if (toDelete) deletion.mutate(toDelete.id);
                }}
            />

            <Snackbar
                open={snack.open}
                autoHideDuration={3500}
                onClose={() => setSnack((s) => ({ ...s, open: false }))}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                <Alert severity={snack.severity} onClose={() => setSnack((s) => ({ ...s, open: false }))} variant="filled">
                    {snack.msg}
                </Alert>
            </Snackbar>
        </Box>
    );
}

function ListLoading() {
    return (
        <Stack spacing={2}>
            {[0, 1].map((i) => (
                <Box
                    key={i}
                    sx={(theme) => ({
                        height: 240,
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        bgcolor: theme.palette.action.hover,
                        animation: "pz-list-pulse 1.4s ease-in-out infinite",
                        "@keyframes pz-list-pulse": {
                            "0%, 100%": { opacity: 0.55 },
                            "50%": { opacity: 0.85 },
                        },
                        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                    })}
                />
            ))}
        </Stack>
    );
}

interface EmptyStateProps {
    title: string;
    description: string;
    action: React.ReactNode;
}

function EmptyState({ title, description, action }: EmptyStateProps) {
    return (
        <Box
            sx={(theme) => ({
                borderRadius: 2,
                border: `1px dashed ${theme.palette.divider}`,
                bgcolor: theme.palette.background.paper,
                py: 6,
                px: 3,
                textAlign: "center",
            })}
        >
            <Stack spacing={1} alignItems="center">
                <Box sx={{ fontSize: 17, fontWeight: 700, color: "text.primary" }}>{title}</Box>
                <Box sx={{ fontSize: 14, color: "text.secondary", maxWidth: 420 }}>{description}</Box>
                <Box sx={{ pt: 1 }}>{action}</Box>
            </Stack>
        </Box>
    );
}
