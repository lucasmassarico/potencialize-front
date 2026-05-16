import * as React from "react";
import { Box, IconButton, InputAdornment, Menu, MenuItem, TextField, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

export interface SwitcherItem {
    id: string | number;
    label: string;
    to: string;
}

interface Props {
    label: string;
    items: SwitcherItem[];
    currentId?: string | number;
    placeholder?: string;
    emptyText?: string;
    ariaLabel?: string;
}

export function EntitySwitcher({
    label,
    items,
    currentId,
    placeholder = "Buscar…",
    emptyText = "Nada por aqui ainda.",
    ariaLabel = "Trocar contexto",
}: Props) {
    const [anchor, setAnchor] = React.useState<null | HTMLElement>(null);
    const [query, setQuery] = React.useState("");
    const nav = useNavigate();
    const open = Boolean(anchor);

    const handleClose = () => {
        setAnchor(null);
        setQuery("");
    };

    const filtered = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter((i) => i.label.toLowerCase().includes(q));
    }, [items, query]);

    return (
        <>
            <IconButton
                aria-label={ariaLabel}
                size="small"
                onClick={(e) => setAnchor(e.currentTarget)}
                sx={{
                    ml: 0.5,
                    color: "text.secondary",
                    borderRadius: 1,
                    transition: "background 150ms ease, color 150ms ease",
                    "&:hover": { color: "text.primary", bgcolor: "action.hover" },
                    ...(open && { color: "primary.main", bgcolor: "action.selected" }),
                }}
            >
                <ExpandMoreRoundedIcon
                    sx={{
                        transition: "transform 200ms ease",
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                />
            </IconButton>

            <Menu
                anchorEl={anchor}
                open={open}
                onClose={handleClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                slotProps={{
                    paper: {
                        elevation: 4,
                        sx: {
                            mt: 1,
                            minWidth: 280,
                            maxWidth: 360,
                            borderRadius: 2,
                            overflow: "hidden",
                        },
                    },
                }}
                MenuListProps={{ disablePadding: true, dense: true }}
            >
                <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
                    <Typography
                        sx={{
                            fontSize: 11,
                            letterSpacing: 1.4,
                            textTransform: "uppercase",
                            color: "text.secondary",
                            fontWeight: 600,
                            mb: 1,
                        }}
                    >
                        {label}
                    </Typography>
                    <TextField
                        autoFocus
                        size="small"
                        fullWidth
                        placeholder={placeholder}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchRoundedIcon fontSize="small" sx={{ color: "text.secondary" }} />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                <Box sx={{ maxHeight: 320, overflow: "auto", py: 0.5 }}>
                    {filtered.length === 0 ? (
                        <Box sx={{ px: 2, py: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                {emptyText}
                            </Typography>
                        </Box>
                    ) : (
                        filtered.map((it) => {
                            const isCurrent = currentId !== undefined && String(it.id) === String(currentId);
                            return (
                                <MenuItem
                                    key={it.id}
                                    onClick={() => {
                                        if (!isCurrent) nav(it.to);
                                        handleClose();
                                    }}
                                    selected={isCurrent}
                                    sx={{
                                        py: 1,
                                        px: 1.5,
                                        gap: 1.25,
                                        fontSize: 14,
                                    }}
                                >
                                    <Box sx={{ display: "inline-flex", width: 18, justifyContent: "center" }}>
                                        {isCurrent && <CheckRoundedIcon fontSize="small" sx={{ color: "primary.main" }} />}
                                    </Box>
                                    <Typography
                                        component="span"
                                        sx={{
                                            flex: 1,
                                            fontWeight: isCurrent ? 600 : 400,
                                            color: isCurrent ? "primary.main" : "text.primary",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        {it.label}
                                    </Typography>
                                </MenuItem>
                            );
                        })
                    )}
                </Box>
            </Menu>
        </>
    );
}
