// src/components/LoadingOverlay.tsx
import { Backdrop, CircularProgress, Stack, Typography } from "@mui/material";

type Props = { open: boolean; label?: string };

export default function LoadingOverlay({ open, label = "Autenticando…" }: Props) {
    return (
        <Backdrop
            open={open}
            aria-live="polite"
            sx={(theme) => ({
                zIndex: theme.zIndex.modal + 1,
                color: theme.palette.mode === "light" ? "#111" : "#fff",
                backgroundColor: "rgba(0,0,0,0.08)", // leve véu; ajuste se quiser
            })}
        >
            <Stack alignItems="center" spacing={1} role="status" aria-busy={open}>
                <CircularProgress />
                <Typography variant="body2">{label}</Typography>
            </Stack>
        </Backdrop>
    );
}
