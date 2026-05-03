import React from "react";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { parseDraftsFromWorkbook, readFileAsArrayBuffer } from "../../../../lib/questionsBulk/parse";
import type { BulkRowDraft, WeightMode } from "../../../../lib/questionsBulk/parse";
import { downloadTemplate } from "../../../../lib/questionsBulk/template";
import type { DescriptorOut } from "../../../../types/descriptors";

interface Props {
    weightMode: WeightMode;
    descriptors: DescriptorOut[] | undefined;
    onParsed: (drafts: BulkRowDraft[]) => void;
}

export default function QuestionsBulkUpload({ weightMode, descriptors, onParsed }: Props) {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [errMsg, setErrMsg] = React.useState<string | null>(null);
    const [busy, setBusy] = React.useState(false);
    const [lastFileName, setLastFileName] = React.useState<string | null>(null);

    const handleFile = React.useCallback(
        async (file: File) => {
            setErrMsg(null);
            setBusy(true);
            try {
                const buf = await readFileAsArrayBuffer(file);
                const drafts = await parseDraftsFromWorkbook(buf);
                if (!drafts.length) {
                    setErrMsg("Não foi possível ler nenhuma linha do arquivo. Verifique se a planilha tem cabeçalhos e ao menos uma linha de dados.");
                    return;
                }
                setLastFileName(file.name);
                onParsed(drafts);
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : "Falha ao ler o arquivo.";
                setErrMsg(msg);
            } finally {
                setBusy(false);
            }
        },
        [onParsed],
    );

    const handleDrop = React.useCallback(
        (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
        },
        [handleFile],
    );

    return (
        <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
                Baixe o modelo, preencha sua planilha e arraste o arquivo aqui — ou clique para selecionar.
                Aceita arquivos <b>.xlsx</b>, <b>.xls</b> e <b>.csv</b>.
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap">
                <Button
                    startIcon={<DownloadIcon />}
                    variant="outlined"
                    onClick={() => {
                        downloadTemplate(descriptors, weightMode).catch((e: unknown) => {
                            const msg = e instanceof Error ? e.message : "Falha ao gerar modelo.";
                            setErrMsg(msg);
                        });
                    }}
                >
                    Baixar modelo (.xlsx)
                </Button>
                <Button
                    startIcon={<UploadFileIcon />}
                    variant="contained"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy}
                >
                    Selecionar arquivo
                </Button>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    style={{ display: "none" }}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFile(file);
                        e.target.value = "";
                    }}
                />
            </Stack>

            <Box
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        inputRef.current?.click();
                    }
                }}
                sx={(t) => ({
                    border: `2px dashed ${isDragging ? t.palette.primary.main : t.palette.divider}`,
                    backgroundColor: isDragging ? t.palette.action.hover : "transparent",
                    borderRadius: 2,
                    p: 4,
                    textAlign: "center",
                    cursor: "pointer",
                    transition: "border-color .15s ease, background-color .15s ease",
                    "&:hover": {
                        borderColor: t.palette.primary.main,
                        backgroundColor: t.palette.action.hover,
                    },
                })}
            >
                <UploadFileIcon sx={{ fontSize: 40, mb: 1, opacity: 0.6 }} />
                <Typography variant="body1" fontWeight={600}>
                    {isDragging ? "Solte o arquivo aqui" : "Arraste e solte o arquivo aqui"}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    ou clique para selecionar (.xlsx, .xls, .csv)
                </Typography>
            </Box>

            {lastFileName && (
                <Typography variant="caption" color="text.secondary">
                    Último arquivo carregado: <b>{lastFileName}</b>
                </Typography>
            )}
            {errMsg && <Alert severity="error">{errMsg}</Alert>}
        </Stack>
    );
}
