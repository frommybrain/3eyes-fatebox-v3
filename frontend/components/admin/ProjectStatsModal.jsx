// components/admin/ProjectStatsModal.jsx
'use client';

import { DegenModal, DegenLoadingState, DegenBadge, DegenButton } from '@/components/ui';

/**
 * Format number with locale-aware thousands separators
 */
function formatNumber(num, decimals = 0) {
    if (num === null || num === undefined) return '-';
    return Number(num).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/**
 * Format duration in human-readable form
 */
function formatDuration(hours) {
    const h = parseFloat(hours);
    if (h < 1) return `${Math.round(h * 60)} minutes`;
    if (h < 24) return `${h.toFixed(1)} hours`;
    return `${(h / 24).toFixed(1)} days`;
}

/**
 * Get color class for outcome tier
 */
function getTierColor(tier) {
    switch (tier) {
        case 1: return 'bg-gray-200 text-gray-700';
        case 2: return 'bg-orange-100 text-orange-700';
        case 3: return 'bg-blue-100 text-blue-700';
        case 4: return 'bg-green-100 text-green-700';
        case 5: return 'bg-yellow-100 text-yellow-800';
        case 6: return 'bg-purple-100 text-purple-700';
        default: return 'bg-gray-100 text-gray-600';
    }
}

export default function ProjectStatsModal({ isOpen, onClose, stats, loading }) {
    if (!isOpen) return null;

    return (
        <DegenModal
            isOpen={isOpen}
            onClose={onClose}
            title={stats?.project?.name ? `${stats.project.name} Stats` : 'Project Stats'}
            size="2xl"
        >
            <div className="max-h-[70vh] overflow-y-auto">
                {loading ? (
                    <div className="py-12">
                        <DegenLoadingState text="Loading project stats..." />
                    </div>
                ) : stats ? (
                    <div className="space-y-6">
                        {/* Project Header */}
                        <div className="flex items-center justify-between pb-4 border-b border-degen-black">
                            <div>
                                <h3 className="text-xl font-bold text-degen-black">{stats.project.name}</h3>
                                <p className="text-degen-text-muted text-sm">
                                    {stats.project.subdomain}.degenbox.fun
                                </p>
                            </div>
                            <div className="text-right">
                                <DegenBadge variant={stats.project.isActive ? 'success' : 'warning'}>
                                    {stats.project.isActive ? 'ACTIVE' : 'PAUSED'}
                                </DegenBadge>
                                <p className="text-degen-text-muted text-xs mt-1">
                                    ID: {stats.project.numericId}
                                </p>
                            </div>
                        </div>

                        {/* Financial Summary - Key Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 bg-degen-bg border border-degen-black">
                                <p className="text-degen-text-muted text-xs uppercase tracking-wider">Total Revenue</p>
                                <p className="text-2xl font-bold text-degen-black">
                                    {formatNumber(stats.financial.totalRevenue)}
                                </p>
                                <p className="text-degen-text-muted text-xs">{stats.project.tokenSymbol}</p>
                            </div>
                            <div className="p-4 bg-degen-bg border border-degen-black">
                                <p className="text-degen-text-muted text-xs uppercase tracking-wider">Total Paid Out</p>
                                <p className="text-2xl font-bold text-degen-black">
                                    {formatNumber(stats.financial.totalPaidOut)}
                                </p>
                                <p className="text-degen-text-muted text-xs">{stats.project.tokenSymbol}</p>
                            </div>
                            <div className="p-4 bg-degen-green border border-degen-black">
                                <p className="text-degen-black text-xs uppercase tracking-wider">Net Profit</p>
                                <p className="text-2xl font-bold text-degen-black">
                                    {formatNumber(stats.financial.netProfit)}
                                </p>
                                <p className="text-degen-black text-xs">{stats.project.tokenSymbol}</p>
                            </div>
                            <div className="p-4 bg-degen-yellow border border-degen-black">
                                <p className="text-degen-black text-xs uppercase tracking-wider">House Edge</p>
                                <p className="text-2xl font-bold text-degen-black">
                                    {stats.financial.houseEdge}%
                                </p>
                                <p className="text-degen-black text-xs">Return to house</p>
                            </div>
                        </div>

                        {/* Box Statistics */}
                        <div className="p-4 bg-degen-bg border border-degen-black">
                            <h4 className="text-degen-black font-medium uppercase tracking-wider mb-3">Box Statistics</h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                <div>
                                    <p className="text-degen-text-muted text-xs uppercase">Total Boxes</p>
                                    <p className="text-xl font-bold text-degen-black">{stats.boxStats.total}</p>
                                </div>
                                <div>
                                    <p className="text-degen-text-muted text-xs uppercase">Settled</p>
                                    <p className="text-xl font-bold text-degen-black">{stats.boxStats.settled}</p>
                                </div>
                                <div>
                                    <p className="text-degen-text-muted text-xs uppercase">Purchased</p>
                                    <p className="text-xl font-bold text-degen-black">
                                        {stats.boxStats.byStatus.purchased || 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-degen-text-muted text-xs uppercase">Committed</p>
                                    <p className="text-xl font-bold text-degen-black">
                                        {stats.boxStats.byStatus.committed || 0}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-degen-text-muted text-xs uppercase">Refunded</p>
                                    <p className="text-xl font-bold text-degen-black">
                                        {stats.boxStats.byStatus.refunded || 0}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Outcome Breakdown */}
                        <div className="p-4 bg-degen-bg border border-degen-black">
                            <h4 className="text-degen-black font-medium uppercase tracking-wider mb-3">
                                Outcome Breakdown ({stats.boxStats.settled} settled)
                            </h4>
                            {stats.outcomeBreakdown.length > 0 ? (
                                <div className="space-y-2">
                                    {stats.outcomeBreakdown.map((outcome) => (
                                        <div
                                            key={outcome.tier}
                                            className="flex items-center justify-between p-2 bg-degen-white border border-degen-black"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className={`px-2 py-1 text-xs font-medium rounded ${getTierColor(outcome.tier)}`}>
                                                    {outcome.name}
                                                </span>
                                                <span className="text-degen-black font-medium">
                                                    {outcome.count} boxes
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className="text-degen-text-muted">
                                                    {outcome.percentage}%
                                                </span>
                                                <span className="text-degen-black font-medium">
                                                    {formatNumber(outcome.totalPaid)} {stats.project.tokenSymbol}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-degen-text-muted text-sm">No settled boxes yet</p>
                            )}
                        </div>

                        {/* User Statistics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-degen-bg border border-degen-black">
                                <h4 className="text-degen-black font-medium uppercase tracking-wider mb-3">User Stats</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-degen-text-muted text-sm">Unique Buyers</span>
                                        <span className="text-degen-black font-medium">{stats.users.uniqueBuyers}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-degen-text-muted text-sm">Avg Boxes/Buyer</span>
                                        <span className="text-degen-black font-medium">{stats.users.avgBoxesPerBuyer}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-degen-text-muted text-sm">Box Price</span>
                                        <span className="text-degen-black font-medium">
                                            {formatNumber(stats.financial.boxPrice)} {stats.project.tokenSymbol}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Top Buyers */}
                            <div className="p-4 bg-degen-bg border border-degen-black">
                                <h4 className="text-degen-black font-medium uppercase tracking-wider mb-3">Top Buyers</h4>
                                {stats.users.topBuyers.length > 0 ? (
                                    <div className="space-y-1">
                                        {stats.users.topBuyers.map((buyer, idx) => (
                                            <div key={buyer.fullWallet} className="flex justify-between text-sm">
                                                <span className="text-degen-text-muted">
                                                    {idx + 1}. {buyer.wallet}
                                                </span>
                                                <span className="text-degen-black font-medium">{buyer.count} boxes</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-degen-text-muted text-sm">No buyers yet</p>
                                )}
                            </div>
                        </div>

                        {/* Luck & Timeline */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Luck Stats */}
                            <div className="p-4 bg-degen-bg border border-degen-black">
                                <h4 className="text-degen-black font-medium uppercase tracking-wider mb-3">Luck Statistics</h4>
                                {stats.luckStats ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-degen-text-muted text-sm">Average Luck</span>
                                            <span className="text-degen-black font-medium">{stats.luckStats.average}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-degen-text-muted text-sm">Min Luck</span>
                                            <span className="text-degen-black font-medium">{stats.luckStats.min}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-degen-text-muted text-sm">Max Luck</span>
                                            <span className="text-degen-black font-medium">{stats.luckStats.max}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-degen-text-muted text-sm">No luck data available</p>
                                )}
                            </div>

                            {/* Timeline */}
                            <div className="p-4 bg-degen-bg border border-degen-black">
                                <h4 className="text-degen-black font-medium uppercase tracking-wider mb-3">Timeline</h4>
                                {stats.timeline ? (
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-degen-text-muted text-sm">Duration</span>
                                            <span className="text-degen-black font-medium">
                                                {formatDuration(stats.timeline.durationHours)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-degen-text-muted text-sm">First Box</span>
                                            <span className="text-degen-black font-medium text-xs">
                                                {new Date(stats.timeline.firstBox).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-degen-text-muted text-sm">Last Box</span>
                                            <span className="text-degen-black font-medium text-xs">
                                                {new Date(stats.timeline.lastBox).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-degen-text-muted text-sm">No timeline data available</p>
                                )}
                            </div>
                        </div>

                        {/* Platform Commission */}
                        <div className="p-4 bg-degen-magenta border border-degen-black">
                            <h4 className="text-degen-white font-medium uppercase tracking-wider mb-2">Platform Commission</h4>
                            <div className="flex items-center justify-between">
                                <span className="text-degen-white text-sm">
                                    Rate: {stats.financial.platformCommissionRate}%
                                </span>
                                <span className="text-degen-white font-bold text-xl">
                                    {formatNumber(stats.financial.platformCommission)} {stats.project.tokenSymbol}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="py-12 text-center">
                        <p className="text-degen-text-muted">No stats available</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-degen-black flex justify-end">
                <DegenButton onClick={onClose} variant="secondary">
                    Close
                </DegenButton>
            </div>
        </DegenModal>
    );
}
