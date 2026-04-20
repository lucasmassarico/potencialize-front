// src/components/states/NotFound.tsx
import { Box, Typography, Button, Stack } from "@mui/material";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { useNavigate, useLocation } from "react-router-dom";

type Props = {
    resourceName?: string;
    details?: string;
    ctaHref?: string;
    ctaLabel?: string;
};

export default function NotFound({ resourceName = "Recurso", details, ctaHref = "/", ctaLabel = "Ir para a página inicial" }: Props) {
    const nav = useNavigate();
    const { state } = useLocation();
    const from = (state as any)?.from as string | undefined;

    return (
        <Box textAlign="center" py={6}>
            <Stack alignItems="center" spacing={2}>
                <SearchOffIcon fontSize="large" />
                <Typography variant="h6" fontWeight={700}>
                    {resourceName} não encontrada
                </Typography>
                {details && (
                    <Typography variant="body2" color="text.secondary">
                        {details}
                    </Typography>
                )}
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="outlined"
                        onClick={() => {
                            if (typeof from === "string" && from.length > 0) {
                                nav(from);
                            } else {
                                nav(-1);
                            }
                        }}
                    >
                        Voltar
                    </Button>
                    <Button variant="contained" onClick={() => nav(ctaHref)}>
                        {ctaLabel}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
