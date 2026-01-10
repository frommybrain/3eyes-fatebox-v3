'use client';

import { forwardRef } from 'react';

const DegenInput = forwardRef(function DegenInput({
    label,
    error,
    hint,
    className = '',
    type = 'text',
    ...props
}, ref) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-degen-black font-medium text-sm uppercase tracking-wider mb-2">
                    {label}
                </label>
            )}
            <input
                ref={ref}
                type={type}
                className={`
                    w-full
                    px-3 py-2
                    bg-degen-white
                    text-degen-black
                    placeholder:text-degen-text-muted
                    border border-degen-black
                    outline-none
                    transition-colors duration-100
                    focus:bg-degen-container
                    ${error ? 'border-degen-feature bg-degen-feature/5' : ''}
                    ${className}
                `}
                {...props}
            />
            {hint && !error && (
                <p className="mt-1 text-xs text-degen-text-muted">
                    {hint}
                </p>
            )}
            {error && (
                <p className="mt-1 text-sm text-degen-feature font-medium">
                    {error}
                </p>
            )}
        </div>
    );
});

export default DegenInput;

export const DegenTextarea = forwardRef(function DegenTextarea({
    label,
    error,
    hint,
    className = '',
    rows = 4,
    ...props
}, ref) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-degen-black font-medium text-sm uppercase tracking-wider mb-2">
                    {label}
                </label>
            )}
            <textarea
                ref={ref}
                rows={rows}
                className={`
                    w-full
                    px-3 py-2
                    bg-degen-white
                    text-degen-black
                    placeholder:text-degen-text-muted
                    border border-degen-black
                    outline-none
                    transition-colors duration-100
                    focus:bg-degen-container
                    resize-none
                    ${error ? 'border-degen-feature bg-degen-feature/5' : ''}
                    ${className}
                `}
                {...props}
            />
            {hint && !error && (
                <p className="mt-1 text-xs text-degen-text-muted">
                    {hint}
                </p>
            )}
            {error && (
                <p className="mt-1 text-sm text-degen-feature font-medium">
                    {error}
                </p>
            )}
        </div>
    );
});

export const DegenSelect = forwardRef(function DegenSelect({
    label,
    error,
    hint,
    className = '',
    children,
    ...props
}, ref) {
    return (
        <div className="w-full">
            {label && (
                <label className="block text-degen-black font-medium text-sm uppercase tracking-wider mb-2">
                    {label}
                </label>
            )}
            <select
                ref={ref}
                className={`
                    w-full
                    px-3 py-2
                    bg-degen-white
                    text-degen-black
                    border border-degen-black
                    outline-none
                    transition-colors duration-100
                    focus:bg-degen-container
                    cursor-pointer
                    appearance-none
                    bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%23000000' viewBox='0 0 16 16'%3E%3Cpath d='M8 11L3 6h10l-5 5z'/%3E%3C/svg%3E")]
                    bg-no-repeat
                    bg-[position:right_0.75rem_center]
                    ${error ? 'border-degen-feature bg-degen-feature/5' : ''}
                    ${className}
                `}
                {...props}
            >
                {children}
            </select>
            {hint && !error && (
                <p className="mt-1 text-xs text-degen-text-muted">
                    {hint}
                </p>
            )}
            {error && (
                <p className="mt-1 text-sm text-degen-feature font-medium">
                    {error}
                </p>
            )}
        </div>
    );
});
