// src/components/Skeletons.tsx
import { Box, Card, CardContent, Grid, Skeleton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

export function TableSkeleton({ headers, rows = 5 }: { headers: string[]; rows?: number }) {
    return (
        <Table size="small" aria-label="Carregando tabela">
            <TableHead>
                <TableRow>
                    {headers.map((h, i) => (
                        <TableCell key={i}>
                            <Typography variant="body2" sx={{ opacity: 0.75 }}>
                                {h}
                            </Typography>
                        </TableCell>
                    ))}
                </TableRow>
            </TableHead>
            <TableBody>
                {Array.from({ length: rows }).map((_, i) => (
                    <TableRow key={i}>
                        {headers.map((_, j) => (
                            <TableCell key={j}>
                                <Skeleton width={j === 0 ? "60%" : 80} />
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

export function OverviewSkeleton() {
    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            {/* Card de informações da turma */}
            <Card>
                <CardContent>
                    <Stack spacing={1.2}>
                        <Skeleton width={160} height={28} />
                        <Skeleton width="40%" />
                        <Skeleton width="30%" />
                        <Skeleton width="45%" />
                    </Stack>
                </CardContent>
            </Card>

            {/* Dois cards de acesso rápido (Avaliações / Alunos) */}
            <Grid container spacing={2}>
                {[0, 1].map((i) => (
                    <Grid key={i} size={{ xs: 12, sm: 6 }}>
                        <Card>
                            <CardContent>
                                <Stack spacing={1.2}>
                                    <Skeleton width={140} height={26} />
                                    <Skeleton width="70%" />
                                    <Skeleton width={180} height={36} />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}
