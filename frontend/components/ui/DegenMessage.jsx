'use client';

import { useState } from 'react';

const variants = {
    success: {
        bg: 'bg-degen-green',
        border: 'border-degen-black',
        text: 'text-degen-black',
        icon: '✓',
    },
    error: {
        bg: 'bg-degen-feature',
        border: 'border-degen-black',
        text: 'text-degen-white',
        icon: '✕',
    },
    warning: {
        bg: 'bg-degen-yellow',
        border: 'border-degen-black',
        text: 'text-degen-black',
        icon: '!',
    },
    info: {
        bg: 'bg-degen-blue',
        border: 'border-degen-black',
        text: 'text-degen-white',
        icon: 'i',
    },
    default: {
        bg: 'bg-degen-container',
        border: 'border-degen-black',
        text: 'text-degen-black',
        icon: '•',
    },
};

export default function DegenMessage({
    children,
    variant = 'default',
    title,
    icon,
    dismissible = false,
    onDismiss,
    className = '',
    ...props
}) {
    const [dismissed, setDismissed] = useState(false);
    const variantStyles = variants[variant] || variants.default;

    const handleDismiss = () => {
        setDismissed(true);
        onDismiss?.();
    };

    if (dismissed) return null;

    return (
        <div
            className={`
                flex items-start gap-3 p-3
                border ${variantStyles.border}
                ${variantStyles.bg}
                ${variantStyles.text}
                ${className}
            `}
            role="alert"
            {...props}
        >
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center font-bold text-sm">
                {icon || variantStyles.icon}
            </span>

            <div className="flex-1 min-w-0">
                {title && (
                    <p className="font-medium text-sm uppercase tracking-wider mb-1">{title}</p>
                )}
                <div className="text-sm">{children}</div>
            </div>

            {dismissible && (
                <button
                    onClick={handleDismiss}
                    className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                    aria-label="Dismiss"
                >
                    ×
                </button>
            )}
        </div>
    );
}

export function DegenSuccessMessage({ children, ...props }) {
    return <DegenMessage variant="success" {...props}>{children}</DegenMessage>;
}

export function DegenErrorMessage({ children, ...props }) {
    return <DegenMessage variant="error" {...props}>{children}</DegenMessage>;
}

export function DegenWarningMessage({ children, ...props }) {
    return <DegenMessage variant="warning" {...props}>{children}</DegenMessage>;
}

export function DegenInfoMessage({ children, ...props }) {
    return <DegenMessage variant="info" {...props}>{children}</DegenMessage>;
}
