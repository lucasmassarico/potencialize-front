import React from "react";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { parseDraftsFromText } from "../../../../lib/questionsBulk/parse";
import type { BulkRowDraft } from "../../../../lib/questionsBulk/parse";

interface Props {
    onParsed: (drafts: BulkRowDraft[]) => void;
}

const PLACEHOLDER = `Enunciado;Nível;Peso;Alternativa correta;Código do descritor
Quanto é 2 + 2?;Básico;1;A;
Multiplique 3 × 4;Adequado;1.5;C;`;

export default function QuestionsBulkPaste({ onParsed }: Props) {
    const [raw, setRaw] = React.useState("");
    const [errMsg, setErrMsg] = React.useState<string | null>(null);

    const handleParse = () => {
        setErrMsg(null);
        if (!raw.trim()) {
            setErrMsg("Cole o conteúdo CSV/TSV antes de carregar na tabela.");
            return;
        }
        const drafts = parseDraftsFromText(raw);
        if (!drafts.length) {
            setErrMsg("Não foi possível identificar nenhuma linha. Verifique se há cabeçalho e ao menos uma linha de dados.");
            return;
        }
        onParsed(drafts);
    };

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                Cole linhas no formato CSV, TSV ou colagem direta do Excel. Aceita os delimitadores
                <b> ; </b>, <b>TAB</b> ou <b>,</b>. Use os cabeçalhos amigáveis em português:
                <b> Enunciado</b>, <b>Nível</b>, <b>Peso</b>, <b>Alternativa correta</b>, <b>Código do descritor</b>.
            </Typography>

            <TextField
                label="Conteúdo colado"
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                multiline
                minRows={10}
                placeholder={PLACEHOLDER}
                slotProps={{
                    input: {
                        sx: {
                            fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            fontSize: 13,
                        },
                    },
                }}
            />

            <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={handleParse}>
                    Carregar na tabela
                </Button>
                <Button onClick={() => setRaw("")} disabled={!raw}>
                    Limpar
                </Button>
            </Stack>

            {errMsg && <Alert severity="error">{errMsg}</Alert>}
        </Stack>
    );
}
