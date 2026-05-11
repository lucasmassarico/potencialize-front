import { Box, Chip, Tooltip } from "@mui/material";

import type { MatrixPolicyEcho, MatrixStudentResultSummary } from "../../../../types/assessments";

const predictedChipColor = (key?: string): "error" | "warning" | "info" | "success" | "default" => {
    switch ((key || "").toUpperCase()) {
        case "ABAIXO_BASICO":
            return "error";
        case "BASICO":
            return "warning";
        case "ADEQUADO":
            return "info";
        case "AVANCADO":
            return "success";
        default:
            return "default";
    }
};

interface MatrixResultChipProps {
    result?: MatrixStudentResultSummary;
    policy?: MatrixPolicyEcho;
}

export default function MatrixResultChip({ result, policy }: MatrixResultChipProps) {
    if (!result) return <Chip size="small" label="—" />;

    const { predicted_level: predictedLevel, score } = result;
    const chipLabel = `${predictedLevel.label} • ${Math.round(score.percent)}%`;

    return (
        <Tooltip
            arrow
            title={
                <Box>
                    <b>{predictedLevel.label}</b> — {score.percent.toFixed(1)}%
                    <br />
                    Base: {score.basis === "by_points" ? "Por pontos" : "Por acurácia"}
                    {score.totals && (
                        <>
                            <br />
                            Respondidas/Corretas: {score.totals.answered}/{score.totals.correct}
                            <br />
                            Questões: {score.totals.questions}
                            {score.basis === "by_points" && (
                                <>
                                    <br />
                                    Pontos: {score.totals.points_correct} / {score.totals.points_total}
                                </>
                            )}
                        </>
                    )}
                    {policy && (
                        <>
                            <br />
                            Classificação: Básico ≥ {policy.basic_min}% · Adequado ≥ {policy.adequate_min}% · Avançado ≥{" "}
                            {policy.advanced_min}%
                            <br />
                            Branco conta? {policy.count_blank_as_wrong ? "Sim" : "Não"}
                        </>
                    )}
                </Box>
            }
        >
            <Chip size="small" variant="filled" color={predictedChipColor(predictedLevel.key)} label={chipLabel} />
        </Tooltip>
    );
}
