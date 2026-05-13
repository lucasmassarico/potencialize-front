import { jsPDF } from "jspdf";

import type { AssessmentOverviewDTO } from "../../../types/assessments";
import {
    buildAssessmentOverviewReport,
    type AssessmentOverviewStudentPerformanceInput,
    type AssessmentOverviewReport,
    type ReportQuestionRow,
    type ReportRankingRow,
    type ReportRankingSection,
    type ReportStudentClassificationKey,
    type ReportStudentRow,
} from "./assessmentOverviewReport";
import {
    drawProgressBar,
    hasSpaceForChartRow,
    type PdfColor,
} from "./pdfChartPrimitives";
import { accuracyColor, PDF_REPORT_THEME, skillLevelColor } from "./pdfReportTheme";

const COLORS = PDF_REPORT_THEME.colors;

const QUESTION_DISTRIBUTION_BOTTOM_GUARD = 4;
const QUESTION_DISTRIBUTION_ROW_GAP = 1.5;
const STUDENT_PERFORMANCE_BOTTOM_GUARD = 4;
const STUDENT_PERFORMANCE_ROW_GAP = 1.2;
const STUDENT_PERFORMANCE_ROW_HEIGHT = 14;

const DISTRIBUTION_CHIP_GAP = 0.7;
const DISTRIBUTION_CHIP_HEIGHT = 6;

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

const drawColumnHeader = (
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    align: "left" | "right" = "left",
): void => {
    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.3);
    doc.text(text.toUpperCase(), x, y, { align });
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

const distributionPercentLabel = (count: number, total: number): string => {
    if (total <= 0) return "0%";
    const value = Math.round((count / total) * 100);
    return `${value}%`;
};

const drawDistributionChip = (
    doc: jsPDF,
    label: string,
    percentLabel: string,
    isCorrect: boolean,
    x: number,
    y: number,
    width: number,
    height: number,
): void => {
    const fill = isCorrect ? COLORS.success : COLORS.surfaceVariant;
    const stroke = isCorrect ? COLORS.success : COLORS.border;
    const labelColor = isCorrect ? COLORS.white : COLORS.muted;
    const valueColor = isCorrect ? COLORS.white : COLORS.text;
    const chipLabel = isCorrect ? `${label}*` : label;
    const textY = y + height / 2 + 1.4;

    setFillColor(doc, fill);
    setDrawColor(doc, stroke);
    doc.roundedRect(x, y, width, height, 1, 1, "FD");

    setTextColor(doc, labelColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.6);
    doc.text(chipLabel, x + 1.4, textY);

    setTextColor(doc, valueColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.6);
    doc.text(percentLabel, x + width - 1.4, textY, { align: "right" });
};

const drawDistributionChips = (
    doc: jsPDF,
    question: ReportQuestionRow,
    x: number,
    y: number,
    width: number,
): void => {
    const chips = question.distributionValues;
    const chipWidth = (width - DISTRIBUTION_CHIP_GAP * (chips.length - 1)) / chips.length;

    chips.forEach((dist, index) => {
        const cx = x + index * (chipWidth + DISTRIBUTION_CHIP_GAP);
        const label = dist.option === "Branco" ? "Br" : dist.option;
        const percentLabel = distributionPercentLabel(dist.count, question.distributionTotal);
        drawDistributionChip(doc, label, percentLabel, dist.isCorrect, cx, y, chipWidth, DISTRIBUTION_CHIP_HEIGHT);
    });
};

const drawDistributionLegend = (doc: jsPDF, y: number): number => {
    const swatchWidth = 12;
    const swatchHeight = 5.4;
    const baselineY = y + swatchHeight / 2 + 1.3;

    const correctX = PAGE.marginX;
    setFillColor(doc, COLORS.success);
    setDrawColor(doc, COLORS.success);
    doc.roundedRect(correctX, y, swatchWidth, swatchHeight, 1, 1, "FD");
    setTextColor(doc, COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.text("A*", correctX + 1.4, baselineY);
    doc.text("65%", correctX + swatchWidth - 1.4, baselineY, { align: "right" });

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);
    doc.text("Gabarito (alternativa correta).", correctX + swatchWidth + 2.5, baselineY);

    const neutralX = correctX + swatchWidth + 2.5 + 52;
    setFillColor(doc, COLORS.surfaceVariant);
    setDrawColor(doc, COLORS.border);
    doc.roundedRect(neutralX, y, swatchWidth, swatchHeight, 1, 1, "FD");
    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    doc.text("B", neutralX + 1.4, baselineY);
    setTextColor(doc, COLORS.text);
    doc.text("12%", neutralX + swatchWidth - 1.4, baselineY, { align: "right" });

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);
    doc.text("Demais alternativas com o percentual de respostas.", neutralX + swatchWidth + 2.5, baselineY);

    return y + swatchHeight + 3;
};

const drawQuestionDistributionHeader = (doc: jsPDF, y: number): number => {
    const x = PAGE.marginX;
    drawColumnHeader(doc, "Questão", x + 4, y);
    drawColumnHeader(doc, "Descritor", x + 24, y);
    drawColumnHeader(doc, "Enunciado", x + 76, y);
    drawColumnHeader(doc, "Acerto", x + 132, y);
    drawColumnHeader(doc, "Distribuição", x + 172, y);
    drawColumnHeader(doc, "Respostas", x + contentWidth(doc) - 4, y, "right");
    return y + 3;
};

const drawQuestionDistributionRow = (doc: jsPDF, question: ReportQuestionRow, y: number, index: number): number => {
    const rowHeight = PDF_REPORT_THEME.chart.questionRowHeight;
    const x = PAGE.marginX;
    const width = contentWidth(doc);
    const descriptorX = x + 24;
    const textX = x + 76;
    const accuracyX = x + 132;
    const accuracyWidth = 28;
    const distributionX = x + 172;
    const distributionWidth = 70;
    const chipY = y + 4.6;
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

    setTextColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    doc.text(question.accuracyLabel, accuracyX + accuracyWidth + 3, y + 8.9);
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

    drawDistributionChips(doc, question, distributionX, chipY, distributionWidth);

    setTextColor(doc, COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.6);
    doc.text(`${question.distributionTotal}`, x + width - 4, y + 8.9, { align: "right" });

    return y + rowHeight + QUESTION_DISTRIBUTION_ROW_GAP;
};

const drawQuestionDistributionPageHeader = (doc: jsPDF, isFirstQuestionPage: boolean): number => {
    doc.addPage();
    let currentY = sectionTitle(
        doc,
        "Desempenho por questão",
        PAGE.contentTop,
        isFirstQuestionPage
            ? "Taxa de acerto por questão e percentual de respostas em cada alternativa. O gabarito é destacado em verde."
            : undefined,
    );
    if (isFirstQuestionPage) {
        currentY = drawDistributionLegend(doc, currentY);
    }
    return drawQuestionDistributionHeader(doc, currentY + 2);
};

const questionDistributionRowStep = (): number =>
    PDF_REPORT_THEME.chart.questionRowHeight + QUESTION_DISTRIBUTION_ROW_GAP;

const drawQuestionDistributionCharts = (doc: jsPDF, report: AssessmentOverviewReport): void => {
    if (report.questions.length === 0) {
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

    let currentY = drawQuestionDistributionPageHeader(doc, true);
    let pageRowIndex = 0;

    report.questions.forEach((question) => {
        const rowStep = questionDistributionRowStep();
        const hasSpace = hasSpaceForChartRow({
            y: currentY,
            rowHeight: rowStep,
            contentBottom: PAGE.contentBottom,
            bottomGuard: QUESTION_DISTRIBUTION_BOTTOM_GUARD,
        });

        if (!hasSpace && pageRowIndex > 0) {
            currentY = drawQuestionDistributionPageHeader(doc, false);
            pageRowIndex = 0;
        }

        currentY = drawQuestionDistributionRow(doc, question, currentY, pageRowIndex);
        pageRowIndex += 1;
    });
};

const studentClassificationColor = (key: ReportStudentClassificationKey): PdfColor => {
    const map: Record<ReportStudentClassificationKey, PdfColor> = {
        ABAIXO_BASICO: COLORS.error,
        BASICO: COLORS.warning,
        ADEQUADO: COLORS.info,
        AVANCADO: COLORS.success,
        SEM_RESPOSTA: COLORS.blank,
    };

    return map[key] ?? COLORS.blank;
};

const studentClassificationTextColor = (key: ReportStudentClassificationKey): PdfColor =>
    key === "BASICO" ? COLORS.primaryDark : COLORS.white;

const drawStudentClassificationPill = (doc: jsPDF, student: ReportStudentRow, x: number, y: number, width: number): void => {
    const color = studentClassificationColor(student.classificationKey);
    setFillColor(doc, color);
    setDrawColor(doc, COLORS.border);
    doc.roundedRect(x, y, width, 6.2, 1.4, 1.4, "FD");

    setTextColor(doc, studentClassificationTextColor(student.classificationKey));
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.3);
    const label = doc.splitTextToSize(student.classificationLabel, width - 4)[0] ?? student.classificationLabel;
    doc.text(label, x + width / 2, y + 4.2, { align: "center" });
};

const drawStudentPerformanceTableHeader = (doc: jsPDF, y: number): number => {
    const x = PAGE.marginX;
    const width = contentWidth(doc);

    drawColumnHeader(doc, "#", x + 4, y);
    drawColumnHeader(doc, "Aluno", x + 16, y);
    drawColumnHeader(doc, "Classificação", x + 104, y);
    drawColumnHeader(doc, "Desempenho", x + 154, y);
    drawColumnHeader(doc, "Corretas", x + width - 32, y);

    return y + 3;
};

const drawStudentPerformancePageHeader = (doc: jsPDF, isFirstStudentPage: boolean): number => {
    doc.addPage();
    const currentY = sectionTitle(
        doc,
        "Desempenho por aluno",
        PAGE.contentTop,
        isFirstStudentPage
            ? "Lista ordenada por desempenho, com classificação individual e quantidade de questões corretas."
            : undefined,
    );
    return drawStudentPerformanceTableHeader(doc, currentY + 2);
};

const drawStudentPerformanceRow = (doc: jsPDF, student: ReportStudentRow, y: number, pageRowIndex: number, rank: number): number => {
    const x = PAGE.marginX;
    const width = contentWidth(doc);
    const rowHeight = STUDENT_PERFORMANCE_ROW_HEIGHT;
    const fillColor = pageRowIndex % 2 === 0 ? COLORS.white : COLORS.surfaceVariant;
    const accentColor = studentClassificationColor(student.classificationKey);
    const nameX = x + 16;
    const classificationX = x + 104;
    const classificationWidth = 42;
    const barX = x + 154;
    const barWidth = 48;
    const percentX = barX + barWidth + 5;
    const correctX = x + width - 4;

    setFillColor(doc, fillColor);
    setDrawColor(doc, COLORS.border);
    doc.roundedRect(x, y, width, rowHeight, 1.4, 1.4, "FD");
    setFillColor(doc, accentColor);
    doc.rect(x, y, 1.5, rowHeight, "F");

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.text(String(rank), x + 4, y + 8.1);

    setTextColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    const name = doc.splitTextToSize(student.name, classificationX - nameX - 7)[0] ?? student.name;
    doc.text(name, nameX, y + 5.8);

    setTextColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.1);
    doc.text(`${student.answered} respondidas`, nameX, y + 11.1);

    drawStudentClassificationPill(doc, student, classificationX, y + 3.8, classificationWidth);

    drawProgressBar(doc, {
        x: barX,
        y: y + 4.9,
        width: barWidth,
        height: 4.4,
        ratio: student.percentValue,
        fillColor: accentColor,
        trackColor: COLORS.track,
        borderColor: COLORS.border,
    });

    setTextColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.text(student.percentLabel, percentX, y + 8.2);

    setTextColor(doc, COLORS.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(`${student.correctLabel} corretas`, correctX, y + 8.2, { align: "right" });

    return y + rowHeight + STUDENT_PERFORMANCE_ROW_GAP;
};

const drawStudentPerformanceSection = (doc: jsPDF, report: AssessmentOverviewReport): void => {
    let currentY = drawStudentPerformancePageHeader(doc, true);

    if (report.students.length === 0) {
        emptySectionMessage(doc, "Sem alunos para exibir neste relatório.", currentY);
        return;
    }

    let pageRowIndex = 0;
    report.students.forEach((student, index) => {
        const rowStep = STUDENT_PERFORMANCE_ROW_HEIGHT + STUDENT_PERFORMANCE_ROW_GAP;
        const hasSpace = hasSpaceForChartRow({
            y: currentY,
            rowHeight: rowStep,
            contentBottom: PAGE.contentBottom,
            bottomGuard: STUDENT_PERFORMANCE_BOTTOM_GUARD,
        });

        if (!hasSpace && pageRowIndex > 0) {
            currentY = drawStudentPerformancePageHeader(doc, false);
            pageRowIndex = 0;
        }

        currentY = drawStudentPerformanceRow(doc, student, currentY, pageRowIndex, index + 1);
        pageRowIndex += 1;
    });
};

export interface CreatedAssessmentOverviewPdf {
    doc: jsPDF;
    fileName: string;
}

export const createAssessmentOverviewPdf = (
    overview: AssessmentOverviewDTO,
    studentPerformance?: AssessmentOverviewStudentPerformanceInput,
): CreatedAssessmentOverviewPdf => {
    const report = buildAssessmentOverviewReport(overview, new Date(), studentPerformance);
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

    let y = drawTitlePage(doc, report);
    y = drawSummaryCards(doc, report, y);
    y = drawSkillsChart(doc, report, y);
    drawRankingComparison(doc, report, y);
    drawQuestionDistributionCharts(doc, report);
    drawStudentPerformanceSection(doc, report);
    drawPageDecorations(doc, report);

    return { doc, fileName: report.fileName };
};

export const exportAssessmentOverviewPdf = (
    overview: AssessmentOverviewDTO,
    studentPerformance?: AssessmentOverviewStudentPerformanceInput,
): void => {
    const { doc, fileName } = createAssessmentOverviewPdf(overview, studentPerformance);
    doc.save(fileName);
};
