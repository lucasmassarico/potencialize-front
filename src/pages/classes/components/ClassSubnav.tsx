import { Tabs, Tab, Box } from "@mui/material";
import { Link, useLocation, useParams } from "react-router-dom";

type ClassSubnavValue = "overview" | "assessments" | "students";

interface Props {
    /** Opcional: quando você está fora de /classes/:id (ex.: /assessments/:assessmentId) */
    classId?: number | string;
    /** Opcional: força qual aba aparece selecionada */
    value?: ClassSubnavValue;
}

export default function ClassSubnav({ classId, value: forcedValue }: Props) {
    const { pathname } = useLocation();
    const { id: idParam } = useParams<{ id: string }>();

    const id = classId ?? idParam;
    const base = `/classes/${id}`;

    // Se estamos dentro de /classes/:id/*, calculamos pelo pathname;
    // caso contrário, usamos forcedValue (ex.: vindo de /assessments/:assessmentId).
    const computedValue: ClassSubnavValue = pathname.startsWith(base)
        ? pathname.endsWith("/assessments")
            ? "assessments"
            : pathname.endsWith("/students")
            ? "students"
            : "overview"
        : forcedValue ?? "overview";

    return (
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={computedValue} variant="scrollable" allowScrollButtonsMobile>
                <Tab value="overview" label="Visão geral" component={Link} to={base} />
                <Tab value="assessments" label="Avaliações" component={Link} to={`${base}/assessments`} />
                <Tab value="students" label="Alunos" component={Link} to={`${base}/students`} />
            </Tabs>
        </Box>
    );
}
