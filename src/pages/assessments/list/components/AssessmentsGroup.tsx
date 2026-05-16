import { Box, Stack, Typography } from "@mui/material";

interface Props {
    label: string;
    subLabel?: string;
    count: number;
    children: React.ReactNode;
}

export function AssessmentsGroup({ label, subLabel, count, children }: Props) {
    return (
        <Box
            component="section"
            sx={(theme) => ({
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: theme.palette.background.paper,
                overflow: "hidden",
            })}
        >
            <Stack
                direction="row"
                alignItems="center"
                sx={(theme) => ({
                    px: 2.5,
                    py: 1.25,
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.palette.action.hover,
                })}
            >
                <Stack direction="row" alignItems="baseline" spacing={1} sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                        component="h2"
                        sx={{
                            fontSize: 12,
                            letterSpacing: 1.5,
                            textTransform: "uppercase",
                            color: "text.secondary",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {label}
                    </Typography>
                    {subLabel && (
                        <Typography sx={{ fontSize: 12, color: "text.disabled", fontWeight: 500 }}>
                            · {subLabel}
                        </Typography>
                    )}
                </Stack>

                <Typography sx={{ fontSize: 12, color: "text.secondary", fontWeight: 500 }}>
                    {count} {count === 1 ? "avaliação" : "avaliações"}
                </Typography>
            </Stack>

            <Box>{children}</Box>
        </Box>
    );
}
