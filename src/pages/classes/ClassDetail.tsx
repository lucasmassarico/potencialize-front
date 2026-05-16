// src/pages/classes/ClassDetail.tsx
import { useParams, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box, Card, CardContent, Chip } from "@mui/material";
import CalendarTodayRoundedIcon from "@mui/icons-material/CalendarTodayRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";

import { getClass, listClasses } from "../../api/classes";
import { TableSkeleton, OverviewSkeleton } from "../../components/Skeletons";
import PageGuard from "../../components/PageGuard";
import { normalizeAxiosError } from "../../lib/error";
import { EntityHeader } from "../../components/layout/EntityHeader";
import { EntitySwitcher } from "../../components/layout/EntitySwitcher";

export default function ClassDetail() {
    const { id } = useParams<{ id: string }>();
    const { pathname } = useLocation();

    const tabValue: "overview" | "assessments" | "students" = pathname.endsWith("/assessments")
        ? "assessments"
        : pathname.endsWith("/students")
        ? "students"
        : "overview";

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

    const { data: classList } = useQuery({
        queryKey: ["classes", "switcher"],
        queryFn: () => listClasses("id,name,year"),
        staleTime: 60_000,
    });

    const base = `/classes/${id}`;
    const title = data?.name ?? `Turma #${id}`;

    const switcherItems = (classList ?? []).map((c) => ({
        id: c.id,
        label: c.year ? `${c.name} · ${c.year}` : c.name,
        to: `/classes/${c.id}`,
    }));

    return (
        <Box sx={{ display: "grid", gap: 3 }}>
            <EntityHeader
                eyebrow="Turma"
                crumbs={[
                    { label: "Turmas", to: "/classes" },
                    { label: title },
                ]}
                title={title}
                isLoading={isLoading}
                switcher={
                    classList && classList.length > 1 ? (
                        <EntitySwitcher
                            label="Trocar de turma"
                            items={switcherItems}
                            currentId={Number(id)}
                            placeholder="Buscar turma…"
                            ariaLabel="Trocar de turma"
                        />
                    ) : null
                }
                meta={
                    data && (
                        <>
                            {data.year && (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    icon={<CalendarTodayRoundedIcon />}
                                    label={`Ano: ${data.year}`}
                                />
                            )}
                            {data.teacher?.name && (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    icon={<PersonOutlineRoundedIcon />}
                                    label={`Prof.: ${data.teacher.name}`}
                                />
                            )}
                            {data.students && (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    icon={<GroupsRoundedIcon />}
                                    label={`${data.students.length} aluno${data.students.length === 1 ? "" : "s"}`}
                                />
                            )}
                            {data.assessments && (
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    icon={<AssignmentOutlinedIcon />}
                                    label={`${data.assessments.length} avaliaç${data.assessments.length === 1 ? "ão" : "ões"}`}
                                />
                            )}
                        </>
                    )
                }
                tabs={[
                    { key: "overview", label: "Visão geral", to: base },
                    { key: "assessments", label: "Avaliações", to: `${base}/assessments` },
                    { key: "students", label: "Alunos", to: `${base}/students` },
                ]}
                tabValue={tabValue}
            />

            <PageGuard
                isLoading={isLoading}
                error={isError ? error : undefined}
                data={data}
                onRetry={() => refetch()}
                resourceName="Turma"
                skeleton={
                    <Card>
                        <CardContent>
                            {tabValue === "assessments" && <TableSkeleton headers={["Título", "Data", "Peso", "Ações"]} rows={5} />}
                            {tabValue === "students" && <TableSkeleton headers={["Nome", "Código", "Ações"]} rows={8} />}
                            {tabValue === "overview" && <OverviewSkeleton />}
                        </CardContent>
                    </Card>
                }
                notFoundWhen={({ data }) => !data}
            >
                <Outlet context={{ classId: Number(id), klass: data }} />
            </PageGuard>
        </Box>
    );
}
