import { describe, expect, it } from "vitest";

import { accuracyColor, hexToPdfColor, PDF_REPORT_THEME, skillLevelColor } from "./pdfReportTheme";

describe("pdf report theme", () => {
    it("converts hex colors into jsPDF rgb tuples", () => {
        expect(hexToPdfColor("#3F51B5")).toEqual([63, 81, 181]);
        expect(hexToPdfColor("#fff")).toEqual([255, 255, 255]);
    });

    it("uses the app primary token instead of the old ad-hoc blue", () => {
        expect(PDF_REPORT_THEME.colors.primary).toEqual([63, 81, 181]);
        expect(PDF_REPORT_THEME.colors.primary).not.toEqual([37, 99, 235]);
    });

    it("maps skill levels to distinct semantic colors", () => {
        const colors = [
            skillLevelColor("abaixo"),
            skillLevelColor("basico"),
            skillLevelColor("adequado"),
            skillLevelColor("avancado"),
        ];

        expect(new Set(colors.map((color) => color.join(","))).size).toBe(4);
    });

    it("keeps accuracy thresholds aligned with report semantics", () => {
        expect(accuracyColor(0.49)).toEqual(PDF_REPORT_THEME.colors.error);
        expect(accuracyColor(0.5)).toEqual(PDF_REPORT_THEME.colors.warning);
        expect(accuracyColor(0.7)).toEqual(PDF_REPORT_THEME.colors.success);
    });
});
