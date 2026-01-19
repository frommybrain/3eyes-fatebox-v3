'use client';

import { DegenCard, DegenBadge } from '@/components/ui';

/**
 * ProfileStats - Displays user statistics in a grid
 */
export default function ProfileStats({ stats, className = '' }) {
    if (!stats) return null;

    const statItems = [
        {
            label: 'Total Boxes',
            value: stats.totalBoxes || 0,
            highlight: false
        },
        {
            label: 'Boxes Opened',
            value: stats.openedBoxes || 0,
            highlight: false
        },
        {
            label: 'Win Rate',
            value: `${stats.winRate || 0}%`,
            highlight: stats.winRate >= 50
        },
        {
            label: 'Total Wins',
            value: stats.winsCount || 0,
            highlight: false
        },
        {
            label: 'Jackpots',
            value: stats.jackpotCount || 0,
            highlight: stats.jackpotCount > 0
        },
        {
            label: 'Projects Created',
            value: stats.projectsCreated || 0,
            highlight: false
        },
    ];

    // Tier breakdown
    const tierBreakdown = [
        { label: 'Duds', value: stats.dudCount || 0, variant: 'default' },
        { label: 'Rebates', value: stats.rebateCount || 0, variant: 'default' },
        { label: 'Break-evens', value: stats.breakevenCount || 0, variant: 'default' },
        { label: 'Profits', value: stats.profitCount || 0, variant: 'success' },
        { label: 'Jackpots', value: stats.jackpotCount || 0, variant: 'warning' },
    ];

    return (
        <div className={className}>
            {/* Main Stats Grid */}
            <DegenCard variant="white" padding="md" className="mb-4">
                <h2 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">
                    Stats
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {statItems.map((item) => (
                        <div
                            key={item.label}
                            className={`
                                text-center p-4 border border-degen-black
                                ${item.highlight ? 'bg-degen-yellow' : 'bg-degen-container'}
                            `}
                        >
                            <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-1">
                                {item.label}
                            </p>
                            <p className="text-degen-black text-2xl font-medium">
                                {item.value}
                            </p>
                        </div>
                    ))}
                </div>
            </DegenCard>

            {/* Tier Breakdown */}
            <DegenCard variant="default" padding="md">
                <h3 className="text-degen-black text-lg font-medium uppercase tracking-wider mb-4">
                    Results Breakdown
                </h3>
                <div className="flex flex-wrap gap-2">
                    {tierBreakdown.map((tier) => (
                        <div
                            key={tier.label}
                            className="flex items-center gap-2 px-3 py-2 bg-degen-white border border-degen-black"
                        >
                            <span className="text-degen-text-muted text-sm">
                                {tier.label}:
                            </span>
                            <DegenBadge variant={tier.variant} size="sm">
                                {tier.value}
                            </DegenBadge>
                        </div>
                    ))}
                </div>
            </DegenCard>
        </div>
    );
}
