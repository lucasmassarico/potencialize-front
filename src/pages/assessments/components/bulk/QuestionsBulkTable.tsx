import React from "react";
import {
    Autocomplete,
    Box,
    Button,
    Chip,
    IconButton,
    MenuItem,
    Paper,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { createEmptyDraft } from "../../../../lib/questionsBulk/parse";
import type { BulkRowDraft, BulkRowError, WeightMode } from "../../../../lib/questionsBulk/parse";
import { SKILL_LABEL, SKILL_LEVELS } from "../../../../lib/skillLevels";
import type { Option, SkillLevel } from "../../../../types/questions";
import type { DescriptorOut } from "../../../../types/descriptors";

const OPTIONS: Option[] = ["a", "b", "c", "d", "e"];

interface Props {
    drafts: BulkRowDraft[];
    onChange: (next: BulkRowDraft[]) => void;
    weightMode: WeightMode;
    descriptors: DescriptorOut[] | undefined;
    errorsByRow: Map<number, BulkRowError[]>;
    focusedRow?: number | null;
}

function fieldHasError(errors: BulkRowError[] | undefined, field: keyof BulkRowDraft): boolean {
    return !!errors?.some((e) => e.field === field);
}

function fieldHelperText(errors: BulkRowError[] | undefined, field: keyof BulkRowDraft): string | undefined {
    return errors?.find((e) => e.field === field)?.message;
}

export default function QuestionsBulkTable({
    drafts,
    onChange,
    weightMode,
    descriptors,
    errorsByRow,
    focusedRow,
}: Props) {
    const isPerQuestion = weightMode === "per_question";
    const isBySkill = weightMode === "by_skill";
    const showSkillCol = isBySkill;
    const showWeightCol = isPerQuestion;
    const emptyColSpan = 6 + (showSkillCol ? 1 : 0) + (showWeightCol ? 1 : 0);

    const rowRefs = React.useRef<Array<HTMLTableRowElement | null>>([]);

    React.useEffect(() => {
        if (focusedRow == null) return;
        const el = rowRefs.current[focusedRow];
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
    }, [focusedRow]);

    const updateRow = (idx: number, patch: Partial<BulkRowDraft>) => {
        const next = drafts.map((d, i) => (i === idx ? { ...d, ...patch } : d));
        onChange(next);
    };

    const addRow = () => {
        onChange([...drafts, createEmptyDraft()]);
    };

    const removeRow = (idx: number) => {
        onChange(drafts.filter((_, i) => i !== idx));
    };

    const duplicateRow = (idx: number) => {
        const next = [...drafts];
        next.splice(idx + 1, 0, { ...drafts[idx] });
        onChange(next);
    };

    const clearAll = () => onChange([]);

    const descriptorOptions = React.useMemo(() => descriptors ?? [], [descriptors]);
    const descriptorByCode = React.useMemo(() => {
        const m = new Map<string, DescriptorOut>();
        descriptorOptions.forEach((d) => m.set(d.code.toLowerCase(), d));
        return m;
    }, [descriptorOptions]);

    return (
        <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="subtitle2" sx={{ flex: 1 }}>
                    {drafts.length} linha{drafts.length === 1 ? "" : "s"} na tabela
                </Typography>
                <Button startIcon={<AddIcon />} onClick={addRow} size="small" variant="outlined">
                    Adicionar linha
                </Button>
                <Button onClick={clearAll} size="small" disabled={!drafts.length}>
                    Limpar tudo
                </Button>
            </Stack>

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480 }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell width={48}>#</TableCell>
                            <TableCell width={120}>Número</TableCell>
                            <TableCell>Enunciado</TableCell>
                            {showSkillCol && <TableCell width={170}>Nível</TableCell>}
                            {showWeightCol && <TableCell width={110}>Peso</TableCell>}
                            <TableCell width={200}>Alternativa correta</TableCell>
                            <TableCell width={260}>Descritor</TableCell>
                            <TableCell width={88} align="right">
                                Ações
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {drafts.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={emptyColSpan}>
                                    <Box sx={{ textAlign: "center", py: 4 }}>
                                        <Typography variant="body2" color="text.secondary" mb={1}>
                                            Nenhuma linha. Adicione manualmente, importe uma planilha ou cole texto CSV.
                                        </Typography>
                                        <Button startIcon={<AddIcon />} onClick={addRow} variant="contained" size="small">
                                            Adicionar primeira linha
                                        </Button>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}

                        {drafts.map((row, idx) => {
                            const rowErrors = errorsByRow.get(idx + 1);
                            const isFocused = focusedRow === idx;

                            const currentDescriptor = row.descriptor_code
                                ? descriptorByCode.get(row.descriptor_code.toLowerCase()) ?? null
                                : null;

                            return (
                                <TableRow
                                    key={idx}
                                    ref={(el) => {
                                        rowRefs.current[idx] = el;
                                    }}
                                    sx={(t) => ({
                                        outline: isFocused ? `2px solid ${t.palette.primary.main}` : "none",
                                        outlineOffset: -2,
                                        backgroundColor: rowErrors?.length
                                            ? t.palette.warning.light + "22"
                                            : "transparent",
                                    })}
                                >
                                    <TableCell sx={{ verticalAlign: "top", pt: 1.5 }}>
                                        <Typography variant="caption" fontWeight={700}>
                                            {idx + 1}
                                        </Typography>
                                    </TableCell>

                                    <TableCell sx={{ verticalAlign: "top" }}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            type="number"
                                            inputProps={{ min: 1, step: 1 }}
                                            value={typeof row.display_order === "number" && Number.isNaN(row.display_order) ? "" : row.display_order ?? ""}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                updateRow(idx, {
                                                    display_order: v === "" ? null : Number(v),
                                                });
                                            }}
                                            error={fieldHasError(rowErrors, "display_order")}
                                            helperText={fieldHelperText(rowErrors, "display_order") || "Opcional"}
                                        />
                                    </TableCell>

                                    <TableCell sx={{ verticalAlign: "top" }}>
                                        <TextField
                                            fullWidth
                                            size="small"
                                            multiline
                                            maxRows={4}
                                            value={row.text}
                                            onChange={(e) => updateRow(idx, { text: e.target.value })}
                                            error={fieldHasError(rowErrors, "text")}
                                            helperText={fieldHelperText(rowErrors, "text")}
                                            placeholder="Digite o enunciado da questão"
                                        />
                                    </TableCell>

                                    {showSkillCol && (
                                        <TableCell sx={{ verticalAlign: "top" }}>
                                            <Select
                                                fullWidth
                                                size="small"
                                                displayEmpty
                                                value={row.skill_level ?? ""}
                                                onChange={(e) =>
                                                    updateRow(idx, {
                                                        skill_level: (e.target.value as SkillLevel) || null,
                                                    })
                                                }
                                                error={fieldHasError(rowErrors, "skill_level")}
                                                renderValue={(v) =>
                                                    v ? SKILL_LABEL[v as SkillLevel] : <em>Selecionar…</em>
                                                }
                                            >
                                                {SKILL_LEVELS.map((s) => (
                                                    <MenuItem key={s} value={s}>
                                                        {SKILL_LABEL[s]}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </TableCell>
                                    )}

                                    {showWeightCol && (
                                        <TableCell sx={{ verticalAlign: "top" }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                type="number"
                                                inputProps={{ step: "0.1", min: 0 }}
                                                value={row.weight ?? ""}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    updateRow(idx, {
                                                        weight: v === "" ? null : Number(v.replace(",", ".")),
                                                    });
                                                }}
                                                error={fieldHasError(rowErrors, "weight")}
                                                helperText={fieldHelperText(rowErrors, "weight")}
                                            />
                                        </TableCell>
                                    )}

                                    <TableCell sx={{ verticalAlign: "top" }}>
                                        <ToggleButtonGroup
                                            exclusive
                                            size="small"
                                            value={row.correct_option ?? ""}
                                            onChange={(_, v) => {
                                                if (v) updateRow(idx, { correct_option: v as Option });
                                            }}
                                            sx={{
                                                flexWrap: "wrap",
                                                ...(fieldHasError(rowErrors, "correct_option") && {
                                                    border: (t) => `1px solid ${t.palette.error.main}`,
                                                    borderRadius: 1,
                                                }),
                                            }}
                                        >
                                            {OPTIONS.map((o) => (
                                                <ToggleButton key={o} value={o} sx={{ minWidth: 32, fontWeight: 700 }}>
                                                    {o.toUpperCase()}
                                                </ToggleButton>
                                            ))}
                                        </ToggleButtonGroup>
                                    </TableCell>

                                    <TableCell sx={{ verticalAlign: "top" }}>
                                        <Autocomplete
                                            size="small"
                                            options={descriptorOptions}
                                            value={currentDescriptor}
                                            onChange={(_, v) =>
                                                updateRow(idx, {
                                                    descriptor_code: v?.code ?? null,
                                                    descriptor_id: v?.id ?? null,
                                                })
                                            }
                                            isOptionEqualToValue={(o, v) => o.id === v.id}
                                            getOptionLabel={(o) => `${o.code} — ${o.title}`}
                                            renderOption={(props, o) => (
                                                <Box component="li" {...props} key={o.id} sx={{ display: "block !important", py: 0.75 }}>
                                                    <Stack direction="row" spacing={1} alignItems="center" mb={0.25}>
                                                        <Chip
                                                            size="small"
                                                            label={o.code}
                                                            sx={{ fontFamily: "monospace", fontWeight: 700 }}
                                                        />
                                                        {o.area && <Chip size="small" variant="outlined" label={o.area} />}
                                                    </Stack>
                                                    <Typography variant="body2" fontWeight={600} noWrap>
                                                        {o.title}
                                                    </Typography>
                                                </Box>
                                            )}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    placeholder="Buscar descritor…"
                                                    error={fieldHasError(rowErrors, "descriptor_code")}
                                                    helperText={fieldHelperText(rowErrors, "descriptor_code")}
                                                />
                                            )}
                                        />
                                    </TableCell>

                                    <TableCell align="right" sx={{ verticalAlign: "top" }}>
                                        <Tooltip title="Duplicar linha">
                                            <IconButton size="small" onClick={() => duplicateRow(idx)}>
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Remover linha">
                                            <IconButton size="small" onClick={() => removeRow(idx)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Stack>
    );
}
