// src/pages/classes/components/StudentsBulkDialog.tsx
import React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, Alert, FormControlLabel, Checkbox, Typography } from "@mui/material";
import { bulkCreateStudents } from "../../../api/students";

interface Props {
    open: boolean;
    classId: number;
    onClose: (imported: boolean) => void;
}

type Row = { name: string; register_code?: string };

export default function StudentsBulkDialog({ open, classId, onClose }: Props) {
    const [text, setText] = React.useState("");
    const [hasHeader, setHasHeader] = React.useState(true);
    const [err, setErr] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);

    const parse = React.useCallback((): Row[] => {
        const lines = text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
        const rows: Row[] = [];
        const start = hasHeader ? 1 : 0;

        for (let i = start; i < lines.length; i++) {
            const line = lines[i];
            const parts = line.split(/[\t;,]/).map((p) => p.trim());
            const name = parts[0] || "";
            const register_code = parts[1] || undefined;
            if (name) rows.push({ name, register_code });
        }
        return rows;
    }, [text, hasHeader]);

    const parsed = parse();
    const canImport = parsed.length > 0 && parsed.length <= 2000;

    const handleImport = async () => {
        setErr(null);
        try {
            if (!canImport) {
                setErr(parsed.length > 2000 ? "Máximo de 2000 alunos por importação." : "Nenhuma linha válida encontrada.");
                return;
            }
            setSubmitting(true);
            await bulkCreateStudents({ class_id: classId, items: parsed });
            onClose(true);
        } catch (e: any) {
            const msg = e?.response?.data?.message || "Falha na importação.";
            setErr(msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={() => onClose(false)} maxWidth="md" fullWidth>
            <DialogTitle>Importar alunos (lote)</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                        Cole linhas no formato: <b>nome;codigo</b> &nbsp;ou&nbsp; <b>nome,codigo</b> &nbsp;ou&nbsp; <b>nome[TAB]codigo</b>.
                        <br />
                        Exemplo:
                        <pre style={{ margin: 0 }}>
                            {`nome,register_code
Ana Souza,101
Bruno Lima,102
Carla Mendes,`}
                        </pre>
                    </Typography>

                    <FormControlLabel
                        control={<Checkbox checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />}
                        label="Primeira linha é cabeçalho"
                    />

                    <TextField
                        label="Dados (cole aqui)"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        multiline
                        minRows={10}
                        placeholder={"nome,register_code\nAna Souza,101\nBruno Lima,102"}
                        InputProps={{ sx: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" } }}
                    />

                    <Typography variant="body2" sx={{ opacity: 0.75 }}>
                        {parsed.length === 0 ? "Nenhuma linha válida detectada." : `${parsed.length} aluno(s) prontos para importação.`}
                    </Typography>

                    {err && <Alert severity="error">{err}</Alert>}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => onClose(false)}>Cancelar</Button>
                <Button variant="contained" disabled={submitting || !canImport} onClick={handleImport}>
                    Importar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
