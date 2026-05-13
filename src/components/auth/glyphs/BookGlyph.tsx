export function BookGlyph(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M8 10c4-1.5 9-1.5 14 1v28c-5-2.5-10-2.5-14-1V10z" />
            <path d="M40 10c-4-1.5-9-1.5-14 1v28c5-2.5 10-2.5 14-1V10z" />
            <path d="M22 11v28" />
            <path d="M12 16l6 .8M12 22l6 .8M12 28l6 .8" />
            <path d="M36 16l-6 .8M36 22l-6 .8M36 28l-6 .8" />
        </svg>
    );
}
