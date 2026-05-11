import type { SkillLevel } from "../../../types/assessments";
import tokens from "../../../design/tokens.json" assert { type: "json" };
import type { PdfColor } from "./pdfChartPrimitives";

interface StatusToken {
    main: string;
    container: string;
}

interface LightTokenMode {
    color: {
        primary: Record<string, string>;
        secondary: Record<string, string>;
        neutral: Record<string, string>;
        status: {
            success: StatusToken;
            warning: StatusToken;
            error: StatusToken;
            info: StatusToken;
        };
        roles: Record<string, string>;
    };
}

const lightTokens = (tokens as { modes: { light: LightTokenMode } }).modes.light;

export const hexToPdfColor = (hex: string): PdfColor => {
    const normalized = hex.replace("#", "").trim();
    const expanded =
        normalized.length === 3
            ? normalized
                  .split("")
                  .map((char) => `${char}${char}`)
                  .join("")
            : normalized;

    if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
        throw new Error(`Unsupported PDF color: ${hex}`);
    }

    return [
        Number.parseInt(expanded.slice(0, 2), 16),
        Number.parseInt(expanded.slice(2, 4), 16),
        Number.parseInt(expanded.slice(4, 6), 16),
    ];
};

const colors = lightTokens.color;

export const PDF_REPORT_THEME = {
    colors: {
        primary: hexToPdfColor(colors.primary["40"]),
        primaryDark: hexToPdfColor(colors.primary["30"]),
        primarySoft: hexToPdfColor(colors.primary["95"]),
        secondary: hexToPdfColor(colors.secondary["60"]),
        secondarySoft: hexToPdfColor(colors.secondary["95"]),
        text: hexToPdfColor(colors.neutral["10"]),
        muted: hexToPdfColor(colors.neutral["50"]),
        subtleText: hexToPdfColor(colors.neutral["60"]),
        border: hexToPdfColor(colors.roles.outlineVariant),
        borderStrong: hexToPdfColor(colors.roles.outline),
        surface: hexToPdfColor(colors.roles.surface),
        surfaceVariant: hexToPdfColor(colors.roles.surfaceVariant),
        track: hexToPdfColor(colors.neutral["95"]),
        grid: hexToPdfColor(colors.neutral["90"]),
        blank: hexToPdfColor(colors.neutral["70"]),
        white: hexToPdfColor(colors.neutral["100"]),
        success: hexToPdfColor(colors.status.success.main),
        successSoft: hexToPdfColor(colors.status.success.container),
        warning: hexToPdfColor(colors.status.warning.main),
        warningSoft: hexToPdfColor(colors.status.warning.container),
        error: hexToPdfColor(colors.status.error.main),
        errorSoft: hexToPdfColor(colors.status.error.container),
        info: hexToPdfColor(colors.status.info.main),
        infoSoft: hexToPdfColor(colors.status.info.container),
        optionA: hexToPdfColor(colors.primary["50"]),
        optionB: hexToPdfColor(colors.secondary["60"]),
        optionC: hexToPdfColor(colors.status.info.main),
        optionD: hexToPdfColor(colors.primary["70"]),
        optionE: hexToPdfColor(colors.secondary["80"]),
    },
    chart: {
        axisTicks: [0, 0.25, 0.5, 0.75, 1],
        barRadius: 1.2,
        compactRowHeight: 10,
        questionRowHeight: 16,
    },
} as const;

export const skillLevelColor = (level: SkillLevel): PdfColor => {
    const map: Record<SkillLevel, PdfColor> = {
        abaixo: PDF_REPORT_THEME.colors.error,
        basico: PDF_REPORT_THEME.colors.warning,
        adequado: PDF_REPORT_THEME.colors.info,
        avancado: PDF_REPORT_THEME.colors.success,
    };

    return map[level];
};

export const accuracyColor = (value: number): PdfColor => {
    if (value < 0.5) return PDF_REPORT_THEME.colors.error;
    if (value < 0.7) return PDF_REPORT_THEME.colors.warning;
    return PDF_REPORT_THEME.colors.success;
};
