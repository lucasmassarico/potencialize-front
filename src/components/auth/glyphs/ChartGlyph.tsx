export function ChartGlyph(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M8 40h32" />
            <rect x="12" y="24" width="5" height="14" rx="1" />
            <rect x="21.5" y="16" width="5" height="22" rx="1" />
            <rect x="31" y="28" width="5" height="10" rx="1" />
            <path d="M10 12l6 4 5-3 8 5 9-7" opacity={0.55} />
        </svg>
    );
}
