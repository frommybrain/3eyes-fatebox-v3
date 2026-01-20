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

    // Per-project stats
    const perProjectStats = stats.perProjectStats || [];

    return (
        <div className={className}>
            {/* Main Stats Grid */}
            <DegenCard variant="white" padding="md" className="mb-4">
                <h2 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">
                    Overall Stats
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
            <DegenCard variant="default" padding="md" className="mb-4">
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

            {/* Per-Project Stats */}
            {perProjectStats.length > 0 && (
                <DegenCard variant="white" padding="md">
                    <h3 className="text-degen-black text-lg font-medium uppercase tracking-wider mb-4">
                        Stats by Project
                    </h3>
                    <div className="space-y-4">
                        {perProjectStats.map((project) => (
                            <div
                                key={project.projectId}
                                className="p-4 bg-degen-container border border-degen-black"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-degen-black font-medium uppercase tracking-wider">
                                        {project.projectName}
                                    </h4>
                                    <span className="text-degen-text-muted text-xs">
                                        {project.subdomain}.degenbox.fun
                                    </span>
                                </div>

                                {/* Project Stats Row */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                    <div className="text-center p-2 bg-degen-white border border-degen-black">
                                        <p className="text-degen-text-muted text-xs uppercase">Boxes</p>
                                        <p className="text-degen-black font-medium">{project.totalBoxes}</p>
                                    </div>
                                    <div className="text-center p-2 bg-degen-white border border-degen-black">
                                        <p className="text-degen-text-muted text-xs uppercase">Wins</p>
                                        <p className="text-degen-black font-medium">{project.winsCount}</p>
                                    </div>
                                    <div className={`text-center p-2 border border-degen-black ${project.jackpotCount > 0 ? 'bg-degen-yellow' : 'bg-degen-white'}`}>
                                        <p className="text-degen-text-muted text-xs uppercase">Jackpots</p>
                                        <p className="text-degen-black font-medium">{project.jackpotCount}</p>
                                    </div>
                                    <div className={`text-center p-2 border border-degen-black ${parseFloat(project.netProfit?.formatted || 0) >= 0 ? 'bg-degen-green/20' : 'bg-red-100'}`}>
                                        <p className="text-degen-text-muted text-xs uppercase">Net P/L</p>
                                        <p className={`font-medium ${parseFloat(project.netProfit?.formatted || 0) >= 0 ? 'text-degen-green' : 'text-red-600'}`}>
                                            {parseFloat(project.netProfit?.formatted || 0) >= 0 ? '+' : ''}{project.netProfit?.formatted || '0'} {project.tokenSymbol}
                                        </p>
                                    </div>
                                </div>

                                {/* Tier breakdown for project */}
                                <div className="flex flex-wrap gap-1">
                                    <span className="text-degen-text-muted text-xs px-2 py-1 bg-degen-white border border-degen-black">
                                        Duds: {project.dudCount}
                                    </span>
                                    <span className="text-degen-text-muted text-xs px-2 py-1 bg-degen-white border border-degen-black">
                                        Rebates: {project.rebateCount}
                                    </span>
                                    <span className="text-degen-text-muted text-xs px-2 py-1 bg-degen-white border border-degen-black">
                                        Break-evens: {project.breakevenCount}
                                    </span>
                                    <span className="text-degen-text-muted text-xs px-2 py-1 bg-degen-white border border-degen-black">
                                        Profits: {project.profitCount}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </DegenCard>
            )}
        </div>
    );
}
