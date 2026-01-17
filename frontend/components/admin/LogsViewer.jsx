// components/admin/LogsViewer.jsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';
import {
    DegenButton,
    DegenCard,
    DegenBadge,
    DegenInput,
    DegenLoadingState,
} from '@/components/ui';

// Severity badge colors
const severityColors = {
    debug: 'bg-gray-400',
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    critical: 'bg-red-700',
};

// Category badge colors
const categoryColors = {
    project: 'bg-purple-500',
    box: 'bg-green-500',
    treasury: 'bg-yellow-600',
    withdrawal: 'bg-orange-500',
    admin: 'bg-blue-600',
    error: 'bg-red-500',
    system: 'bg-gray-500',
};

// Format relative time
function formatRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${diffDay}d ago`;
}

// Truncate wallet address
function truncateWallet(wallet) {
    if (!wallet) return '-';
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

export default function LogsViewer() {
    const { publicKey } = useWallet();
    const [logs, setLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [statsLoading, setStatsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters
    const [filters, setFilters] = useState({
        category: '',
        severity: '',
        projectSubdomain: '',
        actorWallet: '',
        search: '',
    });

    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const limit = 50;

    // Real-time subscription ref
    const subscriptionRef = useRef(null);

    // Auto-refresh state
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    // Fetch logs
    const fetchLogs = useCallback(async () => {
        if (!publicKey) return;

        setLoading(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            // Build query params
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });

            if (filters.category) params.append('category', filters.category);
            if (filters.severity) params.append('severity', filters.severity);
            if (filters.projectSubdomain) params.append('projectSubdomain', filters.projectSubdomain);
            if (filters.actorWallet) params.append('actorWallet', filters.actorWallet);
            if (filters.search) params.append('search', filters.search);

            const response = await fetch(`${backendUrl}/api/logs?${params}`, {
                headers: {
                    'Authorization': `Bearer ${publicKey.toString()}`,
                    'x-wallet-address': publicKey.toString(),
                },
            });

            const result = await response.json();

            if (result.success) {
                setLogs(result.data.logs);
                setTotalPages(result.data.pagination.totalPages);
                setTotal(result.data.pagination.total);
                setLastRefresh(new Date());
            } else {
                setError(result.error);
            }
        } catch (err) {
            console.error('Error fetching logs:', err);
            setError('Failed to fetch logs');
        } finally {
            setLoading(false);
        }
    }, [publicKey, page, filters]);

    // Fetch stats
    const fetchStats = useCallback(async () => {
        if (!publicKey) return;

        setStatsLoading(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            const response = await fetch(`${backendUrl}/api/logs/stats?hours=24`, {
                headers: {
                    'Authorization': `Bearer ${publicKey.toString()}`,
                    'x-wallet-address': publicKey.toString(),
                },
            });

            const result = await response.json();

            if (result.success) {
                setStats(result.data);
            }
        } catch (err) {
            console.error('Error fetching stats:', err);
        } finally {
            setStatsLoading(false);
        }
    }, [publicKey]);

    // Initial load
    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [fetchLogs, fetchStats]);

    // Setup real-time subscription
    useEffect(() => {
        if (!autoRefresh) return;

        // Subscribe to new logs
        const channel = supabase
            .channel('activity-logs-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'activity_logs',
                },
                (payload) => {
                    console.log('New log received:', payload);
                    // Prepend new log to list if on first page
                    if (page === 1) {
                        setLogs(prev => [payload.new, ...prev.slice(0, limit - 1)]);
                        setTotal(prev => prev + 1);
                        setLastRefresh(new Date());
                    }
                }
            )
            .subscribe();

        subscriptionRef.current = channel;

        return () => {
            if (subscriptionRef.current) {
                supabase.removeChannel(subscriptionRef.current);
            }
        };
    }, [autoRefresh, page]);

    // Handle filter change
    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1); // Reset to first page on filter change
    };

    // Clear filters
    const clearFilters = () => {
        setFilters({
            category: '',
            severity: '',
            projectSubdomain: '',
            actorWallet: '',
            search: '',
        });
        setPage(1);
    };

    // Get explorer URL for transaction
    const getExplorerUrl = (signature) => {
        if (!signature) return null;
        const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
        return `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DegenCard variant="white" padding="md">
                    <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-1">Total Logs (24h)</p>
                    <p className="text-degen-black text-2xl font-bold">
                        {statsLoading ? '...' : stats?.totalLogs?.toLocaleString() || 0}
                    </p>
                </DegenCard>
                <DegenCard variant="white" padding="md">
                    <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-1">Errors</p>
                    <p className="text-red-500 text-2xl font-bold">
                        {statsLoading ? '...' : (stats?.severity?.error || 0) + (stats?.severity?.critical || 0)}
                    </p>
                </DegenCard>
                <DegenCard variant="white" padding="md">
                    <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-1">Warnings</p>
                    <p className="text-yellow-500 text-2xl font-bold">
                        {statsLoading ? '...' : stats?.severity?.warning || 0}
                    </p>
                </DegenCard>
                <DegenCard variant="white" padding="md">
                    <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-1">Active Projects</p>
                    <p className="text-degen-black text-2xl font-bold">
                        {statsLoading ? '...' : stats?.topProjects?.length || 0}
                    </p>
                </DegenCard>
            </div>

            {/* Recent Errors Alert */}
            {stats?.recentErrors?.length > 0 && (
                <DegenCard variant="white" className="border-red-500 border-2" padding="md">
                    <h3 className="text-red-500 font-bold mb-2">Recent Errors ({stats.recentErrors.length})</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {stats.recentErrors.slice(0, 5).map((err, i) => (
                            <div key={i} className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                                <div className="flex justify-between">
                                    <span className="font-mono text-red-700">{err.event_type}</span>
                                    <span className="text-red-400">{formatRelativeTime(err.created_at)}</span>
                                </div>
                                {err.error_message && (
                                    <p className="text-red-600 text-xs mt-1 truncate">{err.error_message}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </DegenCard>
            )}

            {/* Filters */}
            <DegenCard variant="white" padding="md">
                <div className="flex flex-wrap gap-3 items-end">
                    {/* Category Filter */}
                    <div className="w-32">
                        <label className="block text-xs text-degen-text-muted mb-1">Category</label>
                        <select
                            value={filters.category}
                            onChange={(e) => handleFilterChange('category', e.target.value)}
                            className="w-full px-2 py-1.5 border border-degen-black text-sm bg-white"
                        >
                            <option value="">All</option>
                            <option value="project">Project</option>
                            <option value="box">Box</option>
                            <option value="treasury">Treasury</option>
                            <option value="withdrawal">Withdrawal</option>
                            <option value="admin">Admin</option>
                            <option value="error">Error</option>
                            <option value="system">System</option>
                        </select>
                    </div>

                    {/* Severity Filter */}
                    <div className="w-32">
                        <label className="block text-xs text-degen-text-muted mb-1">Severity</label>
                        <select
                            value={filters.severity}
                            onChange={(e) => handleFilterChange('severity', e.target.value)}
                            className="w-full px-2 py-1.5 border border-degen-black text-sm bg-white"
                        >
                            <option value="">All</option>
                            <option value="debug">Debug</option>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="error">Error</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>

                    {/* Project Search */}
                    <div className="w-40">
                        <label className="block text-xs text-degen-text-muted mb-1">Project</label>
                        <input
                            type="text"
                            value={filters.projectSubdomain}
                            onChange={(e) => handleFilterChange('projectSubdomain', e.target.value)}
                            placeholder="subdomain..."
                            className="w-full px-2 py-1.5 border border-degen-black text-sm"
                        />
                    </div>

                    {/* Wallet Search */}
                    <div className="w-40">
                        <label className="block text-xs text-degen-text-muted mb-1">Wallet</label>
                        <input
                            type="text"
                            value={filters.actorWallet}
                            onChange={(e) => handleFilterChange('actorWallet', e.target.value)}
                            placeholder="wallet address..."
                            className="w-full px-2 py-1.5 border border-degen-black text-sm"
                        />
                    </div>

                    {/* Text Search */}
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs text-degen-text-muted mb-1">Search</label>
                        <input
                            type="text"
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            placeholder="Search error messages..."
                            className="w-full px-2 py-1.5 border border-degen-black text-sm"
                        />
                    </div>

                    {/* Actions */}
                    <DegenButton onClick={clearFilters} variant="secondary" size="sm">
                        Clear
                    </DegenButton>
                    <DegenButton onClick={fetchLogs} variant="primary" size="sm">
                        Refresh
                    </DegenButton>
                </div>

                {/* Auto-refresh toggle and status */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <span className="text-degen-text-muted">Live updates</span>
                        </label>
                        {autoRefresh && (
                            <span className="text-green-500 text-xs flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                Connected
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-degen-text-muted">
                        Last updated: {lastRefresh.toLocaleTimeString()} |
                        Showing {logs.length} of {total.toLocaleString()} logs
                    </div>
                </div>
            </DegenCard>

            {/* Logs Table */}
            <DegenCard variant="white" padding="none">
                {loading ? (
                    <div className="p-8 text-center">
                        <DegenLoadingState message="Loading logs..." />
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-red-500">
                        {error}
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center text-degen-text-muted">
                        No logs found matching your filters
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actor</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">TX</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <div className="text-gray-900">{formatRelativeTime(log.created_at)}</div>
                                            <div className="text-xs text-gray-400">
                                                {new Date(log.created_at).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <span className={`inline-block px-2 py-0.5 text-xs font-medium text-white rounded ${severityColors[log.severity] || 'bg-gray-400'}`}>
                                                {log.severity}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-block px-1.5 py-0.5 text-xs text-white rounded ${categoryColors[log.event_category] || 'bg-gray-400'}`}>
                                                    {log.event_category}
                                                </span>
                                                <span className="font-mono text-xs">{log.event_type}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            {log.project_subdomain ? (
                                                <span className="text-purple-600 font-medium">{log.project_subdomain}</span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            <div className="flex items-center gap-1">
                                                <span className={`text-xs px-1 py-0.5 rounded ${
                                                    log.actor_type === 'admin' ? 'bg-blue-100 text-blue-700' :
                                                    log.actor_type === 'creator' ? 'bg-purple-100 text-purple-700' :
                                                    log.actor_type === 'user' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                    {log.actor_type}
                                                </span>
                                                {log.actor_wallet && (
                                                    <a
                                                        href={`https://explorer.solana.com/address/${log.actor_wallet}?cluster=${process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet'}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="font-mono text-xs text-blue-500 hover:underline"
                                                    >
                                                        {truncateWallet(log.actor_wallet)}
                                                    </a>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 whitespace-nowrap">
                                            {log.transaction_signature ? (
                                                <a
                                                    href={getExplorerUrl(log.transaction_signature)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="font-mono text-xs text-blue-500 hover:underline"
                                                >
                                                    {log.transaction_signature.slice(0, 8)}...
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {log.error_message ? (
                                                <span className="text-red-600 text-xs truncate max-w-[200px] block" title={log.error_message}>
                                                    {log.error_message.slice(0, 50)}...
                                                </span>
                                            ) : log.amount_tokens ? (
                                                <span className="text-gray-600 text-xs">
                                                    {(Number(log.amount_tokens) / 1e9).toFixed(2)} tokens
                                                </span>
                                            ) : log.metadata && Object.keys(log.metadata).length > 0 ? (
                                                <button
                                                    onClick={() => console.log('Metadata:', log.metadata)}
                                                    className="text-xs text-blue-500 hover:underline"
                                                    title={JSON.stringify(log.metadata, null, 2)}
                                                >
                                                    View metadata
                                                </button>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                            Page {page} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                            <DegenButton
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                variant="secondary"
                                size="sm"
                            >
                                Previous
                            </DegenButton>
                            <DegenButton
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                variant="secondary"
                                size="sm"
                            >
                                Next
                            </DegenButton>
                        </div>
                    </div>
                )}
            </DegenCard>

            {/* Top Projects (24h) */}
            {stats?.topProjects?.length > 0 && (
                <DegenCard variant="white" padding="md">
                    <h3 className="text-degen-black font-bold mb-3">Most Active Projects (24h)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        {stats.topProjects.map((project, i) => (
                            <div key={i} className="p-2 bg-gray-50 border border-gray-200 rounded text-center">
                                <p className="text-purple-600 font-medium text-sm truncate">{project.subdomain}</p>
                                <p className="text-gray-500 text-xs">{project.count} events</p>
                            </div>
                        ))}
                    </div>
                </DegenCard>
            )}
        </div>
    );
}
