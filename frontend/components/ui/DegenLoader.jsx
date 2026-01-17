'use client';

const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-10 h-10',
};

export default function DegenLoader({ size = 'md', className = '' }) {
    const sizeStyles = sizes[size] || sizes.md;

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <div
                className={`
                    ${sizeStyles}
                    border-2 border-degen-black
                    animate-spin
                `}
            />
        </div>
    );
}

export function DegenLoadingState({
    icon = null,
    text = 'LOADING',
    size = 'md',
    className = '',
}) {
    return (
        <div className={`flex flex-col items-center justify-center py-8 ${className}`}>
            {icon ? (
                <div className="text-3xl mb-3 animate-pulse">{icon}</div>
            ) : (
                <DegenLoader size={size} className="mb-3" />
            )}
            <p className="text-degen-black text-sm font-medium uppercase tracking-wider">{text}</p>
        </div>
    );
}
