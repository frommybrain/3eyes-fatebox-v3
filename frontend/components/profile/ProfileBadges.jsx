'use client';

import { useState } from 'react';
import { DegenCard, DegenButton, BadgeModal } from '@/components/ui';
import { getBadgeShareHandler } from '@/lib/shareManager';

/**
 * ProfileBadges - Displays user's earned badges
 */
export default function ProfileBadges({ badges, username, className = '' }) {
    const [selectedBadge, setSelectedBadge] = useState(null);

    if (!badges || badges.length === 0) {
        return (
            <DegenCard variant="default" padding="md" className={className}>
                <h2 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">
                    Badges
                </h2>
                <p className="text-degen-text-muted text-center py-6">
                    No badges earned yet. Keep opening boxes!
                </p>
            </DegenCard>
        );
    }

    const handleBadgeClick = (badge) => {
        setSelectedBadge(badge);
    };

    const handleCloseModal = () => {
        setSelectedBadge(null);
    };

    const handleShare = selectedBadge
        ? getBadgeShareHandler(selectedBadge, username)
        : null;

    return (
        <>
            <DegenCard variant="white" padding="md" className={className}>
                <h2 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">
                    Badges ({badges.length})
                </h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                    {badges.map((badge) => (
                        <button
                            key={badge.badge_type}
                            onClick={() => handleBadgeClick(badge)}
                            className="flex flex-col items-center p-3 border border-degen-black bg-degen-container hover:bg-degen-yellow transition-colors duration-100 cursor-pointer"
                            title={badge.name}
                        >
                            {badge.icon ? (
                                <img
                                    src={badge.icon}
                                    alt={badge.name}
                                    className="w-12 h-12 mb-2"
                                />
                            ) : (
                                <div className="w-12 h-12 mb-2 bg-degen-black flex items-center justify-center text-degen-white text-xl">
                                    {getBadgeEmoji(badge.badge_type)}
                                </div>
                            )}
                            <span className="text-degen-black text-xs font-medium text-center uppercase tracking-wider line-clamp-2">
                                {badge.name}
                            </span>
                        </button>
                    ))}
                </div>
            </DegenCard>

            {/* Badge Detail Modal */}
            <BadgeModal
                isOpen={!!selectedBadge}
                onClose={handleCloseModal}
                badge={selectedBadge}
                onShare={handleShare}
            />
        </>
    );
}

/**
 * Get emoji fallback for badge type
 */
function getBadgeEmoji(badgeType) {
    const emojis = {
        jackpot: 'J',
        creator: 'C',
        boxes_10: '10',
        boxes_25: '25',
        boxes_50: '50',
        boxes_100: '100',
    };
    return emojis[badgeType] || '?';
}
