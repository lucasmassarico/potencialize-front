import { Alert, AlertTitle, Box, Chip, Stack, Typography } from "@mui/material";
import type { BulkRowDraft, BulkRowError } from "../../../../lib/questionsBulk/parse";

const FIELD_LABEL: Record<keyof BulkRowDraft | "row", string> = {
    display_order: "Número da questão",
    text: "Enunciado",
    skill_level: "Nível",
    weight: "Peso",
    correct_option: "Alternativa correta",
    descriptor_code: "Código do descritor",
    descriptor_id: "Descritor",
    row: "Linha",
};

interface Props {
    errors: BulkRowError[];
    onSelectRow?: (rowIndex: number) => void;
}

export default function QuestionsBulkErrors({ errors, onSelectRow }: Props) {
    if (!errors.length) return null;

    return (
        <Alert severity="warning" sx={{ alignItems: "flex-start" }}>
            <AlertTitle>
                {errors.length} erro{errors.length === 1 ? "" : "s"} encontrado{errors.length === 1 ? "" : "s"}
            </AlertTitle>
            <Box sx={{ maxHeight: 220, overflow: "auto", pr: 1 }}>
                <Stack spacing={0.75}>
                    {errors.slice(0, 50).map((err, i) => (
                        <Stack
                            key={`${err.row}-${err.field}-${i}`}
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            sx={{ flexWrap: "wrap" }}
                        >
                            <Chip
                                size="small"
                                label={`Linha ${err.row}`}
                                onClick={onSelectRow ? () => onSelectRow(err.row - 1) : undefined}
                                color="warning"
                                variant="outlined"
                                sx={{ fontWeight: 700, cursor: onSelectRow ? "pointer" : "default" }}
                            />
                            <Chip size="small" label={FIELD_LABEL[err.field] ?? err.field} variant="filled" />
                            <Typography variant="body2">{err.message}</Typography>
                        </Stack>
                    ))}
                    {errors.length > 50 && (
                        <Typography variant="caption" color="text.secondary">
                            …e mais {errors.length - 50} erro(s) omitido(s).
                        </Typography>
                    )}
                </Stack>
            </Box>
        </Alert>
    );
}
