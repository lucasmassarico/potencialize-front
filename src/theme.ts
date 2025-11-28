// src/theme.ts
import { createTheme } from "@mui/material/styles";
import tokens from "./design/tokens.json" assert { type: "json" };
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";

const t = tokens as any;

const resolve = (path: string, mode: "light" | "dark") => {
    if (!path || !path.startsWith("{")) return path;
    const keys = path.slice(1, -1).split(".");
    let cur: any = t.modes[mode];
    for (const k of keys) cur = cur?.[k];
    return cur ?? path;
};

const toPalette = (mode: "light" | "dark") => {
    const c = t.modes[mode].color;
    return {
        mode,
        primary: { main: c.primary["40"], light: c.primary["60"], dark: c.primary["60"], contrastText: "#fff" },
        secondary: { main: c.secondary["60"], light: c.secondary["70"], dark: c.secondary["40"], contrastText: "#111" },
        error: { main: c.status.error.main, contrastText: c.status.error.on },
        warning: { main: c.status.warning.main, contrastText: c.status.warning.on },
        info: { main: c.status.info.main, contrastText: c.status.info.on },
        success: { main: c.status.success.main, contrastText: c.status.success.on },
        text: {
            primary: c.roles.onSurface,
            secondary: t.modes[mode].color.neutral["50"],
            disabled: `rgba(26,27,30, ${t.modes[mode].opacity.disabled})`,
        },
        background: {
            default: c.roles.surface,
            paper: c.roles.surface,
        },
        divider: c.roles.outline,
        contrastThreshold: 3,
        tonalOffset: 0.12,
    } as const;
};

const asStack = (v: string | string[]) => (Array.isArray(v) ? v.join(",") : v);
const toTypography = (mode: "light" | "dark") => {
    const ty = t.modes[mode].type;
    const baseFamily = asStack(ty.display.family ?? "Inter");
    const fallback = ["Roboto", "system-ui", "-apple-system", '"Segoe UI"', "Helvetica", "Arial", "sans-serif"].join(",");

    return {
        fontFamily: [baseFamily, fallback].join(","),
        h1: { fontSize: ty.h1.size, lineHeight: ty.h1.lineHeight, fontWeight: ty.h1.weight },
        h2: { fontSize: ty.h2.size, lineHeight: ty.h2.lineHeight, fontWeight: ty.h2.weight },
        h3: { fontSize: ty.h3.size, lineHeight: ty.h3.lineHeight, fontWeight: ty.h3.weight },
        h4: { fontSize: ty.h4.size, lineHeight: ty.h4.lineHeight, fontWeight: ty.h4.weight },
        h5: { fontSize: ty.h5.size, lineHeight: ty.h5.lineHeight, fontWeight: ty.h5.weight },
        h6: { fontSize: ty.h6.size, lineHeight: ty.h6.lineHeight, fontWeight: ty.h6.weight },
        body1: { fontSize: ty.body.size, lineHeight: ty.body.lineHeight, fontWeight: 400 },
        body2: { fontSize: 13, lineHeight: 1.6, fontWeight: 400 },
        button: { fontWeight: 600, letterSpacing: "0.2px" },
        caption: { fontSize: 12, lineHeight: 1.4 },
    };
};

const focusRing = (mode: "light" | "dark") => ({
    outline: `${t.modes[mode].states.focusRing.width}px solid ${resolve(t.modes[mode].states.focusRing.color, mode)}`,
    outlineOffset: `${t.modes[mode].states.focusRing.offset}px`,
});

// 🔒 Tema fixo em LIGHT
export const theme = createTheme({
    palette: toPalette("light"),
    shape: { borderRadius: t.modes.light.radius.sm },
    typography: toTypography("light"),
    components: {
        MuiCssBaseline: {
            styleOverrides: () => ({
                "*, *::before, *::after": { boxSizing: "border-box" },
                html: { WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" },
                body: {
                    backgroundColor: t.modes.light.color.roles.surface,
                    color: t.modes.light.color.roles.onSurface,
                },
                "::selection": { background: resolve(t.modes.light.color.roles.selectionBg, "light") },
                "@media (prefers-reduced-motion: reduce)": {
                    "*": { animation: "none !important", transition: "none !important", scrollBehavior: "auto !important" },
                },
                input: {
                    "&:-webkit-autofill": {
                        WebkitBoxShadow: "0 0 0 1000px transparent inset !important",
                        WebkitTextFillColor: "inherit !important",
                        transition: "background-color 5000s ease-in-out 0s !important",
                        caretColor: "inherit !important",
                    },
                },
                '[data-clickable-row="true"]': {
                    cursor: "pointer",
                    "&:focus-visible": {
                        outline: `2px solid ${t.modes.light.color.roles.focus}`,
                        outlineOffset: 2,
                    },
                },
            }),
        },
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
                root: ({}) => ({
                    borderRadius: t.modes.light.radius.sm,
                    fontWeight: 600,
                    textTransform: "none",
                    "&.Mui-focusVisible": focusRing("light"),
                    "&:focus-visible": focusRing("light"),
                }),
                containedPrimary: ({ theme }) => ({
                    backgroundColor: t.modes.light.color.primary["30"],
                    color: "#fff",
                    "&:hover": {
                        backgroundColor: t.modes.light.color.primary["20"],
                        boxShadow: t.modes.light.shadow.md,
                    },
                    "&.Mui-disabled": { color: theme.palette.action.disabled },
                }),
            },
        },
        MuiFormControlLabel: {
            styleOverrides: {
                label: ({ theme }) => ({ color: theme.palette.primary.main }),
            },
        },
        MuiTextField: { defaultProps: { variant: "outlined", fullWidth: true } },
        MuiOutlinedInput: {
            styleOverrides: {
                root: ({ theme }) => ({
                    borderRadius: theme.shape.borderRadius,
                    "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.primary.main },
                    "&.Mui-focused": { outline: "none" },
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: theme.palette.primary.main, borderWidth: 1 },
                }),
                notchedOutline: ({ theme }) => ({ borderColor: theme.palette.divider }),
            },
        },
        MuiCard: {
            styleOverrides: {
                root: ({ theme }) => ({
                    borderRadius: t.modes.light.radius.md,
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: t.modes.light.shadow.md,
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                }),
            },
        },
        MuiAlert: {
            styleOverrides: {
                root: ({ theme }) => ({ borderLeft: `4px solid ${theme.palette.primary.main}` }),
            },
        },
        MuiLink: {
            styleOverrides: {
                root: ({ theme }) => ({
                    color: theme.palette.primary.main,
                    textDecorationColor: theme.palette.primary.main,
                    textUnderlineOffset: "2px",
                    "&:hover": { textDecorationThickness: "2px" },
                    "&:focus-visible": focusRing("light"),
                }),
            },
        },
        MuiTooltip: {
            styleOverrides: { tooltip: () => ({ fontSize: 12, background: t.modes.light.color.neutral["20"] }) },
        },
        MuiSnackbar: { defaultProps: { anchorOrigin: { vertical: "bottom", horizontal: "center" } } },
    },
});

export type AppTheme = typeof theme;
export default theme;
