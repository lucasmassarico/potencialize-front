import { Box, GlobalStyles } from "@mui/material";
import { ConstellationCanvas } from "./ConstellationCanvas";
import { BookGlyph } from "./glyphs/BookGlyph";
import { ChartGlyph } from "./glyphs/ChartGlyph";
import { StudentsGlyph } from "./glyphs/StudentsGlyph";
import { InsightGlyph } from "./glyphs/InsightGlyph";

const globalKeyframes = (
    <GlobalStyles
        styles={{
            "@keyframes pz-drift-a": {
                "0%": { transform: "translate3d(-8%, -4%, 0) scale(1)" },
                "50%": { transform: "translate3d(6%, 4%, 0) scale(1.08)" },
                "100%": { transform: "translate3d(-8%, -4%, 0) scale(1)" },
            },
            "@keyframes pz-drift-b": {
                "0%": { transform: "translate3d(6%, 4%, 0) scale(1)" },
                "50%": { transform: "translate3d(-4%, -6%, 0) scale(1.12)" },
                "100%": { transform: "translate3d(6%, 4%, 0) scale(1)" },
            },
            "@keyframes pz-float-book": {
                "0%": { transform: "translate3d(0,0,0) rotate(-2deg)" },
                "50%": { transform: "translate3d(4px,-10px,0) rotate(2deg)" },
                "100%": { transform: "translate3d(0,0,0) rotate(-2deg)" },
            },
            "@keyframes pz-float-soft": {
                "0%": { transform: "translate3d(0,0,0)" },
                "50%": { transform: "translate3d(-6px,-8px,0)" },
                "100%": { transform: "translate3d(0,0,0)" },
            },
            "@keyframes pz-float-tilt": {
                "0%": { transform: "translate3d(0,0,0) rotate(0deg)" },
                "50%": { transform: "translate3d(8px,-6px,0) rotate(3deg)" },
                "100%": { transform: "translate3d(0,0,0) rotate(0deg)" },
            },
            "@keyframes pz-float-slow": {
                "0%": { transform: "translate3d(0,0,0)" },
                "50%": { transform: "translate3d(-4px,-12px,0)" },
                "100%": { transform: "translate3d(0,0,0)" },
            },
        }}
    />
);

const glyphBase = {
    position: "absolute" as const,
    color: "rgba(200,220,255,0.22)",
    pointerEvents: "none" as const,
    filter: "drop-shadow(0 0 12px rgba(120,160,255,0.18))",
};

export function LoginBackdrop() {
    return (
        <Box
            aria-hidden
            sx={{
                position: "absolute",
                inset: 0,
                overflow: "hidden",
                background: "linear-gradient(135deg, #0A1535 0%, #102351 55%, #152A5C 100%)",
                zIndex: 0,
            }}
        >
            {globalKeyframes}

            <Box
                sx={{
                    position: "absolute",
                    top: "-12%",
                    right: "-10%",
                    width: "55%",
                    height: "55%",
                    background: "radial-gradient(circle at 50% 50%, rgba(99,140,255,0.28) 0%, rgba(99,140,255,0) 60%)",
                    filter: "blur(20px)",
                    animation: "pz-drift-a 22s ease-in-out infinite",
                    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                }}
            />

            <Box
                sx={{
                    position: "absolute",
                    bottom: "-15%",
                    left: "-8%",
                    width: "50%",
                    height: "50%",
                    background: "radial-gradient(circle at 50% 50%, rgba(255,178,107,0.22) 0%, rgba(255,178,107,0) 60%)",
                    filter: "blur(24px)",
                    animation: "pz-drift-b 28s ease-in-out infinite",
                    "@media (prefers-reduced-motion: reduce)": { animation: "none" },
                }}
            />

            <ConstellationCanvas />

            <BookGlyph
                style={{
                    ...glyphBase,
                    top: "18%",
                    left: "8%",
                    width: 72,
                    height: 72,
                    animation: "pz-float-book 9s ease-in-out infinite",
                }}
            />
            <ChartGlyph
                style={{
                    ...glyphBase,
                    top: "12%",
                    right: "22%",
                    width: 64,
                    height: 64,
                    animation: "pz-float-soft 11s ease-in-out infinite",
                }}
            />
            <StudentsGlyph
                style={{
                    ...glyphBase,
                    bottom: "22%",
                    left: "14%",
                    width: 68,
                    height: 68,
                    animation: "pz-float-tilt 13s ease-in-out infinite",
                }}
            />
            <InsightGlyph
                style={{
                    ...glyphBase,
                    bottom: "16%",
                    right: "10%",
                    width: 60,
                    height: 60,
                    animation: "pz-float-slow 15s ease-in-out infinite",
                }}
            />

            <Box
                sx={{
                    position: "absolute",
                    inset: 0,
                    background: "radial-gradient(ellipse at 75% 50%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.35) 100%)",
                    pointerEvents: "none",
                }}
            />
        </Box>
    );
}
