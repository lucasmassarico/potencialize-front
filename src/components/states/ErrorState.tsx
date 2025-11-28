// src/components/states/ErrorState.tsx
import { Box, Typography, Button, Stack } from "@mui/material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

type Props = {
    errorMessage: string;
    titleOverride?: string;
    onRetry?: () => void;
};

export default function ErrorState({ errorMessage, titleOverride, onRetry }: Props) {
    const title = titleOverride ?? "Algo deu errado";
    return (
        <Box textAlign="center" py={6}>
            <Stack alignItems="center" spacing={2}>
                <ErrorOutlineIcon fontSize="large" />
                <Typography variant="h6" fontWeight={700}>
                    {title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {errorMessage}
                </Typography>
                {onRetry && (
                    <Button variant="contained" onClick={onRetry}>
                        Tentar novamente
                    </Button>
                )}
            </Stack>
        </Box>
    );
}
