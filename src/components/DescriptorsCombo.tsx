import type React from "react";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
    Autocomplete,
    Box,
    Chip,
    CircularProgress,
    IconButton,
    TextField,
    Tooltip,
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

const MAX_RENDERED_OPTIONS = 50;

function normalize(value: string) {
    return value
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLocaleLowerCase("pt-BR");
}

// Pure export kept beside the component so its user-visible search behavior can be tested.
// eslint-disable-next-line react-refresh/only-export-components
export function filterDescriptorOptions(
    options: readonly DescriptorOut[],
    inputValue: string,
): DescriptorOut[] {
    const query = normalize(inputValue.trim());
    if (!query) return options.slice(0, MAX_RENDERED_OPTIONS);

    const tokens = query.split(/\s+/).filter(Boolean);
    return options
        .filter((option) => {
            const haystack = normalize(
                [
                    option.code,
                    option.title,
                    option.description ?? "",
                    option.area ?? "",
                ].join(" "),
            );
            return tokens.every((token) => haystack.includes(token));
        })
        .slice(0, MAX_RENDERED_OPTIONS);
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
    const {
        data,
        isError,
        isFetching,
        isLoading,
        refetch,
    } = useAllDescriptors();
    const options = data ?? [];
    const catalogLoading = isLoading || (isFetching && options.length === 0);

    return (
        <Autocomplete
            options={options}
            value={value}
            onChange={(_, nextValue) => onChange(nextValue)}
            isOptionEqualToValue={(option, selected) => option.id === selected.id}
            getOptionLabel={(option) => `${option.code} — ${option.title}`}
            filterOptions={(items, state) =>
                filterDescriptorOptions(items, state.inputValue)
            }
            loading={catalogLoading}
            disabled={disabled}
            fullWidth={fullWidth}
            loadingText="Carregando descritores…"
            noOptionsText={
                isError
                    ? "Não foi possível carregar os descritores."
                    : "Nenhum descritor encontrado."
            }
            renderOption={(props, option) => (
                <Box
                    component="li"
                    {...props}
                    key={option.id}
                    sx={{ display: "block !important", py: 1 }}
                >
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mb: 0.25,
                        }}
                    >
                        <Chip
                            size="small"
                            label={option.code}
                            sx={{ fontFamily: "monospace", fontWeight: 700 }}
                        />
                        {option.area && (
                            <Chip size="small" variant="outlined" label={option.area} />
                        )}
                        {option.grade_year != null && (
                            <Chip
                                size="small"
                                variant="outlined"
                                label={`${option.grade_year}º ano`}
                            />
                        )}
                    </Box>
                    <Typography variant="body2" fontWeight={600} noWrap>
                        {option.title}
                    </Typography>
                    {option.description && (
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            component="div"
                        >
                            {option.description}
                        </Typography>
                    )}
                </Box>
            )}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    error={error || isError}
                    helperText={
                        isError
                            ? "Falha ao carregar os descritores. Tente novamente."
                            : helperText
                    }
                    placeholder="Buscar por código, título, área…"
                    InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                            <>
                                {isFetching ? <CircularProgress size={18} /> : null}
                                {isError ? (
                                    <Tooltip title="Tentar carregar os descritores novamente">
                                        <IconButton
                                            aria-label="Tentar carregar os descritores novamente"
                                            edge="end"
                                            size="small"
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => void refetch()}
                                        >
                                            <RefreshIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                ) : null}
                                {params.InputProps.endAdornment}
                            </>
                        ),
                    }}
                />
            )}
        />
    );
}
