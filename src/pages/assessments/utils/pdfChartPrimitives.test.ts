import { describe, expect, it } from "vitest";

import { chunkChartRows, normalizeRatio, toStackedSegments } from "./pdfChartPrimitives";

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
});
