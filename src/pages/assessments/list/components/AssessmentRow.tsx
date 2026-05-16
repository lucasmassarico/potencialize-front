import { Box, Divider, Stack, Typography } from "@mui/material";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { useNavigate } from "react-router-dom";
import dayjs from "../../../../lib/dayjs";
import type { AssessmentOut } from "../../../../types/assessments";
import { subjectLabel, weightLabel } from "../../utils/assessmentLabels";
import { AssessmentRowMenu } from "./AssessmentRowMenu";

interface Props {
    assessment: AssessmentOut;
    className?: string;
    showClass?: boolean;
    isLast?: boolean;
    onEdit: () => void;
    onDelete: () => void;
}

export function AssessmentRow({ assessment, className, showClass, isLast, onEdit, onDelete }: Props) {
    const nav = useNavigate();
    const open = () => nav(`/classes/${assessment.class_id}/assessments/${assessment.id}`);
    const dateLabel = dayjs(assessment.date).isValid() ? dayjs(assessment.date).format("DD/MM/YYYY") : "—";
    const subject = subjectLabel(assessment.subject_kind, assessment.subject_other);
    const weight = weightLabel(assessment.weight_mode);

    const metaParts: string[] = [];
    if (showClass && className) metaParts.push(className);
    metaParts.push(subject);
    metaParts.push(dateLabel);
    metaParts.push(weight);

    return (
        <>
            <Box
                role="button"
                tabIndex={0}
                onClick={open}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        open();
                    }
                }}
                aria-label={`Abrir avaliação ${assessment.title}`}
                sx={(theme) => ({
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2.5,
                    py: 1.5,
                    cursor: "pointer",
                    transition: "background 120ms ease",
                    "&:hover": { bgcolor: theme.palette.action.hover },
                    "&:focus-visible": {
                        outline: `2px solid ${theme.palette.primary.main}`,
                        outlineOffset: -2,
                    },
                    "&:hover .row-chev": { transform: "translateX(2px)", opacity: 1 },
                })}
            >
                <Stack spacing={0.25} sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                        sx={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: "text.primary",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                        title={assessment.title}
                    >
                        {assessment.title}
                    </Typography>
                    <Typography
                        sx={{
                            fontSize: 13,
                            color: "text.secondary",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {metaParts.join(" · ")}
                    </Typography>
                </Stack>

                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
                    <AssessmentRowMenu onEdit={onEdit} onDelete={onDelete} />
                    <ChevronRightRoundedIcon
                        className="row-chev"
                        sx={{
                            color: "text.disabled",
                            opacity: 0.6,
                            transition: "transform 150ms ease, opacity 150ms ease",
                        }}
                    />
                </Stack>
            </Box>
            {!isLast && <Divider />}
        </>
    );
}
