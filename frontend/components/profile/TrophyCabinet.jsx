'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { DegenCard, DegenButton, DegenLoadingState } from '@/components/ui';

// Tier colors for visual distinction
const TIER_COLORS = {
    2: 'border-red-500',      // Rebate
    3: 'border-blue-500',     // Break-even
    4: 'border-yellow-500',   // Profit
    5: 'border-green-500',    // Jackpot
};

const TIER_BG = {
    2: 'bg-red-500/10',
    3: 'bg-blue-500/10',
    4: 'bg-yellow-500/10',
    5: 'bg-green-500/10',
};

/**
 * TrophyCabinet - Displays user's win trophies (badge images from winning boxes)
 */
export default function TrophyCabinet({ username, walletAddress, className = '' }) {
    const [trophies, setTrophies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [selectedTrophy, setSelectedTrophy] = useState(null);

    const LIMIT = 24;

    useEffect(() => {
        fetchTrophies();
    }, [username, walletAddress, offset]);

    async function fetchTrophies() {
        try {
            setLoading(true);
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            // Use username endpoint if available, otherwise wallet
            const endpoint = username
                ? `${backendUrl}/api/users/by-username/${username}/trophies`
                : `${backendUrl}/api/users/${walletAddress}/trophies`;

            const response = await fetch(`${endpoint}?limit=${LIMIT}&offset=${offset}`);
            const data = await response.json();

            if (!data.success) {
                setError(data.error || 'Failed to load trophies');
            } else {
                setTrophies(data.trophies);
                setTotal(data.total);
            }
        } catch (err) {
            console.error('Error fetching trophies:', err);
            setError('Failed to connect to server');
        } finally {
            setLoading(false);
        }
    }

    const handlePrevPage = () => {
        setOffset(Math.max(0, offset - LIMIT));
    };

    const handleNextPage = () => {
        if (offset + LIMIT < total) {
            setOffset(offset + LIMIT);
        }
    };

    const currentPage = Math.floor(offset / LIMIT) + 1;
    const totalPages = Math.ceil(total / LIMIT);

    if (loading && trophies.length === 0) {
        return (
            <DegenCard variant="white" padding="md" className={className}>
                <h2 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">
                    Trophy Cabinet
                </h2>
                <DegenLoadingState text="Loading trophies..." />
            </DegenCard>
        );
    }

    if (error) {
        return (
            <DegenCard variant="default" padding="md" className={className}>
                <h2 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">
                    Trophy Cabinet
                </h2>
                <p className="text-degen-text-muted text-center py-6">{error}</p>
            </DegenCard>
        );
    }

    if (trophies.length === 0) {
        return (
            <DegenCard variant="default" padding="md" className={className}>
                <h2 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">
                    Trophy Cabinet
                </h2>
                <p className="text-degen-text-muted text-center py-6">
                    No trophies yet. Win some boxes to earn unique trophies!
                </p>
            </DegenCard>
        );
    }

    return (
        <>
            <DegenCard variant="white" padding="md" className={className}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-degen-black text-xl font-medium uppercase tracking-wider">
                        Trophy Cabinet ({total})
                    </h2>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <DegenButton
                                onClick={handlePrevPage}
                                disabled={offset === 0}
                                variant="secondary"
                                size="sm"
                            >
                                Prev
                            </DegenButton>
                            <span className="text-degen-text-muted text-sm">
                                {currentPage} / {totalPages}
                            </span>
                            <DegenButton
                                onClick={handleNextPage}
                                disabled={offset + LIMIT >= total}
                                variant="secondary"
                                size="sm"
                            >
                                Next
                            </DegenButton>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                    {trophies.map((trophy) => (
                        <button
                            key={trophy.id}
                            onClick={() => setSelectedTrophy(trophy)}
                            className={`
                                relative aspect-square border-2 ${TIER_COLORS[trophy.tier]} ${TIER_BG[trophy.tier]}
                                hover:scale-105 transition-transform duration-100 cursor-pointer
                                overflow-hidden
                            `}
                            title={`${trophy.tierName} - ${trophy.payoutFormatted} ${trophy.tokenSymbol}`}
                        >
                            <Image
                                src={trophy.badgeUrl}
                                alt={trophy.tierName}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                            />
                        </button>
                    ))}
                </div>
            </DegenCard>

            {/* Trophy Detail Modal */}
            {selectedTrophy && (
                <TrophyModal
                    trophy={selectedTrophy}
                    onClose={() => setSelectedTrophy(null)}
                />
            )}
        </>
    );
}

/**
 * TrophyModal - Detail view for a single trophy
 */
function TrophyModal({ trophy, onClose }) {
    // Close on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={onClose}
        >
            <div
                className="bg-degen-white border border-degen-black max-w-sm w-full"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`
                    flex items-center justify-between px-4 py-3 border-b border-degen-black
                    ${trophy.tier === 5 ? 'bg-degen-yellow' : 'bg-degen-container'}
                `}>
                    <h3 className="text-lg font-medium uppercase tracking-wider text-degen-black">
                        {trophy.tierName}
                    </h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center text-xl font-bold hover:bg-degen-black hover:text-degen-white transition-colors"
                    >
                        X
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    {/* Badge Image */}
                    <div className="relative aspect-square mb-4 border border-degen-black">
                        <Image
                            src={trophy.badgeUrl}
                            alt={trophy.tierName}
                            fill
                            className="object-cover"
                        />
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between border-b border-degen-black pb-2">
                            <span className="text-degen-text-muted uppercase">Payout</span>
                            <span className="text-degen-black font-medium">
                                {trophy.payoutFormatted} ${trophy.tokenSymbol}
                            </span>
                        </div>
                        <div className="flex justify-between border-b border-degen-black pb-2">
                            <span className="text-degen-text-muted uppercase">Project</span>
                            <span className="text-degen-black font-medium">
                                {trophy.projectName}
                            </span>
                        </div>
                        <div className="flex justify-between border-b border-degen-black pb-2">
                            <span className="text-degen-text-muted uppercase">Box</span>
                            <span className="text-degen-black font-medium">
                                #{trophy.boxNumber}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-degen-text-muted uppercase">Won</span>
                            <span className="text-degen-black font-medium">
                                {new Date(trophy.openedAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
