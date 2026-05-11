import type { jsPDF } from "jspdf";

export type PdfColor = [number, number, number];

export interface CountedChartItem {
    count: number;
}

export type StackedChartSegment<T extends CountedChartItem> = T & {
    startRatio: number;
    widthRatio: number;
};

interface ProgressBarOptions {
    x: number;
    y: number;
    width: number;
    height: number;
    ratio: number;
    fillColor: PdfColor;
    trackColor: PdfColor;
    borderColor?: PdfColor;
}

interface StackedBarOptions<T extends CountedChartItem> {
    x: number;
    y: number;
    width: number;
    height: number;
    segments: Array<StackedChartSegment<T> & { color: PdfColor; borderColor?: PdfColor }>;
    trackColor: PdfColor;
    borderColor?: PdfColor;
}

interface ChartRowSpaceOptions {
    y: number;
    rowHeight: number;
    contentBottom: number;
    bottomGuard?: number;
}

const setFillColor = (doc: jsPDF, color: PdfColor): void => {
    doc.setFillColor(color[0], color[1], color[2]);
};

const setDrawColor = (doc: jsPDF, color: PdfColor): void => {
    doc.setDrawColor(color[0], color[1], color[2]);
};

const safeCount = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

export const normalizeRatio = (value: number): number => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(1, value));
};

export const toStackedSegments = <T extends CountedChartItem>(
    items: readonly T[],
    explicitTotal?: number,
): Array<StackedChartSegment<T>> => {
    const total = explicitTotal ?? items.reduce((sum, item) => sum + safeCount(item.count), 0);
    const denominator = safeCount(total);
    let cursor = 0;

    return items.map((item) => {
        const widthRatio = denominator > 0 ? normalizeRatio(safeCount(item.count) / denominator) : 0;
        const segment = {
            ...item,
            startRatio: cursor,
            widthRatio,
        };
        cursor = normalizeRatio(cursor + widthRatio);
        return segment;
    });
};

export const chunkChartRows = <T>(items: readonly T[], maxRowsPerChunk: number): T[][] => {
    const chunkSize = Math.max(1, Math.floor(maxRowsPerChunk));
    const chunks: T[][] = [];

    for (let index = 0; index < items.length; index += chunkSize) {
        chunks.push(items.slice(index, index + chunkSize));
    }

    return chunks;
};

export const hasSpaceForChartRow = ({ y, rowHeight, contentBottom, bottomGuard = 0 }: ChartRowSpaceOptions): boolean =>
    y + rowHeight <= contentBottom - bottomGuard;

export const drawProgressBar = (doc: jsPDF, options: ProgressBarOptions): void => {
    const { x, y, width, height, ratio, fillColor, trackColor, borderColor } = options;
    const fillWidth = width * normalizeRatio(ratio);

    setFillColor(doc, trackColor);
    if (borderColor) setDrawColor(doc, borderColor);
    doc.roundedRect(x, y, width, height, 1.2, 1.2, borderColor ? "FD" : "F");

    if (fillWidth > 0) {
        setFillColor(doc, fillColor);
        doc.rect(x, y, fillWidth, height, "F");
    }

    if (borderColor) {
        setDrawColor(doc, borderColor);
        doc.roundedRect(x, y, width, height, 1.2, 1.2, "S");
    }
};

export const drawStackedBar = <T extends CountedChartItem>(doc: jsPDF, options: StackedBarOptions<T>): void => {
    const { x, y, width, height, segments, trackColor, borderColor } = options;

    setFillColor(doc, trackColor);
    if (borderColor) setDrawColor(doc, borderColor);
    doc.roundedRect(x, y, width, height, 1.2, 1.2, borderColor ? "FD" : "F");

    segments.forEach((segment) => {
        const segmentWidth = width * segment.widthRatio;
        if (segmentWidth <= 0) return;

        setFillColor(doc, segment.color);
        doc.rect(x + width * segment.startRatio, y, segmentWidth, height, "F");

        if (segment.borderColor && segmentWidth >= 1.5) {
            setDrawColor(doc, segment.borderColor);
            doc.rect(x + width * segment.startRatio, y, segmentWidth, height, "S");
        }
    });

    if (borderColor) {
        setDrawColor(doc, borderColor);
        doc.roundedRect(x, y, width, height, 1.2, 1.2, "S");
    }
};
