import { jsPDF } from "jspdf";
import { autoTable, type UserOptions } from "jspdf-autotable";

import type { AssessmentOverviewDTO } from "../../../types/assessments";
import {
    buildAssessmentOverviewReport,
    type AssessmentOverviewReport,
    type ReportOptionLabel,
    type ReportQuestionRow,
    type ReportRankingRow,
    type ReportRankingSection,
} from "./assessmentOverviewReport";
import {
    chunkChartRows,
    drawProgressBar,
    drawStackedBar,
    toStackedSegments,
    type PdfColor,
} from "./pdfChartPrimitives";

const COLORS = {
    primary: [37, 99, 235] as PdfColor,
    primaryDark: [30, 64, 175] as PdfColor,
    success: [22, 163, 74] as PdfColor,
    warning: [217, 119, 6] as PdfColor,
    danger: [220, 38, 38] as PdfColor,
    teal: [13, 148, 136] as PdfColor,
    violet: [124, 58, 237] as PdfColor,
    rose: [225, 29, 72] as PdfColor,
    text: [31, 41, 55] as PdfColor,
    muted: [107, 114, 128] as PdfColor,
    border: [226, 232, 240] as PdfColor,
    surface: [248, 250, 252] as PdfColor,
    track: [241, 245, 249] as PdfColor,
    blank: [148, 163, 184] as PdfColor,
    white: [255, 255, 255] as PdfColor,
};

const OPTION_COLORS: Record<ReportOptionLabel, PdfColor> = {
    A: COLORS.rose,
    B: COLORS.warning,
    C: COLORS.primary,
    D: COLORS.teal,
    E: COLORS.violet,
    Branco: COLORS.blank,
};

const QUESTION_DISTRIBUTION_ROWS_PER_PAGE = 9;

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

const accuracyColor = (value: number): PdfColor => {
    if (value < 0.5) return COLORS.danger;
    if (value < 0.7) return COLORS.warning;
    return COLORS.success;
};

const compactQuestionNumber = (value: string): string => value.replace("Questão ", "Q");

const pageWidth = (doc: jsPDF): number => doc.internal.pageSize.getWidth();

const contentWidth = (doc: jsPDF): number => pageWidth(doc) - PAGE.marginX * 2;

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

const drawSkillsChart = (doc: jsPDF, report: AssessmentOverviewReport, y: number): number => {
    const rowHeight = 12;
    const startY = ensureSpace(doc, y, 20 + report.skills.length * rowHeight);
    const currentY = sectionTitle(doc, "Acerto por nível", startY);

    if (report.skills.length === 0) {
        return emptySectionMessage(doc, "Sem dados por nível para esta avaliação.", currentY);
    }

    const x = PAGE.marginX;
    const width = contentWidth(doc);
    const chartHeight = report.skills.length * rowHeight + 7;
    setFillColor(doc, COLORS.surface);
    setDrawColor(doc, COLORS.border);
    doc.roundedRect(x, currentY, width, chartHeight, 2, 2, "FD");

    report.skills.forEach((skill, index) => {
        const rowY = currentY + 5 + index * rowHeight;
        const barX = x + 58;
        const barWidth = 118;

        setTextColor(doc, COLORS.text);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(skill.level, x + 4, rowY + 5);

        drawProgressBar(doc, {
            x: barX,
            y: rowY + 1,
            width: barWidth,
            height: 5,
            ratio: skill.accuracyValue,
            fillColor: accuracyColor(skill.accuracyValue),
            trackColor: COLORS.track,
            borderColor: COLORS.border,
        });

        setTextColor(doc, COLORS.primaryDark);
        doc.setFont("helvetica", "bold");
        doc.text(skill.accuracyLabel, barX + barWidth + 6, rowY + 5);

        setTextColor(doc, COLORS.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text(`${skill.correct}/${skill.answers} corretas`, barX + barWidth + 29, rowY + 5);
        doc.text(`${skill.questions} questões`, x + width - 4, rowY + 5, { align: "right" });
    });

    return currentY + chartHeight + 10;
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

const drawRankingRow = (doc: jsPDF, item: ReportRankingRow, y: number): number => {
    const rowHeight = 22;
    const x = PAGE.marginX;
    const width = contentWidth(doc);
    const barX = x + 61;
    const barWidth = 74;
    const textX = x + 166;

    setFillColor(doc, COLORS.surface);
    setDrawColor(doc, COLORS.border);
    doc.roundedRect(x, y, width, rowHeight, 2, 2, "FD");

    setTextColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(compactQuestionNumber(item.number), x + 4, y + 7);

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(item.level, x + 4, y + 13);
    doc.text(item.descriptor, x + 4, y + 18);

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.text("Acerto", barX, y + 7);
    drawProgressBar(doc, {
        x: barX,
        y: y + 10,
        width: barWidth,
        height: 5,
        ratio: item.accuracyValue,
        fillColor: accuracyColor(item.accuracyValue),
        trackColor: COLORS.track,
        borderColor: COLORS.border,
    });

    setTextColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.text(item.accuracyLabel, barX + barWidth + 6, y + 14);

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text(`${item.answers} respostas`, barX + barWidth + 6, y + 19);

    setTextColor(doc, COLORS.text);
    doc.setFontSize(7);
    const textLines = doc.splitTextToSize(item.text, x + width - textX - 4);
    doc.text(textLines.slice(0, 3), textX, y + 7);

    return y + rowHeight + 3;
};

const drawRankingSection = (doc: jsPDF, section: ReportRankingSection, y: number): number => {
    let currentY = ensureSpace(doc, y, 36);
    currentY = sectionTitle(doc, section.title, currentY, section.criteria);

    if (section.items.length === 0) {
        return emptySectionMessage(doc, "Sem questões ranqueadas com dados suficientes.", currentY);
    }

    section.items.forEach((item) => {
        currentY = ensureSpace(doc, currentY, 25);
        currentY = drawRankingRow(doc, item, currentY);
    });

    return currentY + 4;
};

const drawDistributionLegend = (doc: jsPDF, y: number): number => {
    const items = Object.entries(OPTION_COLORS) as Array<[ReportOptionLabel, PdfColor]>;
    let x = PAGE.marginX;

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    items.forEach(([label, color]) => {
        setFillColor(doc, color);
        setDrawColor(doc, COLORS.border);
        doc.rect(x, y - 3, 3, 3, "FD");
        setTextColor(doc, COLORS.muted);
        doc.text(label, x + 4.5, y);
        x += doc.getTextWidth(label) + 13;
    });

    return y + 6;
};

const distributionSegmentsForQuestion = (question: ReportQuestionRow) =>
    toStackedSegments(question.distributionValues, question.distributionTotal).map((segment) => ({
        ...segment,
        color: OPTION_COLORS[segment.option],
    }));

const drawQuestionDistributionRow = (doc: jsPDF, question: ReportQuestionRow, y: number): number => {
    const rowHeight = 15;
    const x = PAGE.marginX;
    const width = contentWidth(doc);
    const textX = x + 30;
    const accuracyX = x + 128;
    const accuracyWidth = 42;
    const distributionX = x + 187;
    const distributionWidth = 70;

    setFillColor(doc, COLORS.white);
    setDrawColor(doc, COLORS.border);
    doc.roundedRect(x, y, width, rowHeight, 1.5, 1.5, "FD");

    setTextColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(compactQuestionNumber(question.number), x + 4, y + 6);

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(`Gab. ${question.correctOption}`, x + 4, y + 11);

    setTextColor(doc, COLORS.text);
    doc.setFontSize(6.7);
    const questionLines = doc.splitTextToSize(question.text, accuracyX - textX - 4);
    doc.text(questionLines.slice(0, 2), textX, y + 5);

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.text("Acerto", accuracyX, y + 5);
    drawProgressBar(doc, {
        x: accuracyX,
        y: y + 7,
        width: accuracyWidth,
        height: 4,
        ratio: question.accuracyValue,
        fillColor: accuracyColor(question.accuracyValue),
        trackColor: COLORS.track,
        borderColor: COLORS.border,
    });
    setTextColor(doc, COLORS.primaryDark);
    doc.text(question.accuracyLabel, accuracyX + accuracyWidth + 4, y + 10.5);

    setTextColor(doc, COLORS.muted);
    doc.text("Distribuição", distributionX, y + 5);
    drawStackedBar(doc, {
        x: distributionX,
        y: y + 7,
        width: distributionWidth,
        height: 4,
        segments: distributionSegmentsForQuestion(question),
        trackColor: COLORS.track,
        borderColor: COLORS.border,
    });
    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.text(`${question.distributionTotal} alunos`, x + width - 4, y + 10.5, { align: "right" });

    return y + rowHeight + 2;
};

const drawQuestionDistributionCharts = (doc: jsPDF, report: AssessmentOverviewReport): void => {
    const chunks = chunkChartRows(report.questions, QUESTION_DISTRIBUTION_ROWS_PER_PAGE);

    if (chunks.length === 0) {
        doc.addPage();
        const y = sectionTitle(
            doc,
            "Desempenho por questão",
            PAGE.contentTop,
            "Barras de acerto e distribuição por alternativa.",
        );
        emptySectionMessage(doc, "Sem questões cadastradas para esta avaliação.", y);
        return;
    }

    chunks.forEach((chunk, index) => {
        doc.addPage();
        let currentY = sectionTitle(
            doc,
            "Desempenho por questão",
            PAGE.contentTop,
            index === 0
                ? "Barras de acerto e distribuição por alternativa. A legenda indica as alternativas A-E e respostas em branco."
                : undefined,
        );
        currentY = drawDistributionLegend(doc, currentY);

        chunk.forEach((question) => {
            currentY = drawQuestionDistributionRow(doc, question, currentY);
        });
    });
};

const drawQuestionsTable = (doc: jsPDF, report: AssessmentOverviewReport): void => {
    doc.addPage();
    const tableY = sectionTitle(
        doc,
        "Lista completa das questões",
        PAGE.contentTop,
        "Tabela completa com gabarito, acerto e distribuição por alternativa.",
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
    y = drawSkillsChart(doc, report, y);
    y = drawRankingSection(doc, report.hardest, y);
    drawRankingSection(doc, report.easiest, y);
    drawQuestionDistributionCharts(doc, report);
    drawQuestionsTable(doc, report);
    drawPageDecorations(doc, report);

    return { doc, fileName: report.fileName };
};

export const exportAssessmentOverviewPdf = (overview: AssessmentOverviewDTO): void => {
    const { doc, fileName } = createAssessmentOverviewPdf(overview);
    doc.save(fileName);
};
