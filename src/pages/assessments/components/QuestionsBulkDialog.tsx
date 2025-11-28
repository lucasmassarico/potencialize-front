// src/pages/assessments/components/QuestionsBulkDialog.tsx
import React from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Stack,
    TextField,
    Alert,
    Typography,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Checkbox,
    FormControlLabel,
    TableContainer,
    Paper,
} from "@mui/material";
import { z } from "zod";
import { bulkCreateQuestionsByAssessment } from "../../../api/questions";
import type { QuestionCreate } from "../../../types/questions";

const rowSchema = z.object({
    text: z.string().min(1),
    skill_level: z.enum(["abaixo", "basico", "adequado", "avancado"]),
    weight: z.coerce.number().positive(),
    correct_option: z.enum(["a", "b", "c", "d", "e"]),
    descriptor_id: z
        .union([z.coerce.number().int().positive(), z.nan()])
        .optional()
        .transform((v) => (Number.isNaN(v) ? undefined : v)),
});

function parseRows(raw: string, forceHeader: boolean) {
    const lines = raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    if (!lines.length) return { items: [], errors: [] as string[] };

    const first = lines[0].toLowerCase();
    const autoHasHeader = ["text", "skill_level", "weight", "correct_option"].every((h) => first.includes(h));
    const hasHeader = forceHeader || autoHasHeader;

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const errors: string[] = [];
    const items: Omit<QuestionCreate, "assessment_id">[] = [];

    dataLines.forEach((line, i) => {
        const parts = line.split(/;|\t|,/).map((p) => p.trim());
        if (parts.length < 4) {
            errors.push(`Linha ${i + 1}: mínimo 4 campos (text;skill_level;weight;correct_option[;descriptor_id])`);
            return;
        }
        const [text, skill_level, weight, correct_option, descriptor_id] = parts;
        const parsed = rowSchema.safeParse({
            text,
            skill_level,
            weight,
            correct_option,
            descriptor_id: descriptor_id ?? undefined,
        });
        if (!parsed.success) {
            errors.push(`Linha ${i + 1}: ${parsed.error.issues.map((x) => x.message).join(", ")}`);
            return;
        }
        items.push(parsed.data as Omit<QuestionCreate, "assessment_id">);
    });

    return { items, errors };
}

interface Props {
    open: boolean;
    assessmentId: number;
    onClose: (imported: boolean) => void;
}

export default function QuestionsBulkDialog({ open, assessmentId, onClose }: Props) {
    const [raw, setRaw] = React.useState("");
    const [errMsg, setErrMsg] = React.useState<string | null>(null);
    const [preview, setPreview] = React.useState<Omit<QuestionCreate, "assessment_id">[]>([]);
    const [parseErrors, setParseErrors] = React.useState<string[]>([]);
    const [submitting, setSubmitting] = React.useState(false);
    const [forceHeader, setForceHeader] = React.useState(true);

    React.useEffect(() => {
        if (!open) {
            setRaw("");
            setPreview([]);
            setParseErrors([]);
            setErrMsg(null);
            setForceHeader(true);
        }
    }, [open]);

    const fillExample = () => {
        setRaw(
            `text;skill_level;weight;correct_option;descriptor_id
Quanto é 2+2?;basico;1;a;
Problema de multiplicação;adequado;1.5;c;12
Questão avançada;avancado;2;e;`
        );
    };

    const handleParse = () => {
        const { items, errors } = parseRows(raw, forceHeader);
        setPreview(items);
        setParseErrors(errors);
    };

    const handleImport = async () => {
        setErrMsg(null);
        if (!preview.length) {
            setErrMsg("Nada para importar. Faça a pré-visualização primeiro.");
            return;
        }
        setSubmitting(true);
        try {
            await bulkCreateQuestionsByAssessment(
                assessmentId,
                preview.map((it) => ({ ...it, assessment_id: assessmentId }))
            );
            onClose(true);
        } catch (e: any) {
            const msg = e?.response?.data?.message || "Erro na importação.";
            setErrMsg(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="lg" fullWidth>
            <DialogTitle>Importar questões em lote</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Formato aceito: <b>text;skill_level;weight;correct_option;descriptor_id(opcional)</b> — também aceita vírgula ou TAB.
                    </Typography>

                    <Stack direction="row" spacing={1}>
                        <Button size="small" onClick={fillExample}>
                            Preencher exemplo
                        </Button>
                        <FormControlLabel
                            control={<Checkbox checked={forceHeader} onChange={(e) => setForceHeader(e.target.checked)} />}
                            label="Primeira linha é cabeçalho"
                        />
                    </Stack>

                    <TextField
                        label="Colar CSV/TSV"
                        placeholder="text;skill_level;weight;correct_option;descriptor_id"
                        multiline
                        minRows={8}
                        fullWidth
                        value={raw}
                        onChange={(e) => setRaw(e.target.value)}
                    />

                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" onClick={handleParse}>
                            Pré-visualizar
                        </Button>
                        <Button variant="contained" disabled={!preview.length || submitting} onClick={handleImport}>
                            Importar
                        </Button>
                    </Stack>

                    {errMsg && <Alert severity="error">{errMsg}</Alert>}
                    {!!parseErrors.length && <Alert severity="warning">{parseErrors.length} erro(s) de parse. Corrija as linhas indicadas.</Alert>}

                    {!!preview.length && (
                        <>
                            <Typography variant="subtitle2">Pré-visualização ({preview.length})</Typography>
                            <TableContainer component={Paper} sx={{ maxHeight: 340 }}>
                                <Table size="small" stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Texto</TableCell>
                                            <TableCell>Nível</TableCell>
                                            <TableCell>Peso</TableCell>
                                            <TableCell>Correta</TableCell>
                                            <TableCell>Descritor</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {preview.map((p, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell title={p.text}>
                                                    <Typography noWrap>{p.text}</Typography>
                                                </TableCell>
                                                <TableCell>{p.skill_level}</TableCell>
                                                <TableCell>{p.weight}</TableCell>
                                                <TableCell>{p.correct_option.toUpperCase()}</TableCell>
                                                <TableCell>{p.descriptor_id ?? "—"}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)}>Fechar</Button>
                <Button variant="contained" disabled={!preview.length || submitting} onClick={handleImport}>
                    Importar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
