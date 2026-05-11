import EditIcon from "@mui/icons-material/Edit";
import UploadIcon from "@mui/icons-material/Upload";
import {
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    Tooltip,
    Typography,
} from "@mui/material";

interface MatrixToolbarProps {
    perPage: number;
    editMode: boolean;
    onPerPageChange: (value: number) => void;
    onEditModeChange: (value: boolean) => void;
    onOpenGrade: () => void;
    onOpenBulk: () => void;
}

const PER_PAGE_OPTIONS = [20, 50, 100, 200];

export default function MatrixToolbar({
    perPage,
    editMode,
    onPerPageChange,
    onEditModeChange,
    onOpenGrade,
    onOpenBulk,
}: MatrixToolbarProps) {
    return (
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="center">
            <Typography variant="h6" sx={{ flex: 1 }}>
                Matriz de Desempenho
            </Typography>

            <FormControl size="small" sx={{ width: 160 }}>
                <InputLabel id="assessment-matrix-per-page">Alunos por Página</InputLabel>
                <Select
                    labelId="assessment-matrix-per-page"
                    label="Alunos por Página"
                    value={perPage}
                    onChange={(event) => onPerPageChange(Number(event.target.value))}
                >
                    {PER_PAGE_OPTIONS.map((value) => (
                        <MenuItem key={value} value={value}>
                            {value}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            <FormControlLabel control={<Switch checked={editMode} onChange={(_, value) => onEditModeChange(value)} />} label="Editar respostas" />

            <Tooltip title="Gabarito por aluno">
                <IconButton aria-label="Abrir gabarito por aluno" onClick={onOpenGrade}>
                    <EditIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Importar respostas (CSV/TSV)">
                <IconButton aria-label="Importar respostas por CSV ou TSV" onClick={onOpenBulk}>
                    <UploadIcon />
                </IconButton>
            </Tooltip>
        </Stack>
    );
}
