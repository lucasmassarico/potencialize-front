import { describe, expect, it, vi } from "vitest";
import type { jsPDF } from "jspdf";

import {
    chunkChartRows,
    drawProgressBar,
    drawStackedBar,
    hasSpaceForChartRow,
    normalizeRatio,
    toStackedSegments,
    type PdfColor,
} from "./pdfChartPrimitives";

interface DocSpyCalls {
    operations: string[];
}

const createDocSpy = () => {
    const calls: DocSpyCalls = { operations: [] };
    const doc = {
        saveGraphicsState: vi.fn(() => calls.operations.push("save")),
        restoreGraphicsState: vi.fn(() => calls.operations.push("restore")),
        clip: vi.fn(() => calls.operations.push("clip")),
        discardPath: vi.fn(() => calls.operations.push("discardPath")),
        roundedRect: vi.fn((_x, _y, _w, _h, _rx, _ry, style?: string | null) => {
            const styleTag = style === null ? "null" : style === undefined ? "default" : style;
            calls.operations.push(`roundedRect:${styleTag}`);
        }),
        rect: vi.fn((_x, _y, _w, _h, style: string) => calls.operations.push(`rect:${style}`)),
        setFillColor: vi.fn(() => {}),
        setDrawColor: vi.fn(() => {}),
    } as unknown as jsPDF;

    return { doc, calls };
};

const fill: PdfColor = [10, 20, 30];
const track: PdfColor = [200, 200, 200];
const border: PdfColor = [50, 50, 50];

describe("pdf chart primitives", () => {
    it("normalizes ratios to the supported chart range", () => {
        expect(normalizeRatio(-0.2)).toBe(0);
        expect(normalizeRatio(0.625)).toBe(0.625);
        expect(normalizeRatio(1.4)).toBe(1);
        expect(normalizeRatio(Number.NaN)).toBe(0);
    });

    it("creates stacked segments with stable start and width ratios", () => {
        const segments = toStackedSegments([
            { label: "A", count: 3 },
            { label: "B", count: 1 },
            { label: "Branco", count: 0 },
        ]);

        expect(segments).toEqual([
            { label: "A", count: 3, startRatio: 0, widthRatio: 0.75 },
            { label: "B", count: 1, startRatio: 0.75, widthRatio: 0.25 },
            { label: "Branco", count: 0, startRatio: 1, widthRatio: 0 },
        ]);
    });

    it("chunks chart rows without dropping items", () => {
        expect(chunkChartRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
        expect(chunkChartRows([1, 2], 0)).toEqual([[1], [2]]);
    });

    it("checks row space with a bottom guard before drawing near the footer", () => {
        expect(hasSpaceForChartRow({ y: 168.5, rowHeight: 17.5, contentBottom: 190, bottomGuard: 4 })).toBe(true);
        expect(hasSpaceForChartRow({ y: 170, rowHeight: 17.5, contentBottom: 190, bottomGuard: 4 })).toBe(false);
    });

    it("clips the progress bar fill within the rounded track so corners stay clean", () => {
        const { doc, calls } = createDocSpy();

        drawProgressBar(doc, {
            x: 10,
            y: 20,
            width: 50,
            height: 5,
            ratio: 0.6,
            fillColor: fill,
            trackColor: track,
            borderColor: border,
        });

        const trackIndex = calls.operations.indexOf("roundedRect:F");
        const saveIndex = calls.operations.indexOf("save");
        const clipPathIndex = calls.operations.indexOf("roundedRect:null");
        const clipIndex = calls.operations.indexOf("clip");
        const discardIndex = calls.operations.indexOf("discardPath");
        const fillIndex = calls.operations.indexOf("rect:F");
        const restoreIndex = calls.operations.indexOf("restore");
        const strokeIndex = calls.operations.indexOf("roundedRect:S");

        expect(trackIndex).toBeGreaterThanOrEqual(0);
        expect(saveIndex).toBeGreaterThan(trackIndex);
        expect(clipPathIndex).toBeGreaterThan(saveIndex);
        expect(clipIndex).toBeGreaterThan(clipPathIndex);
        expect(discardIndex).toBeGreaterThan(clipIndex);
        expect(fillIndex).toBeGreaterThan(discardIndex);
        expect(restoreIndex).toBeGreaterThan(fillIndex);
        expect(strokeIndex).toBeGreaterThan(restoreIndex);
        expect(calls.operations).not.toContain("roundedRect:default");
    });

    it("skips the clipped fill draw when the progress ratio is zero", () => {
        const { doc, calls } = createDocSpy();

        drawProgressBar(doc, {
            x: 0,
            y: 0,
            width: 30,
            height: 4,
            ratio: 0,
            fillColor: fill,
            trackColor: track,
        });

        expect(calls.operations).not.toContain("save");
        expect(calls.operations).not.toContain("clip");
        expect(calls.operations).not.toContain("rect:F");
    });

    it("clips stacked bar segments inside the rounded track", () => {
        const { doc, calls } = createDocSpy();
        const segments = toStackedSegments([
            { count: 4 },
            { count: 6 },
        ]).map((segment) => ({ ...segment, color: fill }));

        drawStackedBar(doc, {
            x: 0,
            y: 0,
            width: 40,
            height: 5,
            segments,
            trackColor: track,
            borderColor: border,
        });

        const saveIndex = calls.operations.indexOf("save");
        const clipPathIndex = calls.operations.indexOf("roundedRect:null");
        const clipIndex = calls.operations.indexOf("clip");
        const discardIndex = calls.operations.indexOf("discardPath");
        const firstSegmentIndex = calls.operations.indexOf("rect:F");
        const restoreIndex = calls.operations.indexOf("restore");

        expect(saveIndex).toBeGreaterThanOrEqual(0);
        expect(clipPathIndex).toBeGreaterThan(saveIndex);
        expect(clipIndex).toBeGreaterThan(clipPathIndex);
        expect(discardIndex).toBeGreaterThan(clipIndex);
        expect(firstSegmentIndex).toBeGreaterThan(discardIndex);
        expect(restoreIndex).toBeGreaterThan(firstSegmentIndex);
        expect(calls.operations).not.toContain("roundedRect:default");
    });
});
