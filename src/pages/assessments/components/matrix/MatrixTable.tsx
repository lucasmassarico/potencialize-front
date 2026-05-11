import React from "react";
import {
    Chip,
    CircularProgress,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
    Box,
} from "@mui/material";
import { alpha, type Theme } from "@mui/material/styles";

import type { AssessmentMatrixDTO, MatrixCell, MatrixQuestion, MatrixStudent, MatrixStudentResultSummary } from "../../../../types/assessments";
import type { SkillLevel } from "../../../../types/questions";
import type { AnswerOption } from "../../../../types/studentAnswers";
import { SKILL_LABEL, skillChipColor } from "../../../../lib/skillLevels";
import type { MatrixHover } from "../../hooks/useAssessmentMatrix";
import { questionNumberLabel, toAnswerIndexKey, type AnswerIndex } from "../../utils/assessmentMatrixHelpers";
import MatrixCellEditor from "./MatrixCellEditor";
import MatrixResultChip from "./MatrixResultChip";

const STUDENT_COL_WIDTH = 260;
const RESULT_COL_WIDTH = 200;
const RESULT_COL_LEFT = STUDENT_COL_WIDTH;

interface MatrixTableProps {
    data: AssessmentMatrixDTO;
    cellMap: Map<string, MatrixCell>;
    resultMap: Map<number, MatrixStudentResultSummary>;
    answerIdx: AnswerIndex;
    editMode: boolean;
    hover: MatrixHover;
    onHover: (studentId?: number, questionId?: number) => void;
    onMouseLeave: () => void;
    isPending: (key: string) => boolean;
    onAnswerChange: (studentId: number, questionId: number, next: AnswerOption | null) => Promise<void>;
}

interface MatrixQuestionHeadProps {
    question: MatrixQuestion;
    isHovered: boolean;
    onHover: (studentId?: number, questionId?: number) => void;
}

const MatrixQuestionHead = React.memo(function MatrixQuestionHead({ question, isHovered, onHover }: MatrixQuestionHeadProps) {
    const level = question.skill_level as SkillLevel;
    const handleMouseEnter = React.useCallback(() => onHover(undefined, question.id), [onHover, question.id]);

    return (
        <Tooltip
            title={
                <Box>
                    <b>{questionNumberLabel(question)}</b> — peso {question.weight}
                    {question.text_short && (
                        <>
                            <br />
                            {question.text_short}
                        </>
                    )}
                    <br />
                    Nível: {SKILL_LABEL[level]}
                    <br />
                    Correta: {question.correct_option.toUpperCase()}
                </Box>
            }
            arrow
        >
            <TableCell
                align="center"
                onMouseEnter={handleMouseEnter}
                sx={(theme) => ({
                    position: "sticky",
                    top: 0,
                    backgroundColor: isHovered ? alpha(theme.palette.primary.main, 0.12) : theme.palette.background.paper,
                    zIndex: 3,
                    whiteSpace: "nowrap",
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    transition: "background-color 120ms ease",
                })}
            >
                <Stack spacing={0.5} alignItems="center">
                    <Typography variant="caption" fontWeight={700}>
                        Q{question.display_order ?? question.id}
                    </Typography>
                    <Chip size="small" color={skillChipColor(level)} variant="filled" label={SKILL_LABEL[level]} />
                </Stack>
            </TableCell>
        </Tooltip>
    );
});

interface MatrixAnswerCellProps {
    student: MatrixStudent;
    question: MatrixQuestion;
    cell?: MatrixCell;
    currentAnswer?: AnswerOption;
    editMode: boolean;
    pending: boolean;
    isHoveredRow: boolean;
    isHoveredCol: boolean;
    onHover: (studentId?: number, questionId?: number) => void;
    onAnswerChange: (studentId: number, questionId: number, next: AnswerOption | null) => Promise<void>;
}

const MatrixAnswerCell = React.memo(function MatrixAnswerCell({
    student,
    question,
    cell,
    currentAnswer,
    editMode,
    pending,
    isHoveredRow,
    isHoveredCol,
    onHover,
    onAnswerChange,
}: MatrixAnswerCellProps) {
    const questionLabel = questionNumberLabel(question);
    const displayValue = currentAnswer ? currentAnswer.toUpperCase() : "—";
    const selectValue = currentAnswer ? currentAnswer.toUpperCase() : "-";
    const isCrosshair = isHoveredRow || isHoveredCol;
    const isFocus = isHoveredRow && isHoveredCol;

    const handleMouseEnter = React.useCallback(() => onHover(student.id, question.id), [onHover, question.id, student.id]);
    const handleAnswerChange = React.useCallback(
        (next: AnswerOption | null) => onAnswerChange(student.id, question.id, next),
        [onAnswerChange, question.id, student.id]
    );

    const sx = React.useMemo(
        () => (theme: Theme) => {
            const styles: Record<string, number | string> = {};

            if (!pending && cell?.marked_option) {
                const paletteColor = cell.is_correct ? theme.palette.success.main : theme.palette.error.main;
                styles.backgroundColor = alpha(paletteColor, 0.18);
                styles.outline = `1px solid ${alpha(paletteColor, 0.35)}`;
                styles.outlineOffset = -1;
            }

            if (isCrosshair) {
                styles.backgroundColor = alpha(theme.palette.primary.main, isFocus ? 0.22 : 0.1);
                styles.transition = "background-color 120ms ease";
            }

            return styles;
        },
        [cell?.is_correct, cell?.marked_option, isCrosshair, isFocus, pending]
    );

    return (
        <TableCell align="center" onMouseEnter={handleMouseEnter} sx={sx}>
            {pending ? (
                <CircularProgress size={16} />
            ) : editMode ? (
                <MatrixCellEditor
                    studentName={student.name}
                    questionLabel={questionLabel}
                    shown={selectValue}
                    disabled={pending}
                    onChange={handleAnswerChange}
                />
            ) : (
                <Typography variant="body2" fontWeight={700}>
                    {displayValue}
                </Typography>
            )}
        </TableCell>
    );
});

interface MatrixStudentRowProps {
    student: MatrixStudent;
    questions: MatrixQuestion[];
    result?: MatrixStudentResultSummary;
    policy: AssessmentMatrixDTO["policy"];
    cellMap: Map<string, MatrixCell>;
    answerIdx: AnswerIndex;
    editMode: boolean;
    isHoveredRow: boolean;
    hoveredQuestionId?: number;
    onHover: (studentId?: number, questionId?: number) => void;
    isPending: (key: string) => boolean;
    onAnswerChange: (studentId: number, questionId: number, next: AnswerOption | null) => Promise<void>;
}

const MatrixStudentRow = React.memo(function MatrixStudentRow({
    student,
    questions,
    result,
    policy,
    cellMap,
    answerIdx,
    editMode,
    isHoveredRow,
    hoveredQuestionId,
    onHover,
    isPending,
    onAnswerChange,
}: MatrixStudentRowProps) {
    const handleStudentHover = React.useCallback(() => onHover(student.id, undefined), [onHover, student.id]);

    return (
        <TableRow hover>
            <TableCell
                onMouseEnter={handleStudentHover}
                sx={(theme) => ({
                    position: "sticky",
                    left: 0,
                    zIndex: 2,
                    backgroundColor: isHoveredRow ? alpha(theme.palette.primary.main, 0.12) : theme.palette.background.paper,
                    whiteSpace: "nowrap",
                    width: STUDENT_COL_WIDTH,
                    minWidth: STUDENT_COL_WIDTH,
                    maxWidth: STUDENT_COL_WIDTH,
                    transition: "background-color 120ms ease",
                })}
                title={student.name}
            >
                <Typography noWrap>{student.name}</Typography>
            </TableCell>

            <TableCell
                onMouseEnter={handleStudentHover}
                sx={(theme) => ({
                    position: "sticky",
                    left: RESULT_COL_LEFT,
                    zIndex: 2,
                    backgroundColor: isHoveredRow ? alpha(theme.palette.primary.main, 0.12) : theme.palette.background.paper,
                    whiteSpace: "nowrap",
                    width: RESULT_COL_WIDTH,
                    minWidth: RESULT_COL_WIDTH,
                    maxWidth: RESULT_COL_WIDTH,
                    transition: "background-color 120ms ease",
                })}
            >
                <MatrixResultChip result={result} policy={policy} />
            </TableCell>

            {questions.map((question) => {
                const key = toAnswerIndexKey(student.id, question.id);
                const cell = cellMap.get(key);
                const currentAnswer = editMode ? answerIdx.get(key)?.marked : cell?.marked_option;

                return (
                    <MatrixAnswerCell
                        key={key}
                        student={student}
                        question={question}
                        cell={cell}
                        currentAnswer={currentAnswer}
                        editMode={editMode}
                        pending={isPending(key)}
                        isHoveredRow={isHoveredRow}
                        isHoveredCol={hoveredQuestionId === question.id}
                        onHover={onHover}
                        onAnswerChange={onAnswerChange}
                    />
                );
            })}
        </TableRow>
    );
});

export default function MatrixTable({
    data,
    cellMap,
    resultMap,
    answerIdx,
    editMode,
    hover,
    onHover,
    onMouseLeave,
    isPending,
    onAnswerChange,
}: MatrixTableProps) {
    return (
        <TableContainer
            onMouseLeave={onMouseLeave}
            sx={{
                maxWidth: "100%",
                maxHeight: "calc(100vh - 280px)",
                minHeight: 400,
                overflow: "auto",
                borderRadius: 1,
                border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
        >
            <Table size="small" stickyHeader aria-label="Matriz de Avaliação">
                <TableHead>
                    <TableRow>
                        <TableCell
                            sx={{
                                position: "sticky",
                                left: 0,
                                zIndex: 4,
                                top: 0,
                                width: STUDENT_COL_WIDTH,
                                minWidth: STUDENT_COL_WIDTH,
                                maxWidth: STUDENT_COL_WIDTH,
                                backgroundColor: "background.paper",
                                whiteSpace: "nowrap",
                                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                            }}
                        >
                            Alunos ({data.pagination.total_students})
                        </TableCell>
                        <TableCell
                            sx={{
                                top: 0,
                                position: "sticky",
                                left: RESULT_COL_LEFT,
                                zIndex: 4,
                                width: RESULT_COL_WIDTH,
                                minWidth: RESULT_COL_WIDTH,
                                maxWidth: RESULT_COL_WIDTH,
                                backgroundColor: "background.paper",
                                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                            }}
                        >
                            Resultado
                        </TableCell>

                        {data.questions.map((question) => (
                            <MatrixQuestionHead key={question.id} question={question} isHovered={hover.questionId === question.id} onHover={onHover} />
                        ))}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.students.map((student) => (
                        <MatrixStudentRow
                            key={student.id}
                            student={student}
                            questions={data.questions}
                            result={resultMap.get(student.id)}
                            policy={data.policy}
                            cellMap={cellMap}
                            answerIdx={answerIdx}
                            editMode={editMode}
                            isHoveredRow={hover.studentId === student.id}
                            hoveredQuestionId={hover.questionId}
                            onHover={onHover}
                            isPending={isPending}
                            onAnswerChange={onAnswerChange}
                        />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
