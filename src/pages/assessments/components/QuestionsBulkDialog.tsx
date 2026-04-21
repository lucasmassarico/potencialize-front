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
    Chip,
} from "@mui/material";
import { z } from "zod";
import { bulkCreateQuestionsByAssessment } from "../../../api/questions";
import type { QuestionCreate } from "../../../types/questions";
import type { DescriptorOut } from "../../../types/descriptors";
import { useAllDescriptors } from "../../../hooks/useDescriptors";

const rowSchema = z.object({
    text: z.string().min(1),
    skill_level: z.enum(["abaixo", "basico", "adequado", "avancado"]),
    weight: z.coerce.number().positive(),
    correct_option: z.enum(["a", "b", "c", "d", "e"]),
    descriptor_code: z.string().optional(),
});

type ParsedRow = Omit<QuestionCreate, "assessment_id" | "descriptor_id"> & {
    descriptor_code?: string;
    descriptor_id: number | null;
};

function buildCodeIndex(descriptors: DescriptorOut[] | undefined) {
    const map = new Map<string, DescriptorOut>();
    (descriptors ?? []).forEach((d) => map.set(d.code.toLowerCase(), d));
    return map;
}

function parseRows(
    raw: string,
    forceHeader: boolean,
    codeIndex: Map<string, DescriptorOut>,
) {
    const lines = raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    if (!lines.length) return { items: [] as ParsedRow[], errors: [] as string[] };

    const first = lines[0].toLowerCase();
    const autoHasHeader = ["text", "skill_level", "weight", "correct_option"].every((h) => first.includes(h));
    const hasHeader = forceHeader || autoHasHeader;

    const dataLines = hasHeader ? lines.slice(1) : lines;
    const errors: string[] = [];
    const items: ParsedRow[] = [];

    dataLines.forEach((line, i) => {
        const parts = line.split(/;|\t|,/).map((p) => p.trim());
        if (parts.length < 4) {
            errors.push(`Linha ${i + 1}: mínimo 4 campos (text;skill_level;weight;correct_option[;descriptor_code])`);
            return;
        }
        const [text, skill_level, weight, correct_option, descriptor_code] = parts;
        const parsed = rowSchema.safeParse({
            text,
            skill_level,
            weight,
            correct_option,
            descriptor_code:
                descriptor_code && descriptor_code.trim() !== "" ? descriptor_code.trim() : undefined,
        });
        if (!parsed.success) {
            const detail = parsed.error.issues
                .map((x) => `${x.path.join(".") || "campo"}: ${x.message}`)
                .join("; ");
            errors.push(`Linha ${i + 1}: ${detail}`);
            return;
        }

        let descriptor_id: number | null = null;
        if (parsed.data.descriptor_code) {
            const found = codeIndex.get(parsed.data.descriptor_code.toLowerCase());
            if (!found) {
                errors.push(
                    `Linha ${i + 1}: descritor com código "${parsed.data.descriptor_code}" não encontrado.`,
                );
                return;
            }
            descriptor_id = found.id;
        }

        items.push({
            text: parsed.data.text,
            skill_level: parsed.data.skill_level,
            weight: parsed.data.weight,
            correct_option: parsed.data.correct_option,
            descriptor_code: parsed.data.descriptor_code,
            descriptor_id,
        });
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
    const [preview, setPreview] = React.useState<ParsedRow[]>([]);
    const [parseErrors, setParseErrors] = React.useState<string[]>([]);
    const [submitting, setSubmitting] = React.useState(false);
    const [forceHeader, setForceHeader] = React.useState(true);

    const { data: allDescriptors, isLoading: loadingDescriptors } = useAllDescriptors();
    const codeIndex = React.useMemo(() => buildCodeIndex(allDescriptors), [allDescriptors]);

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
        const sample = allDescriptors?.[0]?.code ?? "EF.1a5.MAT.1.01";
        setRaw(
            `text;skill_level;weight;correct_option;descriptor_code
Quanto é 2+2?;basico;1;a;${sample}
Problema de multiplicação;adequado;1.5;c;
Questão avançada;avancado;2;e;`
        );
    };

    const handleParse = () => {
        const { items, errors } = parseRows(raw, forceHeader, codeIndex);
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
                preview.map((it) => ({
                    text: it.text,
                    skill_level: it.skill_level,
                    weight: it.weight,
                    correct_option: it.correct_option,
                    descriptor_id: it.descriptor_id,
                    assessment_id: assessmentId,
                })),
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
                        Formato aceito: <b>text;skill_level;weight;correct_option;descriptor_code(opcional)</b> — também aceita vírgula ou TAB.
                        Use o <b>código</b> do descritor (ex.: <code>EF.1a5.MAT.1.01</code>), não o ID.
                    </Typography>

                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button size="small" onClick={fillExample} disabled={loadingDescriptors}>
                            Preencher exemplo
                        </Button>
                        <FormControlLabel
                            control={<Checkbox checked={forceHeader} onChange={(e) => setForceHeader(e.target.checked)} />}
                            label="Primeira linha é cabeçalho"
                        />
                    </Stack>

                    <TextField
                        label="Colar CSV/TSV"
                        placeholder="text;skill_level;weight;correct_option;descriptor_code"
                        multiline
                        minRows={8}
                        fullWidth
                        value={raw}
                        onChange={(e) => setRaw(e.target.value)}
                    />

                    <Stack direction="row" spacing={1}>
                        <Button variant="outlined" onClick={handleParse} disabled={loadingDescriptors}>
                            Pré-visualizar
                        </Button>
                        <Button variant="contained" disabled={!preview.length || submitting} onClick={handleImport}>
                            Importar
                        </Button>
                    </Stack>

                    {loadingDescriptors && (
                        <Alert severity="info">Carregando catálogo de descritores…</Alert>
                    )}
                    {errMsg && <Alert severity="error">{errMsg}</Alert>}
                    {!!parseErrors.length && (
                        <Alert severity="warning">
                            {parseErrors.length} erro(s) de parse:
                            <ul style={{ margin: "4px 0 0 16px" }}>
                                {parseErrors.slice(0, 10).map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                                {parseErrors.length > 10 && <li>…e mais {parseErrors.length - 10}</li>}
                            </ul>
                        </Alert>
                    )}

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
                                                <TableCell>
                                                    {p.descriptor_code ? (
                                                        <Chip
                                                            size="small"
                                                            label={p.descriptor_code}
                                                            sx={{ fontFamily: "monospace", fontWeight: 700 }}
                                                        />
                                                    ) : (
                                                        "—"
                                                    )}
                                                </TableCell>
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
