import Link from 'next/link';

export default function ButtonPlain({ text = "", link, arrow = false }) {
    const content = (
        <span className="relative inline-flex items-center gap-1 py-1 px-4 cursor-pointer">
            <span className="relative text-sm font-medium text-white">
                {text}
                <span className="absolute bottom-0 left-0 h-[1px] w-full origin-left scale-x-0 bg-white/60 transition-transform duration-300 ease-out group-hover:scale-x-100" />
            </span>
            {arrow && (
                <span className="relative flex h-4 w-4 overflow-hidden">
                    {/* Primary Arrow */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="absolute left-0 top-0 text-white transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-full"
                    >
                        <path d="M7 7h10v10" />
                        <path d="M7 17 17 7" />
                    </svg>
                    {/* Duplicate Arrow (slides up from bottom) */}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="absolute left-0 top-full text-white transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] group-hover:-translate-y-full"
                    >
                        <path d="M7 7h10v10" />
                        <path d="M7 17 17 7" />
                    </svg>
                </span>
            )}
        </span>
    );

    const styles = "group relative inline-flex items-center justify-center bg-transparent transition-colors";

    if (link) {
        return (
            <Link href={link} className={styles}>
                {content}
            </Link>
        );
    }

    return (
        <button className={styles} type="button">
            {content}
        </button>
    );
}

