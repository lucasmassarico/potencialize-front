import * as React from "react";
import { Box, Button, ListItemText, Menu, MenuItem, Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SchoolRoundedIcon from "@mui/icons-material/SchoolRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import type { GroupBy, SortBy } from "../hooks/useAssessmentsListState";

interface Props {
    groupBy: GroupBy;
    setGroupBy: (g: GroupBy) => void;
    sortBy: SortBy;
    setSortBy: (s: SortBy) => void;
}

const SORT_LABEL: Record<SortBy, string> = {
    date_desc: "Mais recentes",
    date_asc: "Mais antigas",
    title_asc: "Título (A → Z)",
    title_desc: "Título (Z → A)",
};

const GROUP_ITEMS: { value: GroupBy; label: string; icon: React.ReactNode }[] = [
    { value: "class", label: "Turma", icon: <SchoolRoundedIcon fontSize="small" /> },
    { value: "subject", label: "Disciplina", icon: <MenuBookRoundedIcon fontSize="small" /> },
    { value: "month", label: "Mês", icon: <CalendarMonthRoundedIcon fontSize="small" /> },
];

export function AssessmentsViewControls({ groupBy, setGroupBy, sortBy, setSortBy }: Props) {
    const [anchor, setAnchor] = React.useState<HTMLElement | null>(null);
    const open = Boolean(anchor);
    const close = () => setAnchor(null);

    return (
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
                    Agrupar
                </Typography>
                <ToggleButtonGroup
                    value={groupBy}
                    exclusive
                    size="small"
                    onChange={(_, v: GroupBy | null) => v && setGroupBy(v)}
                    sx={(theme) => ({
                        "& .MuiToggleButton-root": {
                            textTransform: "none",
                            fontSize: 13,
                            fontWeight: 500,
                            border: `1px solid ${theme.palette.divider}`,
                            color: "text.secondary",
                            px: 1.25,
                            py: 0.5,
                            gap: 0.5,
                            "&.Mui-selected": {
                                bgcolor: theme.palette.action.selected,
                                color: theme.palette.primary.main,
                                borderColor: theme.palette.primary.main,
                            },
                        },
                    })}
                >
                    {GROUP_ITEMS.map((it) => (
                        <ToggleButton key={it.value} value={it.value} aria-label={`Agrupar por ${it.label}`}>
                            {it.icon}
                            {it.label}
                        </ToggleButton>
                    ))}
                </ToggleButtonGroup>
            </Stack>

            <Box sx={{ flexGrow: 1 }} />

            <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "uppercase", letterSpacing: 1, fontWeight: 600 }}>
                    Ordenar
                </Typography>
                <Button
                    size="small"
                    onClick={(e) => setAnchor(e.currentTarget)}
                    endIcon={<ExpandMoreRoundedIcon sx={{ transition: "transform 150ms", transform: open ? "rotate(180deg)" : "none" }} />}
                    sx={(theme) => ({
                        textTransform: "none",
                        fontWeight: 500,
                        color: "text.primary",
                        border: `1px solid ${theme.palette.divider}`,
                        bgcolor: "transparent",
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1.5,
                        "&:hover": { bgcolor: theme.palette.action.hover },
                    })}
                >
                    {SORT_LABEL[sortBy]}
                </Button>
                <Menu
                    anchorEl={anchor}
                    open={open}
                    onClose={close}
                    slotProps={{ paper: { elevation: 4, sx: { mt: 1, minWidth: 200, borderRadius: 2 } } }}
                    MenuListProps={{ disablePadding: true, dense: true, sx: { py: 0.5 } }}
                >
                    {(Object.keys(SORT_LABEL) as SortBy[]).map((k) => (
                        <MenuItem
                            key={k}
                            selected={sortBy === k}
                            onClick={() => {
                                setSortBy(k);
                                close();
                            }}
                            sx={{ py: 0.75, px: 1.5 }}
                        >
                            <ListItemText primary={SORT_LABEL[k]} primaryTypographyProps={{ fontSize: 14 }} />
                        </MenuItem>
                    ))}
                </Menu>
            </Stack>
        </Stack>
    );
}
