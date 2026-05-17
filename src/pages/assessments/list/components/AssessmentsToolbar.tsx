import * as React from "react";
import {
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    InputAdornment,
    ListItemText,
    Menu,
    MenuItem,
    Radio,
    Stack,
    TextField,
    Typography,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import type { ClassOut } from "../../../../types/classes";
import type { SubjectKind, WeightMode } from "../../../../types/assessments";
import type { Filters, PeriodPreset } from "../hooks/useAssessmentsListState";
import { SUBJECT_ORDER, WEIGHT_ORDER, subjectLabel, weightLabel } from "../../utils/assessmentLabels";

interface Props {
    filters: Filters;
    setFilters: (next: Partial<Filters>) => void;
    clearFilters: () => void;
    hasActiveFilters: boolean;
    classes: ClassOut[];
    totalShown: number;
}

interface FilterButtonProps {
    label: string;
    activeCount: number;
    children: (close: () => void) => React.ReactNode;
}

function FilterButton({ label, activeCount, children }: FilterButtonProps) {
    const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
    const open = Boolean(anchor);
    const close = () => setAnchor(null);

    return (
        <>
            <Button
                onClick={(e) => setAnchor(e.currentTarget)}
                endIcon={<ExpandMoreRoundedIcon sx={{ transition: "transform 150ms", transform: open ? "rotate(180deg)" : "none" }} />}
                sx={(theme) => ({
                    textTransform: "none",
                    fontWeight: 500,
                    color: activeCount > 0 ? "primary.main" : "text.primary",
                    border: `1px solid ${activeCount > 0 ? theme.palette.primary.main : theme.palette.divider}`,
                    bgcolor: activeCount > 0 ? theme.palette.action.selected : "transparent",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1.5,
                    "&:hover": { bgcolor: theme.palette.action.hover, borderColor: theme.palette.primary.main },
                })}
            >
                {label}
                {activeCount > 0 && (
                    <Chip
                        size="small"
                        label={activeCount}
                        sx={{ ml: 0.75, height: 18, fontSize: 11, "& .MuiChip-label": { px: 0.75 } }}
                        color="primary"
                    />
                )}
            </Button>
            <Menu
                anchorEl={anchor}
                open={open}
                onClose={close}
                slotProps={{
                    paper: {
                        elevation: 4,
                        sx: { mt: 1, minWidth: 240, maxWidth: 320, borderRadius: 2, overflow: "hidden" },
                    },
                }}
                MenuListProps={{ disablePadding: true, dense: true, sx: { py: 0.5 } }}
            >
                {children(close)}
            </Menu>
        </>
    );
}

interface CheckOption<T extends string | number> {
    value: T;
    label: string;
}

function SingleOptionList<T extends string | number>({
    options,
    selected,
    onSelect,
}: {
    options: CheckOption<T>[];
    selected?: T;
    onSelect: (next: T | undefined) => void;
}) {
    return (
        <>
            {options.map((o) => {
                const checked = selected === o.value;
                return (
                    <MenuItem key={String(o.value)} onClick={() => onSelect(checked ? undefined : o.value)} sx={{ py: 0.75, px: 1.5 }}>
                        <Radio size="small" edge="start" checked={checked} disableRipple sx={{ p: 0.5 }} />
                        <ListItemText primary={o.label} primaryTypographyProps={{ fontSize: 14 }} />
                    </MenuItem>
                );
            })}
        </>
    );
}

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
    { value: "all", label: "Qualquer período" },
    { value: "next_7", label: "Próximos 7 dias" },
    { value: "this_week", label: "Esta semana" },
    { value: "this_month", label: "Este mês" },
    { value: "last_month", label: "Mês passado" },
];

export function AssessmentsToolbar({ filters, setFilters, clearFilters, hasActiveFilters, classes, totalShown }: Props) {
    const classOptions: CheckOption<number>[] = React.useMemo(
        () =>
            classes
                .map((c) => ({
                    value: c.id,
                    label: c.year ? `${c.name} · ${c.year}` : c.name,
                }))
                .sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
        [classes],
    );

    const subjectOptions: CheckOption<SubjectKind>[] = SUBJECT_ORDER.map((s) => ({ value: s, label: subjectLabel(s) }));
    const modeOptions: CheckOption<WeightMode>[] = WEIGHT_ORDER.map((m) => ({ value: m, label: weightLabel(m) }));
    const periodLabel = PERIOD_OPTIONS.find((p) => p.value === filters.period)?.label ?? "Período";
    const periodActive = filters.period !== "all" ? 1 : 0;
    const selectedClassOption = filters.classId ? classOptions.find((o) => o.value === filters.classId) : undefined;

    return (
        <Stack spacing={1.5}>
            <TextField
                fullWidth
                size="small"
                placeholder="Buscar avaliação por título…"
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                    ),
                    endAdornment: filters.search ? (
                        <InputAdornment position="end">
                            <IconButton size="small" onClick={() => setFilters({ search: "" })} aria-label="Limpar busca">
                                <ClearRoundedIcon fontSize="small" />
                            </IconButton>
                        </InputAdornment>
                    ) : undefined,
                }}
            />

            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <FilterButton label="Turma" activeCount={filters.classId ? 1 : 0}>
                    {(close) => (
                        <SingleOptionList
                            options={classOptions}
                            selected={filters.classId}
                            onSelect={(next) => {
                                setFilters({ classId: next });
                                close();
                            }}
                        />
                    )}
                </FilterButton>

                <FilterButton label="Disciplina" activeCount={filters.subject ? 1 : 0}>
                    {(close) => (
                        <SingleOptionList
                            options={subjectOptions}
                            selected={filters.subject}
                            onSelect={(next) => {
                                setFilters({ subject: next });
                                close();
                            }}
                        />
                    )}
                </FilterButton>

                <FilterButton label="Modo" activeCount={filters.mode ? 1 : 0}>
                    {(close) => (
                        <SingleOptionList
                            options={modeOptions}
                            selected={filters.mode}
                            onSelect={(next) => {
                                setFilters({ mode: next });
                                close();
                            }}
                        />
                    )}
                </FilterButton>

                <FilterButton label={periodActive ? periodLabel : "Período"} activeCount={periodActive}>
                    {(close) => (
                        <>
                            {PERIOD_OPTIONS.map((o) => (
                                <MenuItem
                                    key={o.value}
                                    onClick={() => {
                                        setFilters({ period: o.value });
                                        close();
                                    }}
                                    sx={{ py: 0.75, px: 1.5 }}
                                >
                                    <Radio size="small" edge="start" checked={filters.period === o.value} disableRipple sx={{ p: 0.5 }} />
                                    <ListItemText primary={o.label} primaryTypographyProps={{ fontSize: 14 }} />
                                </MenuItem>
                            ))}
                        </>
                    )}
                </FilterButton>

                <Box sx={{ flexGrow: 1 }} />

                {hasActiveFilters && (
                    <Button size="small" onClick={clearFilters} sx={{ textTransform: "none", color: "text.secondary" }}>
                        Limpar filtros
                    </Button>
                )}

                <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: "none", md: "block" } }} />

                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
                    {totalShown} {totalShown === 1 ? "item" : "itens"}
                </Typography>
            </Stack>

            {hasActiveFilters && (
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ pt: 0.5 }}>
                    {filters.search && (
                        <Chip
                            size="small"
                            label={`"${filters.search}"`}
                            onDelete={() => setFilters({ search: "" })}
                            deleteIcon={<CloseRoundedIcon />}
                            variant="outlined"
                        />
                    )}
                    {filters.classId && (
                        <Chip
                            key={`class-${filters.classId}`}
                            size="small"
                            label={selectedClassOption?.label ?? `Turma #${filters.classId}`}
                            onDelete={() => setFilters({ classId: undefined })}
                            deleteIcon={<CloseRoundedIcon />}
                            variant="outlined"
                        />
                    )}
                    {filters.subject && (
                        <Chip
                            key={`subj-${filters.subject}`}
                            size="small"
                            label={subjectLabel(filters.subject)}
                            onDelete={() => setFilters({ subject: undefined })}
                            deleteIcon={<CloseRoundedIcon />}
                            variant="outlined"
                        />
                    )}
                    {filters.mode && (
                        <Chip
                            key={`mode-${filters.mode}`}
                            size="small"
                            label={weightLabel(filters.mode)}
                            onDelete={() => setFilters({ mode: undefined })}
                            deleteIcon={<CloseRoundedIcon />}
                            variant="outlined"
                        />
                    )}
                    {filters.period !== "all" && (
                        <Chip
                            size="small"
                            label={periodLabel}
                            onDelete={() => setFilters({ period: "all" })}
                            deleteIcon={<CloseRoundedIcon />}
                            variant="outlined"
                        />
                    )}
                </Stack>
            )}
        </Stack>
    );
}
