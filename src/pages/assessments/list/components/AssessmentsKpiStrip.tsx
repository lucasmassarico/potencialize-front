import { Box, Skeleton, Stack, Typography } from "@mui/material";

interface Props {
    kpis: { total: number; next7: number; thisMonth: number; subjects: number };
    filtered: boolean;
    isLoading?: boolean;
    pageScoped?: boolean;
}

interface Tile {
    label: string;
    value: number;
    hint?: string;
}

export function AssessmentsKpiStrip({ kpis, filtered, isLoading = false, pageScoped = false }: Props) {
    const tiles: Tile[] = [
        { label: "Total", value: kpis.total, hint: filtered ? "filtrado" : undefined },
        { label: "Próximos 7 dias", value: kpis.next7, hint: pageScoped ? "nesta página" : undefined },
        { label: "Este mês", value: kpis.thisMonth, hint: pageScoped ? "nesta página" : undefined },
        { label: "Disciplinas", value: kpis.subjects, hint: pageScoped ? "nesta página" : undefined },
    ];

    return (
        <Box
            sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            }}
        >
            {tiles.map((t) => (
                <Box
                    key={t.label}
                    sx={(theme) => ({
                        position: "relative",
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        bgcolor: theme.palette.background.paper,
                        px: 2,
                        py: 1.5,
                        transition: "border-color 150ms ease, box-shadow 150ms ease",
                        "&:hover": {
                            borderColor: theme.palette.primary.main,
                            boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
                        },
                    })}
                >
                    <Stack spacing={0.5}>
                        <Typography
                            component="span"
                            sx={{
                                fontSize: 11,
                                letterSpacing: 1.4,
                                textTransform: "uppercase",
                                color: "text.secondary",
                                fontWeight: 600,
                            }}
                        >
                            {t.label}
                        </Typography>

                        {isLoading ? (
                            <Skeleton variant="text" width={56} height={36} />
                        ) : (
                            <Typography component="span" sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: "text.primary" }}>
                                {t.value}
                            </Typography>
                        )}

                        {t.hint && (
                            <Typography component="span" sx={{ fontSize: 11, color: "text.secondary", fontStyle: "italic" }}>
                                {t.hint}
                            </Typography>
                        )}
                    </Stack>
                </Box>
            ))}
        </Box>
    );
}
