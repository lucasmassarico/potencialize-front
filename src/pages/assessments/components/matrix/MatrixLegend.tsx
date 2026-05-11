import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

export default function MatrixLegend() {
    return (
        <Stack direction="row" spacing={2} alignItems="center" sx={{ opacity: 0.9 }}>
            <Box
                sx={(theme) => ({
                    width: 16,
                    height: 16,
                    borderRadius: 0.5,
                    background: alpha(theme.palette.success.main, 0.3),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.5)}`,
                })}
            />
            <Typography variant="caption">Correto</Typography>
            <Box
                sx={(theme) => ({
                    width: 16,
                    height: 16,
                    borderRadius: 0.5,
                    background: alpha(theme.palette.error.main, 0.3),
                    border: `1px solid ${alpha(theme.palette.error.main, 0.5)}`,
                })}
            />
            <Typography variant="caption">Incorreto</Typography>
            <Box
                sx={{
                    width: 16,
                    height: 16,
                    borderRadius: 0.5,
                    border: (theme) => `1px dashed ${theme.palette.divider}`,
                }}
            />
            <Typography variant="caption">Não Respondeu</Typography>
        </Stack>
    );
}
