'use client';

import { useEffect, useCallback } from 'react';
import Image from 'next/image';
import DegenButton from './DegenButton';
import DegenTooltip from './DegenTooltip';

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
        xl: 'max-w-xl',
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
                <div className="p-2">
                    {children}
                </div>

                {/* Footer with share button */}
                {(showShare || showClose) && (
                    <div className="flex gap-2 p-2 pt-0">
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
 * WinModal - Pre-configured modal for displaying win results with trophy badge images
 *
 * Props:
 * - isOpen: boolean
 * - onClose: function
 * - tier: number (2=rebate, 3=break-even, 4=profit, 5=jackpot)
 * - amount: string/number - Formatted payout amount
 * - tokenSymbol: string
 * - badgeUrl: string - URL to the trophy badge image from Supabase
 * - onShare: function
 */
export function WinModal({
    isOpen,
    onClose,
    tier,
    amount,
    tokenSymbol,
    badgeUrl,
    onShare,
}) {
    const tierConfig = {
        2: { name: 'Rebate', variant: 'default' },
        3: { name: 'Break-even', variant: 'default' },
        4: { name: 'Profit', variant: 'success' },
        5: { name: 'Jackpot', variant: 'jackpot' },
    };

    const config = tierConfig[tier] || tierConfig[2];

    return (
        <DegenModal
            isOpen={isOpen}
            onClose={onClose}
            title=""
            variant={config.variant}
            showShare={false}
            size="sm"
        >
            <div className="flex flex-col">
                {/* Trophy Badge Image */}
                <div className="relative w-full aspect-square mb-2 border border-degen-black">
                    {badgeUrl ? (
                        <Image
                            src={badgeUrl}
                            alt={config.name}
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-degen-container">
                            <span className="text-degen-text-muted text-4xl font-bold uppercase">
                                {config.name}
                            </span>
                        </div>
                    )}
                </div>

                {/* Share Button */}
                {onShare && (
                    <DegenButton
                        onClick={onShare}
                        variant="primary"
                        size="md"
                        fullWidth
                        className="mb-4"
                    >
                        Share on X
                    </DegenButton>
                )}

                {/* Box Tier Row */}
                <div className="flex justify-between items-center text-sm py-2 border-b border-degen-black">
                    <span className="text-degen-text-muted uppercase tracking-wider">Box Tier</span>
                    <span className="text-degen-black font-medium uppercase">{config.name}</span>
                </div>

                {/* Payout Row */}
                {amount > 0 && (
                    <div className="flex justify-between items-center text-sm py-2">
                        <span className="text-degen-text-muted uppercase tracking-wider">Payout</span>
                        <span className="text-degen-black font-medium">{amount} ${tokenSymbol}</span>
                    </div>
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
                    <div className="relative w-24 h-24 mx-auto mb-4 border border-degen-black">
                        <Image
                            src={badge.icon}
                            alt={badge.name}
                            fill
                            className="object-contain"
                        />
                    </div>
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
                    Your DegenBox project is now live!
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

/**
 * OpenBoxConfirmModal - Confirmation modal before opening a box
 * Explains what happens during the reveal process
 */
export function OpenBoxConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    boxNumber,
    currentLuck,
    maxLuck,
    isProcessing = false,
}) {
    return (
        <DegenModal
            isOpen={isOpen}
            onClose={onClose}
            title="Open Box"
            variant="default"
            showClose={!isProcessing}
            closeOnBackdrop={!isProcessing}
            size="xl"
        >
            <div >

                <Image
                    src="/images/degenBox_two_thumbs_up.jpeg"
                    alt="Open Box"
                    width={800}
                    height={600}
                    className="w-full h-auto"
                />

                <div className="bg-white border border-degen-black p-4 mb-2">
                    <p className="text-degen-black text-base font-medium mb-0">
                        You&apos;re about to open Box #{boxNumber}
                    </p>
                    <p className="text-degen-text-black text-sm tracking-wider mb-4">
                        Here&apos;s what to expect:
                    </p>
                    <ul className="space-y-2 text-sm text-degen-black text-left">
                        <li className="flex items-start gap-2">
                            <span className="text-degen-blue font-bold">1.</span>
                            <span className="inline-flex items-center gap-1">
                                A small amount of SOL is taken to cover gas fees
                                <DegenTooltip content="Any unused gas will be returned upon reveal" position="top" maxWidth={200}>
                                    <span className="w-4 h-4 rounded-full bg-degen-blue text-white text-xs flex items-center justify-center cursor-help">?</span>
                                </DegenTooltip>
                            </span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-degen-blue font-bold">2.</span>
                            <span>Your luck score will be <strong>frozen</strong> at {currentLuck || '?'}/{maxLuck || 60}</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-degen-blue font-bold">3.</span>
                            <span>Wait <strong>~10 seconds</strong> for the oracle to generate randomness</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-degen-blue font-bold">4.</span>
                            <span>Click <strong>Reveal</strong> to see your result</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-degen-blue font-bold">4.</span>
                            <span>Winnings are <strong>automatically claimed</strong> to your wallet</span>
                        </li>
                    </ul>
                </div>

                {/*<div className="bg-degen-yellow/20 border border-degen-yellow p-3 mb-4">
                    <p className="text-degen-black text-sm">
                        <strong>Important:</strong> You must reveal within <strong>1 hour</strong> of opening, or the box expires.
                    </p>
                </div>*/}

                <div className="flex gap-2">
                    <DegenButton
                        onClick={onClose}
                        variant="secondary"
                        size="md"
                        disabled={isProcessing}
                        className="flex-1"
                    >
                        Cancel
                    </DegenButton>
                    <DegenButton
                        onClick={onConfirm}
                        variant="primary"
                        size="md"
                        disabled={isProcessing}
                        className="flex-1"
                    >
                        {isProcessing ? 'Opening...' : 'Open Box'}
                    </DegenButton>
                </div>


            </div>
        </DegenModal>
    );
}
