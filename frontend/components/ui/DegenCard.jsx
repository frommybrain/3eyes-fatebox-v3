'use client';

import { useState } from 'react';

const variants = {
    default: {
        bg: 'bg-degen-container',
        border: 'border-degen-black',
    },
    white: {
        bg: 'bg-degen-white',
        border: 'border-degen-black',
    },
    feature: {
        bg: 'bg-degen-feature',
        border: 'border-degen-black',
    },
    blue: {
        bg: 'bg-degen-blue',
        border: 'border-degen-black',
    },
    yellow: {
        bg: 'bg-degen-yellow',
        border: 'border-degen-black',
    },
    green: {
        bg: 'bg-degen-green',
        border: 'border-degen-black',
    },
    black: {
        bg: 'bg-degen-black',
        border: 'border-degen-black',
    },
    outline: {
        bg: 'bg-transparent',
        border: 'border-degen-black',
    },
    ghost: {
        bg: 'bg-transparent',
        border: 'border-transparent',
    },
};

// Dropdown Menu Component for card actions
function CardDropdown({ items = [], onSelect }) {
    const [isOpen, setIsOpen] = useState(false);

    if (!items.length) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-6 h-6 flex items-center justify-center text-degen-text-muted hover:text-degen-black hover:bg-degen-black/5 transition-colors"
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <circle cx="8" cy="3" r="1.5" />
                    <circle cx="8" cy="8" r="1.5" />
                    <circle cx="8" cy="13" r="1.5" />
                </svg>
            </button>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] bg-degen-white border border-degen-black shadow-sm">
                        {items.map((item, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    item.onClick?.();
                                    onSelect?.(item);
                                    setIsOpen(false);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-degen-black hover:bg-degen-black hover:text-degen-white transition-colors flex items-center gap-2"
                            >
                                {item.icon && <span className="text-xs">{item.icon}</span>}
                                {item.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// Drag Handle Component
function DragHandle({ onDragStart, onDragEnd }) {
    return (
        <div
            className="w-6 h-6 flex items-center justify-center cursor-grab active:cursor-grabbing text-degen-text-muted hover:text-degen-black transition-colors"
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
        >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                <circle cx="4" cy="3" r="1.5" />
                <circle cx="10" cy="3" r="1.5" />
                <circle cx="4" cy="7" r="1.5" />
                <circle cx="10" cy="7" r="1.5" />
                <circle cx="4" cy="11" r="1.5" />
                <circle cx="10" cy="11" r="1.5" />
            </svg>
        </div>
    );
}

export default function DegenCard({
    children,
    variant = 'default',
    className = '',
    padding = 'md',
    hover = false,
    onClick,
    // Top bar props
    topBar = false,
    topBarLabel,
    topBarBadge,
    draggable = false,
    onDragStart,
    onDragEnd,
    menuItems = [],
    onMenuSelect,
    topBarContent,
    ...props
}) {
    const variantStyles = variants[variant] || variants.default;

    const paddingSizes = {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
    };

    const baseStyles = `
        border
        ${hover ? 'transition-colors duration-100 hover:bg-degen-black hover:text-degen-white cursor-pointer' : ''}
    `;

    const combinedClassName = `
        ${baseStyles}
        ${variantStyles.bg}
        ${variantStyles.border}
        ${topBar ? '' : paddingSizes[padding]}
        ${className}
    `.trim();

    const showTopBar = topBar || topBarLabel || topBarBadge || draggable || menuItems.length > 0 || topBarContent;

    return (
        <div className={combinedClassName} onClick={onClick} {...props}>
            {showTopBar && (
                <div className="flex items-center justify-between px-3 py-2 border-b border-degen-black bg-degen-bg/50">
                    <div className="flex items-center gap-2">
                        {draggable && (
                            <DragHandle onDragStart={onDragStart} onDragEnd={onDragEnd} />
                        )}
                        {topBarLabel && (
                            <span className="text-xs font-medium uppercase tracking-wider text-degen-text-muted">
                                {topBarLabel}
                            </span>
                        )}
                        {topBarBadge}
                    </div>
                    <div className="flex items-center gap-1">
                        {topBarContent}
                        {menuItems.length > 0 && (
                            <CardDropdown items={menuItems} onSelect={onMenuSelect} />
                        )}
                    </div>
                </div>
            )}
            <div className={topBar ? paddingSizes[padding] : ''}>
                {children}
            </div>
        </div>
    );
}

export function DegenCardHeader({ children, className = '' }) {
    return (
        <div className={`border-b border-degen-black -mx-4 -mt-4 px-4 py-3 mb-4 ${className}`}>
            {children}
        </div>
    );
}

export function DegenCardTitle({ children, className = '' }) {
    return (
        <h3 className={`text-lg font-medium uppercase tracking-wider text-degen-black ${className}`}>
            {children}
        </h3>
    );
}

export function DegenCardDescription({ children, className = '' }) {
    return (
        <p className={`text-sm text-degen-text-muted mt-1 ${className}`}>
            {children}
        </p>
    );
}

export function DegenCardContent({ children, className = '' }) {
    return (
        <div className={`text-degen-text ${className}`}>
            {children}
        </div>
    );
}

export function DegenCardFooter({ children, className = '' }) {
    return (
        <div className={`border-t border-degen-black -mx-4 -mb-4 px-4 py-3 mt-4 ${className}`}>
            {children}
        </div>
    );
}

// Export utility components for custom top bars
export { CardDropdown, DragHandle };
