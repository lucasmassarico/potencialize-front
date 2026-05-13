export function InsightGlyph(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M24 6c-7 0-12 5-12 11 0 4 2 7 5 10 1.2 1.2 2 2.6 2 4.2V34h10v-2.8c0-1.6.8-3 2-4.2 3-3 5-6 5-10 0-6-5-11-12-11z" />
            <path d="M19 38h10" />
            <path d="M21 42h6" />
            <path d="M24 14v10" opacity={0.6} />
            <path d="M20 20l4 4 4-4" opacity={0.6} />
        </svg>
    );
}
