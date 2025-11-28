import { Tabs, Tab, Box } from "@mui/material";
import { Link, useLocation, useParams } from "react-router-dom";

export default function ClassSubnav() {
    const { pathname } = useLocation();
    const { id } = useParams<{ id: string }>();

    const base = `/classes/${id}`;
    const value = pathname.endsWith("/assessments")
        ? "assessments"
        : pathname.endsWith("/students")
        ? "students"
        : "overview";

    return (
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={value}>
                <Tab
                    value="overview"
                    label="Visão geral"
                    component={Link}
                    to={base}
                />
                <Tab
                    value="assessments"
                    label="Avaliações"
                    component={Link}
                    to={`${base}/assessments`}
                />
                <Tab
                    value="students"
                    label="Alunos"
                    component={Link}
                    to={`${base}/students`}
                />
            </Tabs>
        </Box>
    );
}
