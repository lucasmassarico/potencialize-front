// src/pages/classes/ClassDetail.tsx
import { useParams, Outlet, useLocation, Link as RouterLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Typography, Stack, Card, CardContent, Breadcrumbs, Link, Skeleton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { getClass } from "../../api/classes";
import ClassSubnav from "./components/ClassSubnav";
import { TableSkeleton, OverviewSkeleton } from "../../components/Skeletons";
import PageGuard from "../../components/PageGuard";
import { normalizeAxiosError } from "../../lib/error";

export default function ClassDetail() {
    const { id } = useParams<{ id: string }>();
    const { pathname } = useLocation();

    const current = pathname.endsWith("/assessments") ? "assessments" : pathname.endsWith("/students") ? "students" : "overview";

    const { data, isLoading, isError, error, refetch } = useQuery({
        queryKey: ["class", id],
        queryFn: () => getClass(Number(id), "id,name,year,teacher{id,name},students{id,name},assessments{id,title}"),
        enabled: !!id,
        staleTime: 30_000,
        retry: (failCount, err) => {
            const { status } = normalizeAxiosError(err);
            return status !== 404 && failCount < 2;
        },
    });

    const titleText = data?.name ? `${data.name} #${id}` : `Turma #${id}`;

    return (
        <Box sx={{ display: "grid", gap: 2 }}>
            {/* Header com skeleton e botão Voltar fixo para /classes */}
            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    {isLoading ? (
                        <>
                            <Skeleton variant="text" width={260} height={32} />
                            <Skeleton variant="text" width={220} />
                        </>
                    ) : (
                        <>
                            <Typography variant="h5" fontWeight={700} noWrap>
                                {titleText}
                            </Typography>
                            {data && (
                                <Typography variant="body2" sx={{ opacity: 0.8 }} noWrap>
                                    Ano: <b>{data.year}</b> · Professor(a): <b>{data.teacher?.name ?? "—"}</b>
                                </Typography>
                            )}
                        </>
                    )}
                </Box>

                {/* Voltar para a listagem de turmas (sem usar history) */}
                <Button component={RouterLink} to="/classes" startIcon={<ArrowBackIcon />} variant="text">
                    Turmas
                </Button>
            </Stack>

            {/* Breadcrumbs (reforça contexto e também leva a /classes) */}
            <Breadcrumbs aria-label="breadcrumb" sx={{ fontSize: 13 }}>
                <Link component={RouterLink} color="inherit" to="/classes">
                    Turmas
                </Link>
                <Typography color="text.primary">{data?.name ?? `#${id}`}</Typography>
            </Breadcrumbs>

            {/* Subnav (se quiser “grudar”, basta envolver com position: sticky; bg e zIndex) */}
            <Box
                sx={{
                    borderBottom: 1,
                    borderColor: "divider",
                    // Para "grudar" abaixo do AppBar:
                    // position: "sticky",
                    // top: 0,
                    // zIndex: (t) => t.zIndex.appBar,
                    // bgcolor: "background.paper",
                }}
            >
                <ClassSubnav />
            </Box>

            {/* Conteúdo com guard + skeleton por aba */}
            <PageGuard
                isLoading={isLoading}
                error={isError ? error : undefined}
                data={data}
                onRetry={() => refetch()}
                resourceName="Turma"
                skeleton={
                    <Card>
                        <CardContent>
                            {current === "assessments" && <TableSkeleton headers={["Título", "Data", "Peso", "Ações"]} rows={5} />}
                            {current === "students" && <TableSkeleton headers={["Nome", "Código", "Ações"]} rows={8} />}
                            {current === "overview" && <OverviewSkeleton />}
                        </CardContent>
                    </Card>
                }
                // Se por regra de negócio "data" vier vazio, considera NotFound:
                notFoundWhen={({ data }) => !data}
            >
                <Outlet context={{ classId: Number(id), klass: data }} />
            </PageGuard>
        </Box>
    );
}
