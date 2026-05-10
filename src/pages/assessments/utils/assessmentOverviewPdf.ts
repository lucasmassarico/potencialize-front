import { jsPDF } from "jspdf";
import { autoTable, type UserOptions } from "jspdf-autotable";

import type { AssessmentOverviewDTO } from "../../../types/assessments";
import {
    buildAssessmentOverviewReport,
    type AssessmentOverviewReport,
    type ReportRankingSection,
} from "./assessmentOverviewReport";

type PdfColor = [number, number, number];
type PdfWithTable = jsPDF & { lastAutoTable?: { finalY?: number } };

const COLORS = {
    primary: [37, 99, 235] as PdfColor,
    primaryDark: [30, 64, 175] as PdfColor,
    text: [31, 41, 55] as PdfColor,
    muted: [107, 114, 128] as PdfColor,
    border: [226, 232, 240] as PdfColor,
    surface: [248, 250, 252] as PdfColor,
    white: [255, 255, 255] as PdfColor,
};

const PAGE = {
    marginX: 12,
    headerY: 10,
    contentTop: 26,
    footerY: 202,
    contentBottom: 190,
};

const setTextColor = (doc: jsPDF, color: PdfColor): void => {
    doc.setTextColor(color[0], color[1], color[2]);
};

const setFillColor = (doc: jsPDF, color: PdfColor): void => {
    doc.setFillColor(color[0], color[1], color[2]);
};

const setDrawColor = (doc: jsPDF, color: PdfColor): void => {
    doc.setDrawColor(color[0], color[1], color[2]);
};

const pageWidth = (doc: jsPDF): number => doc.internal.pageSize.getWidth();

const contentWidth = (doc: jsPDF): number => pageWidth(doc) - PAGE.marginX * 2;

const lastTableY = (doc: jsPDF, fallback: number): number =>
    (doc as PdfWithTable).lastAutoTable?.finalY ?? fallback;

const ensureSpace = (doc: jsPDF, y: number, needed: number): number => {
    if (y + needed <= PAGE.contentBottom) return y;
    doc.addPage();
    return PAGE.contentTop;
};

const drawPageDecorations = (doc: jsPDF, report: AssessmentOverviewReport): void => {
    const totalPages = doc.getNumberOfPages();

    for (let page = 1; page <= totalPages; page += 1) {
        doc.setPage(page);

        setTextColor(doc, COLORS.primaryDark);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(report.title, PAGE.marginX, PAGE.headerY);

        setTextColor(doc, COLORS.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(`Gerado em ${report.generatedAtLabel}`, pageWidth(doc) - PAGE.marginX, PAGE.headerY, {
            align: "right",
        });

        setDrawColor(doc, COLORS.border);
        doc.line(PAGE.marginX, 15, pageWidth(doc) - PAGE.marginX, 15);
        doc.line(PAGE.marginX, PAGE.footerY - 5, pageWidth(doc) - PAGE.marginX, PAGE.footerY - 5);

        setTextColor(doc, COLORS.muted);
        doc.setFontSize(7);
        doc.text("Potencialize - Relatório de desempenho", PAGE.marginX, PAGE.footerY);
        doc.text(`Página ${page} de ${totalPages}`, pageWidth(doc) - PAGE.marginX, PAGE.footerY, {
            align: "right",
        });
    }
};

const drawTitlePage = (doc: jsPDF, report: AssessmentOverviewReport): number => {
    setTextColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Relatório da avaliação", PAGE.marginX, 28);

    setTextColor(doc, COLORS.text);
    doc.setFontSize(13);
    const titleLines = doc.splitTextToSize(report.title, contentWidth(doc) - 12);
    doc.text(titleLines, PAGE.marginX, 38);

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Disciplina: ${report.subjectLabel}`, PAGE.marginX, 50);
    doc.text(`Data da avaliação: ${report.dateLabel}`, PAGE.marginX + 72, 50);

    return 62;
};

const drawSummaryCards = (doc: jsPDF, report: AssessmentOverviewReport, y: number): number => {
    const gap = 4;
    const cardWidth = (contentWidth(doc) - gap * 3) / 4;
    const cardHeight = 24;

    report.summary.forEach((item, index) => {
        const x = PAGE.marginX + index * (cardWidth + gap);
        setFillColor(doc, COLORS.surface);
        setDrawColor(doc, COLORS.border);
        doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, "FD");

        setTextColor(doc, COLORS.muted);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.text(item.label.toUpperCase(), x + 4, y + 7);

        setTextColor(doc, COLORS.primaryDark);
        doc.setFontSize(13);
        doc.text(item.value, x + 4, y + 15);

        setTextColor(doc, COLORS.text);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        const detailLines = doc.splitTextToSize(item.detail, cardWidth - 8);
        doc.text(detailLines.slice(0, 2), x + 4, y + 20);
    });

    return y + cardHeight + 10;
};

const sectionTitle = (doc: jsPDF, title: string, y: number, subtitle?: string): number => {
    setTextColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, PAGE.marginX, y);

    if (subtitle) {
        setTextColor(doc, COLORS.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(doc.splitTextToSize(subtitle, contentWidth(doc)), PAGE.marginX, y + 5);
        return y + 10;
    }

    return y + 5;
};

const tableDefaults = (startY: number): UserOptions => ({
    startY,
    margin: { top: PAGE.contentTop, right: PAGE.marginX, bottom: 18, left: PAGE.marginX },
    theme: "grid",
    rowPageBreak: "avoid",
    showHead: "everyPage",
    styles: {
        font: "helvetica",
        fontSize: 7,
        cellPadding: 1.5,
        overflow: "linebreak",
        valign: "top",
        textColor: COLORS.text,
        lineColor: COLORS.border,
        lineWidth: 0.1,
    },
    headStyles: {
        fillColor: COLORS.primaryDark,
        textColor: COLORS.white,
        fontStyle: "bold",
        halign: "left",
    },
    alternateRowStyles: {
        fillColor: COLORS.surface,
    },
});

const drawSkillsTable = (doc: jsPDF, report: AssessmentOverviewReport, y: number): number => {
    const nextY = sectionTitle(doc, "Acerto por nível", y);
    autoTable(doc, {
        ...tableDefaults(nextY),
        body: report.skills.map((skill) => [
            skill.level,
            skill.questions,
            skill.answers,
            skill.correct,
            skill.accuracyLabel,
            skill.studentsAnswered,
        ]),
        head: [["Nível", "Questões", "Respondidas", "Corretas", "Acerto", "Alunos"]],
        columnStyles: {
            1: { halign: "right" },
            2: { halign: "right" },
            3: { halign: "right" },
            4: { halign: "right" },
            5: { halign: "right" },
        },
        pageBreak: "avoid",
    });
    return lastTableY(doc, nextY) + 10;
};

const emptySectionMessage = (doc: jsPDF, text: string, y: number): number => {
    setFillColor(doc, COLORS.surface);
    setDrawColor(doc, COLORS.border);
    doc.roundedRect(PAGE.marginX, y, contentWidth(doc), 13, 2, 2, "FD");
    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(text, PAGE.marginX + 4, y + 8);
    return y + 18;
};

const drawRankingSection = (doc: jsPDF, section: ReportRankingSection, y: number): number => {
    const startY = ensureSpace(doc, y, 48);
    const tableY = sectionTitle(doc, section.title, startY, section.criteria);

    if (section.items.length === 0) {
        return emptySectionMessage(doc, "Sem questões ranqueadas com dados suficientes.", tableY);
    }

    autoTable(doc, {
        ...tableDefaults(tableY),
        body: section.items.map((item) => [
            item.number,
            item.level,
            item.descriptor,
            item.answers,
            item.accuracyLabel,
            item.text,
        ]),
        head: [["Questão", "Nível", "Descritor", "Resp.", "Acerto", "Enunciado"]],
        columnStyles: {
            0: { cellWidth: 22 },
            1: { cellWidth: 34 },
            2: { cellWidth: 24 },
            3: { cellWidth: 16, halign: "right" },
            4: { cellWidth: 18, halign: "right" },
            5: { cellWidth: "auto" },
        },
        pageBreak: "avoid",
    });

    return lastTableY(doc, tableY) + 10;
};

const drawQuestionsTable = (doc: jsPDF, report: AssessmentOverviewReport): void => {
    doc.addPage();
    const tableY = sectionTitle(
        doc,
        "Desempenho por questão",
        PAGE.contentTop,
        "Lista completa das questões, com gabarito, acerto e distribuição por alternativa.",
    );

    autoTable(doc, {
        ...tableDefaults(tableY),
        body: report.questions.map((question) => [
            question.number.replace("Questão ", ""),
            question.level,
            question.descriptor,
            question.correctOption,
            `${question.correct}/${question.answers}`,
            question.accuracyLabel,
            question.distribution,
            question.text,
        ]),
        head: [["#", "Nível", "Descritor", "Gab.", "Resp.", "Acerto", "Distribuição", "Enunciado"]],
        columnStyles: {
            0: { cellWidth: 14, halign: "center" },
            1: { cellWidth: 28 },
            2: { cellWidth: 22 },
            3: { cellWidth: 12, halign: "center" },
            4: { cellWidth: 18, halign: "right" },
            5: { cellWidth: 18, halign: "right" },
            6: { cellWidth: 74 },
            7: { cellWidth: 87 },
        },
    });
};

export interface CreatedAssessmentOverviewPdf {
    doc: jsPDF;
    fileName: string;
}

export const createAssessmentOverviewPdf = (overview: AssessmentOverviewDTO): CreatedAssessmentOverviewPdf => {
    const report = buildAssessmentOverviewReport(overview);
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    let y = drawTitlePage(doc, report);
    y = drawSummaryCards(doc, report, y);
    y = drawSkillsTable(doc, report, y);
    y = drawRankingSection(doc, report.hardest, y);
    drawRankingSection(doc, report.easiest, y);
    drawQuestionsTable(doc, report);
    drawPageDecorations(doc, report);

    return { doc, fileName: report.fileName };
};

export const exportAssessmentOverviewPdf = (overview: AssessmentOverviewDTO): void => {
    const { doc, fileName } = createAssessmentOverviewPdf(overview);
    doc.save(fileName);
};
