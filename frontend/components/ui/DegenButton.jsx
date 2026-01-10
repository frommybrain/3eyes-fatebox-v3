'use client';

import Link from 'next/link';

const variants = {
    primary: {
        bg: 'bg-degen-black',
        text: 'text-degen-white',
        hoverBg: 'hover:bg-degen-feature',
        border: 'border-degen-black',
    },
    secondary: {
        bg: 'bg-degen-white',
        text: 'text-degen-black',
        hoverBg: 'hover:bg-degen-bg',
        border: 'border-degen-black',
    },
    ghost: {
        bg: 'bg-transparent',
        text: 'text-degen-black',
        hoverBg: 'hover:bg-degen-black hover:text-degen-white',
        border: 'border-transparent',
    },
    outline: {
        bg: 'bg-transparent',
        text: 'text-degen-black',
        hoverBg: 'hover:bg-degen-black hover:text-degen-white',
        border: 'border-degen-black',
    },
    feature: {
        bg: 'bg-degen-feature',
        text: 'text-degen-white',
        hoverBg: 'hover:bg-degen-black',
        border: 'border-degen-feature',
    },
    blue: {
        bg: 'bg-degen-blue',
        text: 'text-degen-white',
        hoverBg: 'hover:bg-degen-black',
        border: 'border-degen-blue',
    },
    success: {
        bg: 'bg-degen-black',
        text: 'text-degen-green',
        hoverBg: 'hover:bg-degen-green hover:text-degen-black',
        border: 'border-degen-black',
    },
    warning: {
        bg: 'bg-degen-yellow',
        text: 'text-degen-black',
        hoverBg: 'hover:bg-degen-black hover:text-degen-yellow',
        border: 'border-degen-black',
    },
};

const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
};

export default function DegenButton({
    children,
    variant = 'primary',
    size = 'md',
    href,
    onClick,
    disabled = false,
    className = '',
    type = 'button',
    fullWidth = false,
    ...props
}) {
    const variantStyles = variants[variant] || variants.primary;
    const sizeStyles = sizes[size] || sizes.md;

    const baseStyles = `
        inline-flex items-center justify-center
        font-medium uppercase tracking-wider
        border ${variantStyles.border}
        transition-colors duration-100
        disabled:opacity-50
        disabled:cursor-not-allowed
        ${fullWidth ? 'w-full' : ''}
    `;

    const combinedClassName = `
        ${baseStyles}
        ${variantStyles.bg}
        ${variantStyles.text}
        ${variantStyles.hoverBg}
        ${sizeStyles}
        ${className}
    `.trim();

    if (href) {
        return (
            <Link href={href} className={combinedClassName} {...props}>
                {children}
            </Link>
        );
    }

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={combinedClassName}
            {...props}
        >
            {children}
        </button>
    );
}
