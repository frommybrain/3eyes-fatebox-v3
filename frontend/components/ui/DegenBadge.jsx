'use client';

const variants = {
    default: {
        bg: 'bg-degen-container',
        text: 'text-degen-black',
        border: 'border-degen-black',
    },
    feature: {
        bg: 'bg-degen-feature',
        text: 'text-degen-white',
        border: 'border-degen-feature',
    },
    success: {
        bg: 'bg-degen-green',
        text: 'text-degen-black',
        border: 'border-degen-green',
    },
    warning: {
        bg: 'bg-degen-yellow',
        text: 'text-degen-black',
        border: 'border-degen-yellow',
    },
    danger: {
        bg: 'bg-degen-feature',
        text: 'text-degen-white',
        border: 'border-degen-feature',
    },
    blue: {
        bg: 'bg-degen-blue',
        text: 'text-degen-white',
        border: 'border-degen-blue',
    },
    magenta: {
        bg: 'bg-degen-magenta',
        text: 'text-degen-white',
        border: 'border-degen-magenta',
    },
    // Outline variants
    outlineDefault: {
        bg: 'bg-transparent',
        text: 'text-degen-black',
        border: 'border-degen-black',
    },
    outlineFeature: {
        bg: 'bg-transparent',
        text: 'text-degen-feature',
        border: 'border-degen-feature',
    },
    outlineBlue: {
        bg: 'bg-transparent',
        text: 'text-degen-blue',
        border: 'border-degen-blue',
    },
};

const sizes = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
};

export default function DegenBadge({
    children,
    variant = 'default',
    size = 'md',
    className = '',
    dot = false,
    ...props
}) {
    const variantStyles = variants[variant] || variants.default;
    const sizeStyles = sizes[size] || sizes.md;

    return (
        <span
            className={`
                inline-flex items-center justify-center gap-1.5
                font-medium uppercase tracking-wider
                border ${variantStyles.border}
                ${variantStyles.bg}
                ${variantStyles.text}
                ${sizeStyles}
                ${className}
            `}
            {...props}
        >
            {dot && (
                <span className={`w-1.5 h-1.5 ${variantStyles.text.replace('text-', 'bg-')}`} />
            )}
            {children}
        </span>
    );
}
