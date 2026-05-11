import React from "react";
import { useParams } from "react-router-dom";
import { Alert, Card, CardContent, Pagination, Skeleton, Snackbar, Stack } from "@mui/material";

import AnswersBulkDialog from "../components/AnswersBulkDialog";
import MatrixLegend from "../components/matrix/MatrixLegend";
import MatrixTable from "../components/matrix/MatrixTable";
import MatrixToolbar from "../components/matrix/MatrixToolbar";
import StudentGradeDialog from "../components/StudentGradeDialog";
import { useAssessmentMatrix } from "../hooks/useAssessmentMatrix";

export default function AssessmentMatrix() {
    const { assessmentId } = useParams<{ assessmentId: string }>();
    const [gradeOpen, setGradeOpen] = React.useState(false);
    const [bulkOpen, setBulkOpen] = React.useState(false);

    const matrix = useAssessmentMatrix(assessmentId);
    const {
        assessmentIdNumber,
        data,
        isLoading,
        isError,
        perPage,
        setPage,
        setPerPage,
        editMode,
        setEditMode,
        answerIdx,
        cellMap,
        resultMap,
        hover,
        setHoverIfChanged,
        clearHover,
        isPending,
        upsertAnswer,
        invalidateMatrix,
        snack,
        closeSnack,
        clearSnack,
    } = matrix;

    const handlePerPageChange = React.useCallback(
        (value: number) => {
            setPage(1);
            setPerPage(value);
        },
        [setPage, setPerPage]
    );

    const handleGradeClose = React.useCallback(
        (changed: boolean) => {
            setGradeOpen(false);
            if (changed) void invalidateMatrix();
        },
        [invalidateMatrix]
    );

    const handleBulkClose = React.useCallback(
        (changed: boolean) => {
            setBulkOpen(false);
            if (changed) void invalidateMatrix();
        },
        [invalidateMatrix]
    );

    return (
        <Card>
            <CardContent sx={{ display: "grid", gap: 2 }}>
                <MatrixToolbar
                    perPage={perPage}
                    editMode={editMode}
                    onPerPageChange={handlePerPageChange}
                    onEditModeChange={setEditMode}
                    onOpenGrade={() => setGradeOpen(true)}
                    onOpenBulk={() => setBulkOpen(true)}
                />

                {isLoading && <Skeleton variant="text" width="100%" />}
                {isError && <Alert severity="error">Erro ao carregar a matriz.</Alert>}

                {data && (
                    <>
                        <MatrixTable
                            data={data}
                            cellMap={cellMap}
                            resultMap={resultMap}
                            answerIdx={answerIdx}
                            editMode={editMode}
                            hover={hover}
                            onHover={setHoverIfChanged}
                            onMouseLeave={clearHover}
                            isPending={isPending}
                            onAnswerChange={upsertAnswer}
                        />

                        <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
                            <Pagination page={data.pagination.page} count={data.pagination.total_pages} onChange={(_, value) => setPage(value)} />
                        </Stack>

                        <MatrixLegend />

                        <StudentGradeDialog
                            open={gradeOpen}
                            assessment={data.assessment}
                            questions={data.questions}
                            students={data.students}
                            onClose={handleGradeClose}
                        />
                        <AnswersBulkDialog
                            open={bulkOpen}
                            assessmentId={assessmentIdNumber}
                            students={data.students}
                            questions={data.questions}
                            onClose={handleBulkClose}
                        />
                    </>
                )}
            </CardContent>

            {snack && (
                <Snackbar open={snack.open} autoHideDuration={5000} onClose={closeSnack}>
                    <Alert onClose={clearSnack} severity={snack.severity} variant="filled">
                        {snack.message}
                    </Alert>
                </Snackbar>
            )}
        </Card>
    );
}
