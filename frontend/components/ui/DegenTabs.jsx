'use client';

import { createContext, useContext, useState } from 'react';

const TabsContext = createContext(null);

export function DegenTabs({ children, defaultValue, value, onValueChange, className = '' }) {
    const [internalValue, setInternalValue] = useState(defaultValue);
    const currentValue = value !== undefined ? value : internalValue;

    const handleValueChange = (newValue) => {
        if (onValueChange) {
            onValueChange(newValue);
        } else {
            setInternalValue(newValue);
        }
    };

    return (
        <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
            <div className={className}>
                {children}
            </div>
        </TabsContext.Provider>
    );
}

export function DegenTabsList({ children, className = '' }) {
    return (
        <div
            className={`
                inline-flex
                border border-degen-black
                ${className}
            `}
        >
            {children}
        </div>
    );
}

export function DegenTabsTrigger({ children, value, className = '', disabled = false, label }) {
    const context = useContext(TabsContext);
    const isActive = context?.value === value;

    return (
        <button
            onClick={() => !disabled && context?.onValueChange(value)}
            disabled={disabled}
            className={`
                px-4 py-2
                font-medium text-sm uppercase tracking-wider
                border-r border-degen-black last:border-r-0
                transition-colors duration-100
                ${isActive
                    ? 'bg-degen-black text-degen-white'
                    : disabled
                        ? 'bg-white/10 cursor-not-allowed'
                        : 'bg-degen-white text-degen-black hover:bg-degen-black hover:text-degen-white cursor-pointer'
                }
                ${className}
            `}
        >
            {label ? (
                <>
                    <span className={disabled && !isActive ? 'opacity-50' : ''}>{label}</span>
                    {children}
                </>
            ) : (
                <span className={disabled && !isActive ? 'opacity-50' : ''}>{children}</span>
            )}
        </button>
    );
}

export function DegenTabsContent({ children, value, className = '' }) {
    const context = useContext(TabsContext);
    const isActive = context?.value === value;

    if (!isActive) return null;

    return (
        <div className={`mt-4 ${className}`}>
            {children}
        </div>
    );
}
