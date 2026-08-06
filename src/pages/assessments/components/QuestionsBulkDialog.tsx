import React from "react";
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Tab,
    Tabs,
    Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { bulkCreateQuestionsByAssessment } from "../../../api/questions";
import { getAssessment } from "../../../api/assessments";
import { useAllDescriptors } from "../../../hooks/useDescriptors";
import { createEmptyDraft, validateAndResolve } from "../../../lib/questionsBulk/parse";
import type {
    BulkRowDraft,
    BulkRowError,
    WeightMode,
} from "../../../lib/questionsBulk/parse";
import QuestionsBulkTable from "./bulk/QuestionsBulkTable";
import QuestionsBulkUpload from "./bulk/QuestionsBulkUpload";
import QuestionsBulkPaste from "./bulk/QuestionsBulkPaste";
import QuestionsBulkErrors from "./bulk/QuestionsBulkErrors";
import { parseBulkSubmissionError } from "./bulk/bulkApiErrors";
import {
    MAX_BULK_IMPORT_ROWS,
    validateBulkImportRowCount,
} from "./bulk/bulkImportGuards";

interface Props {
    open: boolean;
    assessmentId: number;
    onClose: (imported: boolean) => void;
}

type TabKey = "table" | "upload" | "paste";

export default function QuestionsBulkDialog({ open, assessmentId, onClose }: Props) {
    const [tab, setTab] = React.useState<TabKey>("table");
    const [drafts, setDrafts] = React.useState<BulkRowDraft[]>([]);
    const [submitErr, setSubmitErr] = React.useState<string | null>(null);
    const [serverErrors, setServerErrors] = React.useState<BulkRowError[]>([]);
    const [submitting, setSubmitting] = React.useState(false);
    const [focusedRow, setFocusedRow] = React.useState<number | null>(null);

    const { data: assess } = useQuery({
        queryKey: ["assessment-meta", assessmentId],
        queryFn: () => getAssessment(Number(assessmentId), "id,title,weight_mode"),
        enabled: !!assessmentId && open,
        staleTime: 30_000,
    });

    const {
        data: descriptors,
        isLoading: loadingDescriptors,
        isError: descriptorsError,
        refetch: refetchDescriptors,
    } = useAllDescriptors();

    const weightMode: WeightMode = assess?.weight_mode;

    React.useEffect(() => {
        if (open) {
            setDrafts((prev) => (prev.length === 0 ? [createEmptyDraft()] : prev));
            return;
        }
        setTab("table");
        setDrafts([]);
        setSubmitErr(null);
        setServerErrors([]);
        setSubmitting(false);
        setFocusedRow(null);
    }, [open]);

    const needsDescriptorCatalog = React.useMemo(
        () => drafts.some((draft) => Boolean(draft.descriptor_code || draft.descriptor_id)),
        [drafts],
    );

    const { items, errors: validationErrors } = React.useMemo(() => {
        if (!drafts.length) return { items: [], errors: [] as BulkRowError[] };
        if (needsDescriptorCatalog && (loadingDescriptors || descriptorsError)) {
            return { items: [], errors: [] as BulkRowError[] };
        }
        return validateAndResolve(drafts, assessmentId, { weightMode, descriptors });
    }, [
        drafts,
        assessmentId,
        weightMode,
        descriptors,
        needsDescriptorCatalog,
        loadingDescriptors,
        descriptorsError,
    ]);

    const errors = React.useMemo(
        () => [...validationErrors, ...serverErrors],
        [validationErrors, serverErrors],
    );

    const errorsByRow = React.useMemo(() => {
        const m = new Map<number, BulkRowError[]>();
        errors.forEach((err) => {
            const list = m.get(err.row) ?? [];
            list.push(err);
            m.set(err.row, list);
        });
        return m;
    }, [errors]);

    const canImport =
        drafts.length > 0 &&
        drafts.length <= MAX_BULK_IMPORT_ROWS &&
        errors.length === 0 &&
        !submitting &&
        !(needsDescriptorCatalog && (loadingDescriptors || descriptorsError));

    const updateDrafts = React.useCallback((next: BulkRowDraft[]) => {
        setServerErrors([]);
        setSubmitErr(null);
        setDrafts(next);
    }, []);

    const isUntouchedPlaceholder = (draft: BulkRowDraft) =>
        draft.display_order === null &&
        draft.text.trim() === "" &&
        draft.skill_level === null &&
        draft.weight === null &&
        draft.correct_option === null &&
        draft.descriptor_code === null &&
        draft.descriptor_id === null;

    const handleParsedFromImport = (parsed: BulkRowDraft[]) => {
        setServerErrors([]);
        setSubmitErr(null);
        const base =
            drafts.length === 1 && isUntouchedPlaceholder(drafts[0]) ? [] : drafts;
        const next = [...base, ...parsed];
        const rowCountError = validateBulkImportRowCount(next.length);
        if (rowCountError) {
            setSubmitErr(rowCountError);
            return;
        }
        setDrafts(next);
        setTab("table");
    };

    const handleImport = async () => {
        setSubmitErr(null);
        setServerErrors([]);
        if (!items.length) {
            setSubmitErr("Nenhuma questão válida para importar.");
            return;
        }
        setSubmitting(true);
        try {
            await bulkCreateQuestionsByAssessment(assessmentId, items);
            onClose(true);
        } catch (e: unknown) {
            const parsed = parseBulkSubmissionError(e);
            setSubmitErr(parsed.message);
            setServerErrors(parsed.rowErrors);
        } finally {
            setSubmitting(false);
        }
    };

    const importLabel = submitting
        ? "Importando…"
        : items.length
            ? `Importar ${items.length} ${items.length === 1 ? "questão" : "questões"}`
            : "Importar";

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="lg" fullWidth>
            <DialogTitle>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                    <Typography variant="h6" sx={{ flex: 1 }}>
                        Importar questões em lote
                    </Typography>
                    {drafts.length > 0 && (
                        <Chip
                            size="small"
                            label={`${drafts.length} linha${drafts.length === 1 ? "" : "s"}`}
                            color={errors.length ? "warning" : "success"}
                            variant="outlined"
                        />
                    )}
                    {errors.length > 0 && (
                        <Chip
                            size="small"
                            color="warning"
                            label={`${errors.length} erro${errors.length === 1 ? "" : "s"}`}
                        />
                    )}
                </Stack>
            </DialogTitle>

            <DialogContent dividers>
                <Stack spacing={2}>
                    <Tabs value={tab} onChange={(_, v) => setTab(v as TabKey)}>
                        <Tab label="Tabela editável" value="table" />
                        <Tab label="Importar planilha" value="upload" />
                        <Tab label="Colar texto" value="paste" />
                    </Tabs>

                    {loadingDescriptors && (
                        <Alert severity="info">Carregando catálogo de descritores…</Alert>
                    )}

                    {descriptorsError && (
                        <Alert
                            severity={needsDescriptorCatalog ? "error" : "warning"}
                            action={
                                <Button size="small" onClick={() => void refetchDescriptors()}>
                                    Tentar novamente
                                </Button>
                            }
                        >
                            {needsDescriptorCatalog
                                ? "Não foi possível carregar os descritores usados nas linhas. Tente novamente antes de importar."
                                : "Não foi possível carregar o catálogo de descritores. Você ainda pode importar questões sem descritor."}
                        </Alert>
                    )}

                    {drafts.length > MAX_BULK_IMPORT_ROWS && (
                        <Alert severity="error">
                            Esta importação excede o limite de {MAX_BULK_IMPORT_ROWS} questões.
                            Remova algumas linhas ou divida o conteúdo em lotes menores.
                        </Alert>
                    )}

                    <Box hidden={tab !== "table"}>
                        <QuestionsBulkTable
                            drafts={drafts}
                            onChange={updateDrafts}
                            weightMode={weightMode}
                            descriptors={descriptors}
                            errorsByRow={errorsByRow}
                            focusedRow={focusedRow}
                        />
                    </Box>

                    <Box hidden={tab !== "upload"}>
                        <QuestionsBulkUpload
                            weightMode={weightMode}
                            descriptors={descriptors}
                            onParsed={handleParsedFromImport}
                        />
                    </Box>

                    <Box hidden={tab !== "paste"}>
                        <QuestionsBulkPaste onParsed={handleParsedFromImport} />
                    </Box>

                    <QuestionsBulkErrors
                        errors={errors}
                        onSelectRow={(rowIdx) => {
                            setTab("table");
                            setFocusedRow(rowIdx);
                            window.setTimeout(() => setFocusedRow(null), 1200);
                        }}
                    />

                    {submitErr && <Alert severity="error">{submitErr}</Alert>}

                    <Typography variant="caption" color="text.secondary">
                        Limite de {MAX_BULK_IMPORT_ROWS} questões por importação.
                    </Typography>
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={() => onClose(false)}>Fechar</Button>
                <Button variant="contained" disabled={!canImport} onClick={handleImport}>
                    {importLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
