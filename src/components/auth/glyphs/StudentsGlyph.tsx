export function StudentsGlyph(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <circle cx="24" cy="16" r="5" />
            <path d="M14 36c1-5 5-8 10-8s9 3 10 8" />
            <circle cx="10" cy="20" r="3.5" opacity={0.7} />
            <path d="M4 34c.7-3.4 3.2-5.5 6.5-5.5" opacity={0.7} />
            <circle cx="38" cy="20" r="3.5" opacity={0.7} />
            <path d="M44 34c-.7-3.4-3.2-5.5-6.5-5.5" opacity={0.7} />
        </svg>
    );
}
