'use client';

import { useEffect, useCallback } from 'react';
import DegenButton from './DegenButton';

const variants = {
    default: {
        bg: 'bg-degen-white',
        headerBg: 'bg-degen-container',
        text: 'text-degen-black',
    },
    success: {
        bg: 'bg-degen-white',
        headerBg: 'bg-degen-green',
        text: 'text-degen-black',
    },
    jackpot: {
        bg: 'bg-degen-white',
        headerBg: 'bg-degen-yellow',
        text: 'text-degen-black',
    },
    badge: {
        bg: 'bg-degen-white',
        headerBg: 'bg-degen-magenta',
        text: 'text-degen-white',
    },
    error: {
        bg: 'bg-degen-white',
        headerBg: 'bg-degen-feature',
        text: 'text-degen-white',
    },
};

/**
 * DegenModal - Brutalist modal component
 *
 * Props:
 * - isOpen: boolean - Controls visibility
 * - onClose: function - Called when modal is dismissed
 * - title: string - Modal header title
 * - children: ReactNode - Modal content
 * - variant: 'default' | 'success' | 'jackpot' | 'badge' | 'error'
 * - showShare: boolean - Show share button
 * - onShare: function - Called when share button clicked
 * - shareLabel: string - Custom share button label
 * - showClose: boolean - Show close button (default true)
 * - closeOnBackdrop: boolean - Close when clicking backdrop (default true)
 * - size: 'sm' | 'md' | 'lg' - Modal width
 */
export default function DegenModal({
    isOpen,
    onClose,
    title,
    children,
    variant = 'default',
    showShare = false,
    onShare,
    shareLabel = 'Share on X',
    showClose = true,
    closeOnBackdrop = true,
    size = 'md',
}) {
    const variantStyles = variants[variant] || variants.default;

    // Handle escape key
    const handleEscape = useCallback((e) => {
        if (e.key === 'Escape' && onClose) {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && closeOnBackdrop && onClose) {
            onClose();
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={handleBackdropClick}
        >
            <div
                className={`
                    w-full ${sizeClasses[size]}
                    ${variantStyles.bg}
                    border border-degen-black
                    transform transition-all duration-100
                    animate-modal-in
                `}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {/* Header */}
                {title && (
                    <div className={`
                        flex items-center justify-between
                        px-4 py-3
                        border-b border-degen-black
                        ${variantStyles.headerBg}
                    `}>
                        <h2
                            id="modal-title"
                            className={`
                                text-lg font-medium uppercase tracking-wider
                                ${variantStyles.text}
                            `}
                        >
                            {title}
                        </h2>
                        {showClose && (
                            <button
                                onClick={onClose}
                                className={`
                                    w-8 h-8 flex items-center justify-center
                                    text-xl font-bold
                                    hover:bg-degen-black hover:text-degen-white
                                    transition-colors duration-100
                                    ${variantStyles.text}
                                `}
                                aria-label="Close modal"
                            >
                                X
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="p-4">
                    {children}
                </div>

                {/* Footer with share button */}
                {(showShare || showClose) && (
                    <div className="flex gap-2 p-4 pt-0">
                        {showShare && onShare && (
                            <DegenButton
                                onClick={onShare}
                                variant="primary"
                                size="md"
                                fullWidth
                            >
                                {shareLabel}
                            </DegenButton>
                        )}
                        {showClose && !title && (
                            <DegenButton
                                onClick={onClose}
                                variant="secondary"
                                size="md"
                                fullWidth={!showShare}
                            >
                                Close
                            </DegenButton>
                        )}
                    </div>
                )}
            </div>

            <style jsx global>{`
                @keyframes modal-in {
                    from {
                        opacity: 0;
                        transform: scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-modal-in {
                    animation: modal-in 0.1s ease-out;
                }
            `}</style>
        </div>
    );
}

/**
 * WinModal - Pre-configured modal for displaying win results
 */
export function WinModal({
    isOpen,
    onClose,
    tier,
    amount,
    tokenSymbol,
    onShare,
}) {
    const tierConfig = {
        2: { name: 'Rebate', variant: 'default', emoji: '' },
        3: { name: 'Break-even', variant: 'default', emoji: '' },
        4: { name: 'Profit', variant: 'success', emoji: '' },
        5: { name: 'Jackpot', variant: 'jackpot', emoji: '' },
    };

    const config = tierConfig[tier] || tierConfig[2];

    return (
        <DegenModal
            isOpen={isOpen}
            onClose={onClose}
            title={tier === 5 ? 'JACKPOT!' : 'Winner!'}
            variant={config.variant}
            showShare={!!onShare}
            onShare={onShare}
            shareLabel="Share on X"
            size="sm"
        >
            <div className="text-center py-4">
                <p className="text-degen-text-muted text-sm uppercase tracking-wider mb-2">
                    You got
                </p>
                <p className="text-degen-black text-3xl font-medium uppercase tracking-wider mb-2">
                    {config.name}
                </p>
                {amount > 0 && (
                    <p className="text-degen-black text-xl">
                        {amount} {tokenSymbol}
                    </p>
                )}
            </div>
        </DegenModal>
    );
}

/**
 * BadgeModal - Pre-configured modal for displaying earned badges
 */
export function BadgeModal({
    isOpen,
    onClose,
    badge,
    onShare,
}) {
    if (!badge) return null;

    return (
        <DegenModal
            isOpen={isOpen}
            onClose={onClose}
            title="New Badge!"
            variant="badge"
            showShare={!!onShare}
            onShare={onShare}
            shareLabel="Share on X"
            size="sm"
        >
            <div className="text-center py-4">
                {badge.icon && (
                    <img
                        src={badge.icon}
                        alt={badge.name}
                        className="w-24 h-24 mx-auto mb-4 border border-degen-black"
                    />
                )}
                <p className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-2">
                    {badge.name}
                </p>
                <p className="text-degen-text-muted text-sm">
                    {badge.description}
                </p>
            </div>
        </DegenModal>
    );
}

/**
 * ProjectCreatedModal - Modal for successful project creation
 */
export function ProjectCreatedModal({
    isOpen,
    onClose,
    projectName,
    projectUrl,
    onShare,
}) {
    return (
        <DegenModal
            isOpen={isOpen}
            onClose={onClose}
            title="Project Created!"
            variant="success"
            showShare={!!onShare}
            onShare={onShare}
            shareLabel="Share on X"
            size="md"
        >
            <div className="text-center py-4">
                <p className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-4">
                    {projectName}
                </p>
                <p className="text-degen-text-muted text-sm mb-4">
                    Your lootbox project is now live!
                </p>
                {projectUrl && (
                    <a
                        href={projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-degen-blue hover:underline text-sm break-all"
                    >
                        {projectUrl}
                    </a>
                )}
            </div>
        </DegenModal>
    );
}
