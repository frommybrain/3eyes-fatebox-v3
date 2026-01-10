'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

const toastVariants = {
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
        bg: 'bg-degen-black',
        border: 'border-degen-black',
        text: 'text-degen-white',
        icon: '•',
    },
};

function ToastItem({ toast, onDismiss }) {
    const variant = toastVariants[toast.variant] || toastVariants.default;
    const [isExiting, setIsExiting] = useState(false);

    const handleDismiss = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => onDismiss(toast.id), 150);
    }, [toast.id, onDismiss]);

    useEffect(() => {
        if (toast.duration !== Infinity) {
            const timer = setTimeout(handleDismiss, toast.duration || 4000);
            return () => clearTimeout(timer);
        }
    }, [toast.duration, handleDismiss]);

    return (
        <div
            className={`
                flex items-start gap-3 p-3 min-w-[280px] max-w-[380px]
                border ${variant.border}
                ${variant.bg}
                ${variant.text}
                transform transition-all duration-150
                ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
                animate-slide-in
            `}
            role="alert"
        >
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center font-bold text-sm">
                {toast.icon || variant.icon}
            </span>

            <div className="flex-1 min-w-0">
                {toast.title && (
                    <p className="font-medium text-sm uppercase tracking-wider mb-0.5">{toast.title}</p>
                )}
                <p className="text-sm">{toast.message}</p>
            </div>

            <button
                onClick={handleDismiss}
                className="flex-shrink-0 w-5 h-5 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
            >
                ×
            </button>
        </div>
    );
}

export function DegenToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((options) => {
        const id = Date.now() + Math.random();
        const toast = {
            id,
            variant: 'default',
            duration: 4000,
            ...options,
        };
        setToasts((prev) => [...prev, toast]);
        return id;
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const dismissAll = useCallback(() => {
        setToasts([]);
    }, []);

    const toast = useCallback((message, options = {}) => {
        return addToast({ message, ...options });
    }, [addToast]);

    toast.success = (message, options = {}) => addToast({ message, variant: 'success', ...options });
    toast.error = (message, options = {}) => addToast({ message, variant: 'error', ...options });
    toast.warning = (message, options = {}) => addToast({ message, variant: 'warning', ...options });
    toast.info = (message, options = {}) => addToast({ message, variant: 'info', ...options });

    return (
        <ToastContext.Provider value={{ toast, dismissToast, dismissAll }}>
            {children}

            <div
                className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
                aria-live="polite"
            >
                {toasts.map((t) => (
                    <div key={t.id} className="pointer-events-auto">
                        <ToastItem toast={t} onDismiss={dismissToast} />
                    </div>
                ))}
            </div>

            <style jsx global>{`
                @keyframes slide-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .animate-slide-in {
                    animation: slide-in 0.15s ease-out;
                }
            `}</style>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a DegenToastProvider');
    }
    return context;
}
