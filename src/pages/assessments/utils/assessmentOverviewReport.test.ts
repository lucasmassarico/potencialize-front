import { describe, expect, it } from "vitest";

import type { AssessmentOverviewDTO, MatrixStudent, MatrixStudentResultSummary } from "../../../types/assessments";
import { createAssessmentOverviewPdf } from "./assessmentOverviewPdf";
import { buildAssessmentOverviewReport, formatDistribution } from "./assessmentOverviewReport";

const baseOverview: AssessmentOverviewDTO = {
    assessment: {
        id: 42,
        class_id: 7,
        title: "Prova Diagnóstica - 6º Ano",
        date: "2026-05-10",
        subject_kind: "matematica",
        subject_other: null,
    },
    population: {
        students_in_class: 30,
        students_answered_any: 24,
        participation_rate: 0.8,
    },
    overall: {
        total_questions: 2,
        total_answers: 48,
        correct: 30,
        accuracy: 0.625,
    },
    by_skill: [
        {
            skill_level: "adequado",
            questions: 1,
            answers: 24,
            correct: 18,
            accuracy: 0.75,
            students_answered: 24,
        },
        {
            skill_level: "abaixo",
            questions: 1,
            answers: 24,
            correct: 12,
            accuracy: 0.5,
            students_answered: 24,
        },
    ],
    by_question: [
        {
            question_id: 102,
            display_order: 2,
            text_short: "Calcule a area do retangulo.",
            display_label: "Q2",
            skill_level: "adequado",
            descriptor_id: 10,
            descriptor_code: "D10",
            descriptor_title: "Grandezas e medidas",
            weight: 1,
            correct_option: "c",
            answers: 24,
            correct: 18,
            accuracy: 0.75,
            option_distribution: { a: 1, b: 2, c: 18, d: 2, e: 0, blank: 7 },
        },
        {
            question_id: 101,
            display_order: 1,
            text_short: "Resolva a expressao numerica.",
            display_label: "Q1",
            skill_level: "abaixo",
            descriptor_id: null,
            descriptor_code: null,
            descriptor_title: null,
            weight: 1,
            correct_option: "a",
            answers: 24,
            correct: 12,
            accuracy: 0.5,
            option_distribution: { a: 12, b: 6, c: 3, d: 2, e: 1, blank: 6 },
        },
    ],
    hardest: [
        {
            question_id: 101,
            display_order: 1,
            text_short: "Resolva a expressao numerica.",
            display_label: "Q1",
            skill_level: "abaixo",
            descriptor_code: null,
            accuracy: 0.5,
            answers: 24,
        },
    ],
    easiest: [
        {
            question_id: 102,
            display_order: 2,
            text_short: "Calcule a area do retangulo.",
            display_label: "Q2",
            skill_level: "adequado",
            descriptor_code: "D10",
            accuracy: 0.75,
            answers: 24,
        },
    ],
    hardest_criteria: {
        top_n: 3,
        min_answers: 5,
        basis: "accuracy",
    },
    easiest_criteria: {
        top_n: 3,
        min_answers: 5,
        basis: "accuracy",
    },
};

const studentPerformance = {
    students: [
        { id: 1, name: "Bruno Lima" },
        { id: 2, name: "Ana Souza" },
        { id: 3, name: "Caio Martins" },
    ] satisfies MatrixStudent[],
    studentSummaries: [
        {
            student_id: 1,
            summary: { answered: 2, correct: 1, accuracy: 0.5 },
            score: {
                basis: "by_accuracy",
                percent: 55.4,
                totals: { questions: 2, answered: 2, correct: 1, points_total: 2, points_correct: 1 },
            },
            predicted_level: { key: "BASICO", label: "Básico", color: "warning" },
        },
        {
            student_id: 2,
            summary: { answered: 2, correct: 2, accuracy: 1 },
            score: {
                basis: "by_accuracy",
                percent: 95.2,
                totals: { questions: 2, answered: 2, correct: 2, points_total: 2, points_correct: 2 },
            },
            predicted_level: { key: "AVANCADO", label: "Avançado", color: "success" },
        },
    ] satisfies MatrixStudentResultSummary[],
};

describe("assessment overview report mapper", () => {
    it("builds a printable summary with normalized labels and filename", () => {
        const report = buildAssessmentOverviewReport(baseOverview);

        expect(report.title).toBe("Prova Diagnóstica - 6º Ano");
        expect(report.fileName).toBe("prova-diagnostica-6-ano-overview.pdf");
        expect(report.subjectLabel).toBe("Matemática");
        expect(report.dateLabel).toBe("10/05/2026");
        expect(report.summary).toEqual([
            { label: "Taxa de acerto", value: "62.5%", detail: "30 de 48 respostas" },
            { label: "Participação", value: "80.0%", detail: "24 de 30 alunos responderam" },
            { label: "Questões", value: "2", detail: "Total de questões da prova" },
            { label: "Questão crítica", value: "Questão 1", detail: "50.0% de acerto - 24 respostas" },
        ]);
    });

    it("adds class and teacher context to the printable report title when available", () => {
        const report = buildAssessmentOverviewReport({
            ...baseOverview,
            assessment: {
                ...baseOverview.assessment,
                title: "Simulado de Matemática",
                class_name: "3B",
                teacher_name: "Rafa",
            },
        });

        expect(report.title).toBe("Simulado de Matemática - 3B - Prof. Rafa");
    });

    it("sorts skills and questions in pedagogical order", () => {
        const report = buildAssessmentOverviewReport(baseOverview);

        expect(report.skills.map((skill) => skill.level)).toEqual(["Abaixo do Básico", "Adequado"]);
        expect(report.questions.map((question) => question.number)).toEqual(["Questão 1", "Questão 2"]);
    });

    it("formats distribution with the correct option marked and all alternatives listed", () => {
        expect(formatDistribution(baseOverview.by_question[0])).toBe("A: 1 | B: 2 | C*: 18 | D: 2 | E: 0 | Branco: 7");
    });

    it("keeps distribution values structured for PDF charts", () => {
        const report = buildAssessmentOverviewReport(baseOverview);

        expect(report.questions[1].descriptorLabel).toBe("D10 - Grandezas e medidas");
        expect(report.questions[1].distributionTotal).toBe(30);
        expect(report.questions[1].distributionValues).toEqual([
            { option: "A", count: 1, isCorrect: false },
            { option: "B", count: 2, isCorrect: false },
            { option: "C", count: 18, isCorrect: true },
            { option: "D", count: 2, isCorrect: false },
            { option: "E", count: 0, isCorrect: false },
            { option: "Branco", count: 7, isCorrect: false },
        ]);
    });

    it("handles empty rankings without hiding questions", () => {
        const report = buildAssessmentOverviewReport({
            ...baseOverview,
            hardest: [],
            easiest: [],
        });

        expect(report.summary[3]).toEqual({
            label: "Questão crítica",
            value: "-",
            detail: "Sem dados suficientes",
        });
        expect(report.hardest.items).toHaveLength(0);
        expect(report.easiest.items).toHaveLength(0);
        expect(report.questions).toHaveLength(2);
    });

    it("builds a student performance section sorted by score", () => {
        const report = buildAssessmentOverviewReport(baseOverview, new Date("2026-05-12T12:00:00"), studentPerformance);

        expect(report.students.map((student) => student.name)).toEqual(["Ana Souza", "Bruno Lima", "Caio Martins"]);
        expect(report.students.map((student) => student.classificationLabel)).toEqual(["Avançado", "Básico", "Sem resposta"]);
        expect(report.students.map((student) => student.correctLabel)).toEqual(["2/2", "1/2", "0/2"]);
        expect(report.students.map((student) => student.percentLabel)).toEqual(["95.2%", "55.4%", "0.0%"]);
    });

    it("creates a paginated PDF document for long question lists", () => {
        const manyQuestions = Array.from({ length: 45 }, (_, index) => ({
            ...baseOverview.by_question[index % baseOverview.by_question.length],
            question_id: 1000 + index,
            display_order: index + 1,
            text_short: `Questão ${index + 1} com enunciado suficiente para ocupar linhas na tabela do PDF.`,
        }));

        const { doc, fileName } = createAssessmentOverviewPdf({
            ...baseOverview,
            overall: {
                ...baseOverview.overall,
                total_questions: manyQuestions.length,
            },
            by_question: manyQuestions,
        });

        expect(fileName).toBe("prova-diagnostica-6-ano-overview.pdf");
        expect(doc.getNumberOfPages()).toBeGreaterThan(5);
    });

    it("renders student performance in the PDF without the old full questions table", () => {
        const { doc } = createAssessmentOverviewPdf(baseOverview, studentPerformance);
        const pdfOutput = doc.output();

        expect(pdfOutput).toContain("Desempenho por aluno");
        expect(pdfOutput).toContain("Ana Souza");
        expect(pdfOutput).not.toContain("Lista completa das questões");
    });
});
