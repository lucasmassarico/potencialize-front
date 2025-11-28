// src/components/CenteredLoader.tsx
import { Box, Stack, CircularProgress, Typography, keyframes } from "@mui/material";

const pulse = keyframes`
  0% { opacity: 0.6; transform: scale(0.98); }
  50% { opacity: 1;   transform: scale(1);    }
  100% { opacity: 0.6; transform: scale(0.98); }
`;

export default function CenteredLoader({ label = "Carregando…" }: { label?: string }) {
    return (
        <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 3 }}>
            <Stack alignItems="center" spacing={1} role="status" aria-live="polite" aria-busy>
                <CircularProgress />
                <Typography variant="body2" sx={{ animation: `${pulse} 1.6s ease-in-out infinite` }}>
                    {label}
                </Typography>
            </Stack>
        </Box>
    );
}
