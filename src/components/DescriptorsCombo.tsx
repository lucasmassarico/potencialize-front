import React from "react";
import {
    Autocomplete,
    Box,
    Chip,
    CircularProgress,
    TextField,
    Typography,
} from "@mui/material";
import { useAllDescriptors } from "../hooks/useDescriptors";
import type { DescriptorOut } from "../types/descriptors";

interface Props {
    label?: string;
    value: DescriptorOut | null;
    onChange: (descriptor: DescriptorOut | null) => void;
    error?: boolean;
    helperText?: React.ReactNode;
    disabled?: boolean;
    fullWidth?: boolean;
}

function normalize(s: string) {
    return s.toLowerCase();
}

export default function DescriptorsCombo({
    label = "Descritor",
    value,
    onChange,
    error,
    helperText,
    disabled,
    fullWidth = true,
}: Props) {
    const { data, isLoading } = useAllDescriptors();
    const options = data ?? [];

    const filterOptions = React.useCallback(
        (opts: DescriptorOut[], state: { inputValue: string }) => {
            const q = normalize(state.inputValue.trim());
            if (!q) return opts.slice(0, 50);
            const tokens = q.split(/\s+/).filter(Boolean);
            const matches = opts.filter((o) => {
                const haystack = normalize(
                    [o.code, o.title, o.description ?? "", o.area ?? ""].join(" "),
                );
                return tokens.every((t) => haystack.includes(t));
            });
            return matches.slice(0, 50);
        },
        [],
    );

    return (
        <Autocomplete
            options={options}
            value={value}
            onChange={(_, v) => onChange(v)}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            getOptionLabel={(o) => `${o.code} — ${o.title}`}
            filterOptions={filterOptions}
            loading={isLoading}
            disabled={disabled}
            fullWidth={fullWidth}
            noOptionsText={isLoading ? "Carregando…" : "Nenhum descritor"}
            renderOption={(props, o) => (
                <Box component="li" {...props} key={o.id} sx={{ display: "block !important", py: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
                        <Chip
                            size="small"
                            label={o.code}
                            sx={{ fontFamily: "monospace", fontWeight: 700 }}
                        />
                        {o.area && (
                            <Chip size="small" variant="outlined" label={o.area} />
                        )}
                        {o.grade_year != null && (
                            <Chip size="small" variant="outlined" label={`${o.grade_year}º ano`} />
                        )}
                    </Box>
                    <Typography variant="body2" fontWeight={600} noWrap>
                        {o.title}
                    </Typography>
                    {o.description && (
                        <Typography variant="caption" color="text.secondary" noWrap component="div">
                            {o.description}
                        </Typography>
                    )}
                </Box>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    error={error}
                    helperText={helperText}
                    placeholder="Buscar por código, título, área…"
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {isLoading ? <CircularProgress size={18} /> : null}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }}
                />
            )}
        />
    );
}
