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
import { accuracyColor, PDF_REPORT_THEME, skillLevelColor } from "./pdfReportTheme";

const COLORS = PDF_REPORT_THEME.colors;

const OPTION_COLORS: Record<ReportOptionLabel, PdfColor> = {
    A: COLORS.optionA,
    B: COLORS.optionB,
    C: COLORS.optionC,
    D: COLORS.optionD,
    E: COLORS.optionE,
    Branco: COLORS.blank,
};

const QUESTION_DISTRIBUTION_ROWS_PER_PAGE = 10;

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

const compactQuestionNumber = (value: string): string => value.replace("Questão ", "Q");

const pageWidth = (doc: jsPDF): number => doc.internal.pageSize.getWidth();

const contentWidth = (doc: jsPDF): number => pageWidth(doc) - PAGE.marginX * 2;

const ensureSpace = (doc: jsPDF, y: number, needed: number): number => {
    if (y + needed <= PAGE.contentBottom) return y;
    doc.addPage();
    return PAGE.contentTop;
};

const drawPercentGrid = (doc: jsPDF, x: number, y: number, width: number, height: number): void => {
    doc.setLineWidth(0.1);
    PDF_REPORT_THEME.chart.axisTicks.forEach((tick) => {
        const tickX = x + width * tick;
        setDrawColor(doc, COLORS.grid);
        doc.line(tickX, y, tickX, y + height);

        setTextColor(doc, COLORS.subtleText);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6);
        doc.text(`${Math.round(tick * 100)}%`, tickX, y + height + 4, { align: "center" });
    });
};

const drawColumnHeader = (doc: jsPDF, text: string, x: number, y: number): void => {
    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.3);
    doc.text(text.toUpperCase(), x, y);
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
    const rowHeight = PDF_REPORT_THEME.chart.compactRowHeight;
    const startY = ensureSpace(doc, y, 28 + report.skills.length * rowHeight);
    const currentY = sectionTitle(doc, "Acerto por nível", startY);

    if (report.skills.length === 0) {
        return emptySectionMessage(doc, "Sem dados por nível para esta avaliação.", currentY);
    }

    const x = PAGE.marginX;
    const width = contentWidth(doc);
    const topPadding = 8;
    const axisHeight = 8;
    const chartHeight = topPadding + report.skills.length * rowHeight + axisHeight;
    const labelWidth = 50;
    const valueWidth = 24;
    const metaWidth = 36;
    const barX = x + labelWidth;
    const barWidth = width - labelWidth - valueWidth - metaWidth - 8;
    const gridY = currentY + 6;
    const gridHeight = report.skills.length * rowHeight;

    setFillColor(doc, COLORS.surface);
    setDrawColor(doc, COLORS.border);
    doc.roundedRect(x, currentY, width, chartHeight, 2, 2, "FD");
    drawPercentGrid(doc, barX, gridY, barWidth, gridHeight);

    drawColumnHeader(doc, "Nível", x + 4, currentY + 5);
    drawColumnHeader(doc, "Taxa de acerto", barX, currentY + 5);
    drawColumnHeader(doc, "Respostas", barX + barWidth + valueWidth + 4, currentY + 5);

    report.skills.forEach((skill, index) => {
        const rowY = currentY + topPadding + index * rowHeight;

        setTextColor(doc, COLORS.text);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.2);
        doc.text(skill.level, x + 4, rowY + 5);

        drawProgressBar(doc, {
            x: barX,
            y: rowY + 1.2,
            width: barWidth,
            height: 5.5,
            ratio: skill.accuracyValue,
            fillColor: skillLevelColor(skill.skillLevel),
            trackColor: COLORS.track,
            borderColor: COLORS.border,
        });

        setTextColor(doc, COLORS.primaryDark);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.2);
        doc.text(skill.accuracyLabel, barX + barWidth + 5, rowY + 5.4);

        setTextColor(doc, COLORS.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.6);
        doc.text(`${skill.correct}/${skill.answers}`, barX + barWidth + valueWidth + 4, rowY + 5.4);
        doc.text(`${skill.questions} questões`, x + width - 4, rowY + 5.4, { align: "right" });
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

const drawRankingItem = (
    doc: jsPDF,
    item: ReportRankingRow,
    x: number,
    y: number,
    width: number,
    accentColor: PdfColor,
): number => {
    const rowHeight = 23;
    const barX = x + width - 55;
    const barWidth = 35;

    setFillColor(doc, COLORS.white);
    setDrawColor(doc, COLORS.border);
    doc.roundedRect(x, y, width, rowHeight, 1.6, 1.6, "FD");

    setFillColor(doc, accentColor);
    doc.rect(x, y, 1.6, rowHeight, "F");

    setTextColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(compactQuestionNumber(item.number), x + 4, y + 6);

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.text(`${item.descriptor} - ${item.level}`, x + 4, y + 11.5);

    setTextColor(doc, COLORS.text);
    doc.setFontSize(6.5);
    const textLines = doc.splitTextToSize(item.text, barX - x - 8);
    doc.text(textLines.slice(0, 2), x + 4, y + 16.5);

    drawProgressBar(doc, {
        x: barX,
        y: y + 5.5,
        width: barWidth,
        height: 4,
        ratio: item.accuracyValue,
        fillColor: accentColor,
        trackColor: COLORS.track,
        borderColor: COLORS.border,
    });

    setTextColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.6);
    doc.text(item.accuracyLabel, barX + barWidth + 3, y + 8.7);

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.text(`${item.answers} respostas`, barX, y + 17);

    return y + rowHeight + 2;
};

const drawRankingColumn = (
    doc: jsPDF,
    section: ReportRankingSection,
    x: number,
    y: number,
    width: number,
    accentColor: PdfColor,
): number => {
    let currentY = y;

    setFillColor(doc, COLORS.surfaceVariant);
    setDrawColor(doc, COLORS.border);
    doc.roundedRect(x, currentY, width, 15, 1.8, 1.8, "FD");

    setTextColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.2);
    doc.text(section.title, x + 4, currentY + 5.5);

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(doc.splitTextToSize(section.criteria, width - 8).slice(0, 1), x + 4, currentY + 10.8);

    currentY += 18;

    if (section.items.length === 0) {
        setTextColor(doc, COLORS.muted);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.text("Sem questões ranqueadas com dados suficientes.", x + 4, currentY + 5);
        return currentY + 12;
    }

    section.items.forEach((item) => {
        currentY = drawRankingItem(doc, item, x, currentY, width, accentColor);
    });

    return currentY;
};

const drawRankingComparison = (doc: jsPDF, report: AssessmentOverviewReport, y: number): number => {
    const maxRows = Math.max(report.hardest.items.length, report.easiest.items.length, 1);
    const rowHeight = 25;
    let currentY = ensureSpace(doc, y, 24 + maxRows * rowHeight);
    currentY = sectionTitle(doc, "Questões ranqueadas", currentY);

    const gap = 6;
    const columnWidth = (contentWidth(doc) - gap) / 2;
    const leftY = drawRankingColumn(doc, report.hardest, PAGE.marginX, currentY, columnWidth, COLORS.error);
    const rightY = drawRankingColumn(
        doc,
        report.easiest,
        PAGE.marginX + columnWidth + gap,
        currentY,
        columnWidth,
        COLORS.success,
    );

    return Math.max(leftY, rightY) + 8;
};

const drawDistributionLegend = (doc: jsPDF, y: number): number => {
    const items: Array<[string, PdfColor]> = [
        ["Gabarito", COLORS.success],
        ...((Object.entries(OPTION_COLORS) as Array<[ReportOptionLabel, PdfColor]>).filter(([label]) => label !== "Branco")),
        ["Branco", COLORS.blank],
    ];
    let x = PAGE.marginX;

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);

    items.forEach(([label, color]) => {
        setFillColor(doc, color);
        setDrawColor(doc, COLORS.border);
        doc.roundedRect(x, y - 3, 3, 3, 0.5, 0.5, "FD");
        setTextColor(doc, COLORS.muted);
        doc.text(label, x + 4.5, y);
        x += doc.getTextWidth(label) + 12;
    });

    return y + 5;
};

const distributionSegmentsForQuestion = (question: ReportQuestionRow) =>
    toStackedSegments(question.distributionValues, question.distributionTotal).map((segment) => ({
        ...segment,
        color: segment.isCorrect ? COLORS.success : OPTION_COLORS[segment.option],
        borderColor: segment.isCorrect ? COLORS.primaryDark : undefined,
    }));

const drawQuestionDistributionHeader = (doc: jsPDF, y: number): number => {
    const x = PAGE.marginX;
    drawColumnHeader(doc, "Questao", x + 4, y);
    drawColumnHeader(doc, "Descritor", x + 24, y);
    drawColumnHeader(doc, "Enunciado", x + 76, y);
    drawColumnHeader(doc, "Acerto", x + 150, y);
    drawColumnHeader(doc, "Distribuicao", x + 202, y);
    drawColumnHeader(doc, "Alunos", x + contentWidth(doc) - 18, y);
    return y + 3;
};

const drawQuestionDistributionRow = (doc: jsPDF, question: ReportQuestionRow, y: number, index: number): number => {
    const rowHeight = PDF_REPORT_THEME.chart.questionRowHeight;
    const x = PAGE.marginX;
    const width = contentWidth(doc);
    const descriptorX = x + 24;
    const textX = x + 76;
    const accuracyX = x + 150;
    const accuracyWidth = 34;
    const distributionX = x + 202;
    const distributionWidth = 50;
    const fillColor = index % 2 === 0 ? COLORS.white : COLORS.surfaceVariant;

    setFillColor(doc, fillColor);
    setDrawColor(doc, COLORS.border);
    doc.roundedRect(x, y, width, rowHeight, 1.5, 1.5, "FD");
    setFillColor(doc, skillLevelColor(question.skillLevel));
    doc.rect(x, y, 1.4, rowHeight, "F");

    setTextColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.4);
    doc.text(compactQuestionNumber(question.number), x + 4, y + 5.5);

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(`Gab. ${question.correctOption}`, x + 4, y + 11.3);

    setTextColor(doc, COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    const descriptorLines = doc.splitTextToSize(question.descriptorLabel, textX - descriptorX - 4);
    doc.text(descriptorLines.slice(0, 2), descriptorX, y + 5.2);

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.7);
    doc.text(question.level, descriptorX, y + 13.1);

    setTextColor(doc, COLORS.text);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.3);
    const questionLines = doc.splitTextToSize(question.text, accuracyX - textX - 4);
    doc.text(questionLines.slice(0, 2), textX, y + 5.2);

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.text(question.accuracyLabel, accuracyX + accuracyWidth + 4, y + 8.9);
    drawProgressBar(doc, {
        x: accuracyX,
        y: y + 5.5,
        width: accuracyWidth,
        height: 4.2,
        ratio: question.accuracyValue,
        fillColor: accuracyColor(question.accuracyValue),
        trackColor: COLORS.track,
        borderColor: COLORS.border,
    });

    drawStackedBar(doc, {
        x: distributionX,
        y: y + 5.5,
        width: distributionWidth,
        height: 4.2,
        segments: distributionSegmentsForQuestion(question),
        trackColor: COLORS.track,
        borderColor: COLORS.border,
    });
    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.text(`${question.distributionTotal}`, x + width - 4, y + 8.9, { align: "right" });

    return y + rowHeight + 1.5;
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
        currentY = drawQuestionDistributionHeader(doc, currentY + 2);

        chunk.forEach((question, questionIndex) => {
            currentY = drawQuestionDistributionRow(doc, question, currentY, questionIndex);
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
    drawRankingComparison(doc, report, y);
    drawQuestionDistributionCharts(doc, report);
    drawQuestionsTable(doc, report);
    drawPageDecorations(doc, report);

    return { doc, fileName: report.fileName };
};

export const exportAssessmentOverviewPdf = (overview: AssessmentOverviewDTO): void => {
    const { doc, fileName } = createAssessmentOverviewPdf(overview);
    doc.save(fileName);
};
