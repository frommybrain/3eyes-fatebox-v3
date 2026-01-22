// components/admin/AdminDashboard.jsx
'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import useNetworkStore from '@/store/useNetworkStore';
import useProjectStore from '@/store/useProjectStore';
import { supabase } from '@/lib/supabase';
import {
    DegenButton,
    DegenCard,
    DegenBadge,
    DegenInput,
    DegenLoadingState,
    useToast,
} from '@/components/ui';
import LogsViewer from './LogsViewer';

export default function AdminDashboard() {
    const { toast } = useToast();
    const { publicKey, connected } = useWallet();
    const { config, configLoading, refreshConfig } = useNetworkStore();
    const { projects, loadAllProjects } = useProjectStore();

    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState('projects'); // 'projects', 'config', 'onchain', 'treasury', or 'logs'
    const [configForm, setConfigForm] = useState({});
    const [saving, setSaving] = useState(false);

    // On-chain config state
    const [onChainConfig, setOnChainConfig] = useState(null);
    const [onChainConfigLoading, setOnChainConfigLoading] = useState(false);
    const [onChainConfigForm, setOnChainConfigForm] = useState({});
    const [savingOnChain, setSavingOnChain] = useState(false);
    const [togglingPause, setTogglingPause] = useState(false);

    // Treasury state
    const [treasuryData, setTreasuryData] = useState(null);
    const [treasuryLoading, setTreasuryLoading] = useState(false);
    const [withdrawingToken, setWithdrawingToken] = useState(null); // tokenMint being withdrawn
    const [treasuryLogs, setTreasuryLogs] = useState([]);
    const [treasuryLogsLoading, setTreasuryLogsLoading] = useState(false);

    // Server health state
    const [serverHealth, setServerHealth] = useState(null); // null = loading, { status, latency, error? }

    // Check if user is admin
    const isAdmin = publicKey && config && publicKey.toString() === config.adminWallet.toString();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Check server health on mount and periodically
    useEffect(() => {
        const checkServerHealth = async () => {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
            const startTime = Date.now();

            try {
                const response = await fetch(`${backendUrl}/health`, {
                    method: 'GET',
                    cache: 'no-store',
                });
                const latency = Date.now() - startTime;

                if (response.ok) {
                    const data = await response.json();
                    setServerHealth({
                        status: 'online',
                        latency,
                        environment: data.environment,
                        version: data.version,
                        timestamp: data.timestamp,
                    });
                } else {
                    setServerHealth({
                        status: 'error',
                        latency,
                        error: `HTTP ${response.status}`,
                    });
                }
            } catch (error) {
                setServerHealth({
                    status: 'offline',
                    latency: Date.now() - startTime,
                    error: error.message,
                });
            }
        };

        // Check immediately
        checkServerHealth();

        // Then check every 30 seconds
        const interval = setInterval(checkServerHealth, 30000);

        return () => clearInterval(interval);
    }, []);

    // Load data when admin is connected
    useEffect(() => {
        if (isAdmin) {
            loadAllProjects();
        }
    }, [isAdmin, loadAllProjects]);

    // Separate effect to update form when config changes
    useEffect(() => {
        if (config && isAdmin) {
            setConfigForm({
                launchFeeAmount: config.launchFeeAmount ? config.launchFeeAmount / 1e6 : 100,
                threeEyesMint: config.threeEyesMint?.toString() || '',
                lootboxProgramId: config.lootboxProgramId?.toString() || config.programId?.toString() || '',
                // Note: vaultFundAmount removed - now calculated dynamically based on box price
                // Note: withdrawalFeePercentage removed - we use box commission instead (on-chain config)
            });
        }
    }, [config, isAdmin]);

    // Load on-chain config when switching to that tab
    const loadOnChainConfig = async () => {
        setOnChainConfigLoading(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
            const response = await fetch(`${backendUrl}/api/admin/platform-config`);
            const result = await response.json();

            if (result.success) {
                setOnChainConfig(result.platformConfig);
                // Initialize form with current values
                const cfg = result.platformConfig;
                setOnChainConfigForm({
                    baseLuck: cfg.baseLuck,
                    maxLuck: cfg.maxLuck,
                    luckTimeInterval: cfg.luckTimeInterval,
                    payoutDud: cfg.payoutMultipliers.dud,
                    payoutRebate: cfg.payoutMultipliers.rebate,
                    payoutBreakeven: cfg.payoutMultipliers.breakeven,
                    payoutProfit: cfg.payoutMultipliers.profit,
                    payoutJackpot: cfg.payoutMultipliers.jackpot ?? 4, // Grok recommends 4x
                    // Tier probabilities (as percentages) - Grok's no-dud model
                    // RTP: Tier1=74.5%, Tier2=85%, Tier3=94%
                    tier1MaxLuck: cfg.tiers?.tier1?.maxLuck ?? 5,
                    tier1Dud: cfg.tiers?.tier1?.dud ?? 0,      // No duds
                    tier1Rebate: cfg.tiers?.tier1?.rebate ?? 72,
                    tier1Breakeven: cfg.tiers?.tier1?.breakeven ?? 17,
                    tier1Profit: cfg.tiers?.tier1?.profit ?? 9,
                    tier2MaxLuck: cfg.tiers?.tier2?.maxLuck ?? 13,
                    tier2Dud: cfg.tiers?.tier2?.dud ?? 0,      // No duds
                    tier2Rebate: cfg.tiers?.tier2?.rebate ?? 57,
                    tier2Breakeven: cfg.tiers?.tier2?.breakeven ?? 26,
                    tier2Profit: cfg.tiers?.tier2?.profit ?? 15,
                    tier3Dud: cfg.tiers?.tier3?.dud ?? 0,      // No duds
                    tier3Rebate: cfg.tiers?.tier3?.rebate ?? 44,
                    tier3Breakeven: cfg.tiers?.tier3?.breakeven ?? 34,
                    tier3Profit: cfg.tiers?.tier3?.profit ?? 20,
                    // Platform commission (as percentage)
                    platformCommission: cfg.platformCommissionPercent ?? 5,
                    // Security settings
                    refundGracePeriod: cfg.refundGracePeriod ?? 120, // 2 minutes default
                });
            } else {
                toast.error('Failed to load on-chain config: ' + result.error);
            }
        } catch (error) {
            console.error('Error loading on-chain config:', error);
            toast.error('Failed to load on-chain config');
        }
        setOnChainConfigLoading(false);
    };

    // Toggle platform pause state
    const handleTogglePlatformPause = async () => {
        if (!onChainConfig) return;

        const newPausedState = !onChainConfig.paused;
        const action = newPausedState ? 'pause' : 'unpause';

        if (!confirm(`Are you sure you want to ${action} the entire platform? ${newPausedState ? 'This will prevent ALL box purchases and settlements.' : 'This will re-enable box purchases and settlements.'}`)) {
            return;
        }

        setTogglingPause(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
            const response = await fetch(`${backendUrl}/api/admin/toggle-pause`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Wallet-Address': publicKey.toString(),
                },
                body: JSON.stringify({ paused: newPausedState }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success(`Platform ${newPausedState ? 'paused' : 'unpaused'} successfully!`);
                // Refresh config to show new state (don't fail if this errors)
                try {
                    await loadOnChainConfig();
                } catch (refreshError) {
                    console.warn('Failed to refresh config after pause toggle:', refreshError);
                    // Still succeeded - manually update local state
                    setOnChainConfig(prev => prev ? { ...prev, paused: newPausedState } : prev);
                }
            } else {
                toast.error('Failed to toggle pause: ' + result.error);
            }
        } catch (error) {
            console.error('Error toggling platform pause:', error);
            toast.error('Failed to toggle platform pause: ' + error.message);
        }
        setTogglingPause(false);
    };

    // Load treasury data
    const loadTreasuryData = async () => {
        setTreasuryLoading(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            // Also load on-chain config if not already loaded (for commission rate)
            if (!onChainConfig) {
                loadOnChainConfig();
            }

            // Load treasury logs in parallel
            loadTreasuryLogs();

            const response = await fetch(`${backendUrl}/api/admin/treasury-balances`);
            const result = await response.json();

            if (result.success) {
                setTreasuryData(result);
            } else {
                toast.error('Failed to load treasury data: ' + result.error);
            }
        } catch (error) {
            console.error('Error loading treasury data:', error);
            toast.error('Failed to load treasury data');
        }
        setTreasuryLoading(false);
    };

    // Load treasury activity logs
    const loadTreasuryLogs = async () => {
        setTreasuryLogsLoading(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
            const response = await fetch(`${backendUrl}/api/admin/treasury-logs?limit=20`);
            const result = await response.json();

            if (result.success) {
                setTreasuryLogs(result.logs);
            } else {
                console.error('Failed to load treasury logs:', result.error);
            }
        } catch (error) {
            console.error('Error loading treasury logs:', error);
        }
        setTreasuryLogsLoading(false);
    };

    // Withdraw token from treasury to admin wallet
    const handleWithdrawToken = async (tokenMint, symbol) => {
        if (!confirm(`Withdraw all ${symbol} from treasury to admin wallet?`)) {
            return;
        }

        setWithdrawingToken(tokenMint);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            const response = await fetch(`${backendUrl}/api/admin/withdraw-treasury`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Wallet-Address': publicKey.toString(),
                },
                body: JSON.stringify({ tokenMint }),
            });

            const result = await response.json();

            if (result.success) {
                toast.success(`Withdrawn ${symbol} to admin wallet!`);
                // Reload treasury data
                loadTreasuryData();
            } else {
                toast.error('Withdrawal failed: ' + result.error);
            }
        } catch (error) {
            console.error('Error withdrawing from treasury:', error);
            toast.error('Failed to withdraw from treasury');
        }
        setWithdrawingToken(null);
    };

    // Save on-chain config
    const handleSaveOnChainConfig = async () => {
        setSavingOnChain(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
            const tiers = onChainConfig.tiers || {};

            // Build update payload - convert multipliers back to basis points
            const payload = {
                baseLuck: onChainConfigForm.baseLuck !== onChainConfig.baseLuck ? onChainConfigForm.baseLuck : undefined,
                maxLuck: onChainConfigForm.maxLuck !== onChainConfig.maxLuck ? onChainConfigForm.maxLuck : undefined,
                luckTimeInterval: onChainConfigForm.luckTimeInterval !== onChainConfig.luckTimeInterval ? onChainConfigForm.luckTimeInterval : undefined,
                payoutDud: onChainConfigForm.payoutDud !== onChainConfig.payoutMultipliers.dud ? Math.round(onChainConfigForm.payoutDud * 10000) : undefined,
                payoutRebate: onChainConfigForm.payoutRebate !== onChainConfig.payoutMultipliers.rebate ? Math.round(onChainConfigForm.payoutRebate * 10000) : undefined,
                payoutBreakeven: onChainConfigForm.payoutBreakeven !== onChainConfig.payoutMultipliers.breakeven ? Math.round(onChainConfigForm.payoutBreakeven * 10000) : undefined,
                payoutProfit: onChainConfigForm.payoutProfit !== onChainConfig.payoutMultipliers.profit ? Math.round(onChainConfigForm.payoutProfit * 10000) : undefined,
                payoutJackpot: onChainConfigForm.payoutJackpot !== onChainConfig.payoutMultipliers.jackpot ? Math.round(onChainConfigForm.payoutJackpot * 10000) : undefined,
                // Tier 1 (convert percentage to basis points: 55% = 5500)
                tier1MaxLuck: onChainConfigForm.tier1MaxLuck !== tiers.tier1?.maxLuck ? onChainConfigForm.tier1MaxLuck : undefined,
                tier1Dud: onChainConfigForm.tier1Dud !== tiers.tier1?.dud ? Math.round(onChainConfigForm.tier1Dud * 100) : undefined,
                tier1Rebate: onChainConfigForm.tier1Rebate !== tiers.tier1?.rebate ? Math.round(onChainConfigForm.tier1Rebate * 100) : undefined,
                tier1Breakeven: onChainConfigForm.tier1Breakeven !== tiers.tier1?.breakeven ? Math.round(onChainConfigForm.tier1Breakeven * 100) : undefined,
                tier1Profit: onChainConfigForm.tier1Profit !== tiers.tier1?.profit ? Math.round(onChainConfigForm.tier1Profit * 100) : undefined,
                // Tier 2
                tier2MaxLuck: onChainConfigForm.tier2MaxLuck !== tiers.tier2?.maxLuck ? onChainConfigForm.tier2MaxLuck : undefined,
                tier2Dud: onChainConfigForm.tier2Dud !== tiers.tier2?.dud ? Math.round(onChainConfigForm.tier2Dud * 100) : undefined,
                tier2Rebate: onChainConfigForm.tier2Rebate !== tiers.tier2?.rebate ? Math.round(onChainConfigForm.tier2Rebate * 100) : undefined,
                tier2Breakeven: onChainConfigForm.tier2Breakeven !== tiers.tier2?.breakeven ? Math.round(onChainConfigForm.tier2Breakeven * 100) : undefined,
                tier2Profit: onChainConfigForm.tier2Profit !== tiers.tier2?.profit ? Math.round(onChainConfigForm.tier2Profit * 100) : undefined,
                // Tier 3
                tier3Dud: onChainConfigForm.tier3Dud !== tiers.tier3?.dud ? Math.round(onChainConfigForm.tier3Dud * 100) : undefined,
                tier3Rebate: onChainConfigForm.tier3Rebate !== tiers.tier3?.rebate ? Math.round(onChainConfigForm.tier3Rebate * 100) : undefined,
                tier3Breakeven: onChainConfigForm.tier3Breakeven !== tiers.tier3?.breakeven ? Math.round(onChainConfigForm.tier3Breakeven * 100) : undefined,
                tier3Profit: onChainConfigForm.tier3Profit !== tiers.tier3?.profit ? Math.round(onChainConfigForm.tier3Profit * 100) : undefined,
                // Platform commission (convert percentage to basis points: 5% = 500)
                platformCommissionBps: onChainConfigForm.platformCommission !== onChainConfig.platformCommissionPercent ? Math.round(onChainConfigForm.platformCommission * 100) : undefined,
                // Security settings
                refundGracePeriod: onChainConfigForm.refundGracePeriod !== onChainConfig.refundGracePeriod ? onChainConfigForm.refundGracePeriod : undefined,
            };

            // Remove undefined values
            Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

            if (Object.keys(payload).length === 0) {
                toast.info('No changes to save');
                setSavingOnChain(false);
                return;
            }

            const response = await fetch(`${backendUrl}/api/admin/update-platform-config`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Wallet-Address': publicKey.toString(),
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result.success) {
                toast.success('On-chain config updated!');

                // Sync luck interval to database if it was changed
                if (payload.luckTimeInterval !== undefined) {
                    try {
                        const { error: dbError } = await supabase
                            .from('super_admin_config')
                            .update({ luck_interval_seconds: payload.luckTimeInterval })
                            .eq('id', 1);

                        if (dbError) {
                            console.error('Failed to sync luck interval to database:', dbError);
                        } else {
                            // Refresh the network config store so other components get the new value
                            await refreshConfig();
                        }
                    } catch (syncError) {
                        console.error('Error syncing luck interval:', syncError);
                    }
                }

                // Reload to get fresh values
                await loadOnChainConfig();
            } else {
                toast.error('Failed to update: ' + result.error);
            }
        } catch (error) {
            console.error('Error saving on-chain config:', error);
            toast.error('Failed to save on-chain config');
        }
        setSavingOnChain(false);
    };

    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            const updates = {
                launch_fee_amount: Math.floor(configForm.launchFeeAmount * 1e6),
                // Note: vault_fund_amount removed - now calculated dynamically based on box price
                // Note: withdrawal_fee_percentage removed - we use box commission instead (on-chain config)
            };

            // Only update token addresses if they're provided
            // Handle both string and object types (PublicKey)
            const threeEyesMintStr = typeof configForm.threeEyesMint === 'string'
                ? configForm.threeEyesMint
                : configForm.threeEyesMint?.toString();

            const lootboxProgramIdStr = typeof configForm.lootboxProgramId === 'string'
                ? configForm.lootboxProgramId
                : configForm.lootboxProgramId?.toString();

            // Validate PublicKey formats before saving
            if (threeEyesMintStr?.trim()) {
                try {
                    new PublicKey(threeEyesMintStr.trim());
                    updates.three_eyes_mint = threeEyesMintStr.trim();
                } catch (error) {
                    toast.error('Invalid $3EYES Token Mint address format. Please enter a valid Solana address.');
                    setSaving(false);
                    return;
                }
            }
            if (lootboxProgramIdStr?.trim()) {
                try {
                    new PublicKey(lootboxProgramIdStr.trim());
                    updates.lootbox_program_id = lootboxProgramIdStr.trim();
                } catch (error) {
                    toast.error('Invalid Lootbox Program ID format. Please enter a valid Solana address.');
                    setSaving(false);
                    return;
                }
            }

            const { error } = await supabase
                .from('super_admin_config')
                .update(updates)
                .eq('id', 1);

            if (error) throw error;

            toast.success('Configuration updated successfully!');
            await refreshConfig();
        } catch (error) {
            console.error('Error updating config:', error);
            toast.error('Failed to update configuration');
        }
        setSaving(false);
    };

    const toggleProjectActive = async (projectId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('projects')
                .update({ is_active: !currentStatus })
                .eq('id', projectId);

            if (error) throw error;

            toast.success(`Project ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
            loadAllProjects();
        } catch (error) {
            console.error('Error toggling project active:', error);
            toast.error('Failed to update project');
        }
    };

    const toggleProjectPaused = async (projectId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('projects')
                .update({ is_paused: !currentStatus })
                .eq('id', projectId);

            if (error) throw error;

            toast.success(`Project ${!currentStatus ? 'paused' : 'unpaused'} successfully`);
            loadAllProjects();
        } catch (error) {
            console.error('Error toggling project paused:', error);
            toast.error('Failed to update project');
        }
    };

    if (!mounted || configLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-degen-bg">
                <DegenLoadingState text="Loading admin dashboard..." />
            </div>
        );
    }

    if (!connected) {
        return (
            <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-degen-black text-4xl font-medium uppercase tracking-wider mb-2">Admin Dashboard</h1>
                        <p className="text-degen-text-muted text-lg">Platform management and configuration</p>
                    </div>
                    <DegenCard variant="white" padding="lg" className="text-center">
                        <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-4">
                            Connect Your Wallet
                        </h2>
                        <p className="text-degen-text-muted mb-6">
                            Please connect your wallet to access the admin dashboard.
                        </p>
                    </DegenCard>
                </div>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8">
                        <h1 className="text-degen-black text-4xl font-medium uppercase tracking-wider mb-2">Admin Dashboard</h1>
                        <p className="text-degen-text-muted text-lg">Platform management and configuration</p>
                    </div>
                    <DegenCard variant="white" padding="lg" className="text-center">
                        <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-4">
                            Access Denied
                        </h2>
                        <p className="text-degen-text-muted mb-6">
                            You do not have admin access to this dashboard.
                        </p>
                    </DegenCard>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-degen-black text-4xl font-medium uppercase tracking-wider">Admin Dashboard</h1>
                        <DegenBadge variant="feature">SUPER ADMIN</DegenBadge>
                    </div>
                    <p className="text-degen-text-muted text-lg">
                        Platform management and configuration
                    </p>
                </div>

                {/* Network & Server Status */}
                <DegenCard variant="white" padding="lg" className="mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-degen-text-muted text-sm uppercase tracking-wider mb-1">Current Network</p>
                            <p className="text-degen-black text-2xl font-medium">
                                {config.network === 'devnet' ? 'Devnet' : 'Mainnet'}
                            </p>
                        </div>
                        <div>
                            <p className="text-degen-text-muted text-sm uppercase tracking-wider mb-1">Production Mode</p>
                            <DegenBadge variant={config.isProduction ? 'error' : 'warning'}>
                                {config.isProduction ? 'LIVE' : 'TESTING'}
                            </DegenBadge>
                        </div>
                        <div>
                            <p className="text-degen-text-muted text-sm uppercase tracking-wider mb-1">RPC URL</p>
                            <p className="text-degen-black text-sm font-mono">{config.rpcUrl ? `${config.rpcUrl.slice(0, 30)}...` : 'Not configured'}</p>
                        </div>
                        <div>
                            <p className="text-degen-text-muted text-sm uppercase tracking-wider mb-1">Backend Server</p>
                            {serverHealth === null ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-degen-text-muted animate-pulse" />
                                    <span className="text-degen-text-muted text-sm">Checking...</span>
                                </div>
                            ) : serverHealth.status === 'online' ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                    <span className="text-green-600 text-sm font-medium">Online</span>
                                    <span className="text-degen-text-muted text-xs">({serverHealth.latency}ms)</span>
                                </div>
                            ) : serverHealth.status === 'error' ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <span className="text-yellow-600 text-sm font-medium">Error</span>
                                    <span className="text-degen-text-muted text-xs" title={serverHealth.error}>({serverHealth.error})</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <span className="text-red-600 text-sm font-medium">Offline</span>
                                    <span className="text-degen-text-muted text-xs" title={serverHealth.error}>(unreachable)</span>
                                </div>
                            )}
                        </div>
                    </div>
                </DegenCard>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <DegenButton
                        onClick={() => setActiveTab('projects')}
                        variant={activeTab === 'projects' ? 'primary' : 'secondary'}
                    >
                        All Projects ({projects.length})
                    </DegenButton>
                    <DegenButton
                        onClick={() => setActiveTab('config')}
                        variant={activeTab === 'config' ? 'primary' : 'secondary'}
                    >
                        Database Config
                    </DegenButton>
                    <DegenButton
                        onClick={() => {
                            setActiveTab('onchain');
                            if (!onChainConfig) loadOnChainConfig();
                        }}
                        variant={activeTab === 'onchain' ? 'primary' : 'secondary'}
                    >
                        On-Chain Config
                    </DegenButton>
                    <DegenButton
                        onClick={() => {
                            setActiveTab('treasury');
                            if (!treasuryData) loadTreasuryData();
                        }}
                        variant={activeTab === 'treasury' ? 'primary' : 'secondary'}
                    >
                        Treasury
                    </DegenButton>
                    <DegenButton
                        onClick={() => setActiveTab('logs')}
                        variant={activeTab === 'logs' ? 'primary' : 'secondary'}
                    >
                        Activity Logs
                    </DegenButton>
                </div>

                {/* Projects Tab */}
                {activeTab === 'projects' && (
                    <DegenCard variant="white" padding="lg">
                        <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-6">All Projects</h2>

                        {projects.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-degen-text-muted">No projects yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {projects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="p-4 bg-degen-bg border border-degen-black flex items-center justify-between"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-degen-black font-medium">{project.project_name}</h3>
                                                <DegenBadge variant={project.is_active ? 'success' : 'error'}>
                                                    {project.is_active ? 'ACTIVE' : 'INACTIVE'}
                                                </DegenBadge>
                                                <DegenBadge variant={project.is_paused ? 'warning' : 'info'}>
                                                    {project.is_paused ? 'PAUSED' : 'RUNNING'}
                                                </DegenBadge>
                                            </div>
                                            <p className="text-degen-text-muted text-sm mb-2">{project.subdomain}.degenbox.fun</p>
                                            <div className="flex gap-6 text-sm">
                                                <span className="text-degen-text-muted">Owner: {project.owner_wallet.slice(0, 8)}...</span>
                                                <span className="text-degen-text-muted">Boxes: {project.boxes_created || 0}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <DegenButton
                                                onClick={() => toggleProjectActive(project.id, project.is_active)}
                                                variant={project.is_active ? 'warning' : 'success'}
                                                size="sm"
                                            >
                                                {project.is_active ? 'Deactivate' : 'Activate'}
                                            </DegenButton>
                                            <DegenButton
                                                onClick={() => toggleProjectPaused(project.id, project.is_paused)}
                                                variant={project.is_paused ? 'blue' : 'feature'}
                                                size="sm"
                                            >
                                                {project.is_paused ? 'Unpause' : 'Pause'}
                                            </DegenButton>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DegenCard>
                )}

                {/* Config Tab */}
                {activeTab === 'config' && (
                    <DegenCard variant="white" padding="lg">
                        <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-6">Platform Configuration</h2>

                        {/* Token Addresses Section */}
                        <div className="mb-8 p-6 bg-degen-bg border border-degen-black">
                            <h3 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">Token Addresses</h3>

                            {/* $3EYES Token Mint */}
                            <div className="mb-6">
                                <DegenInput
                                    label="$3EYES Token Mint Address"
                                    value={configForm.threeEyesMint}
                                    onChange={(e) => setConfigForm({ ...configForm, threeEyesMint: e.target.value })}
                                    placeholder="Enter token mint address"
                                    className="font-mono text-sm"
                                />
                                <p className="text-degen-text-muted text-sm mt-1">
                                    Platform token used for launch fees
                                </p>
                                {config.network === 'devnet' && (
                                    <p className="text-degen-warning text-sm mt-1">
                                        Use devnet test token address for testing
                                    </p>
                                )}
                            </div>

                            {/* Lootbox Program ID */}
                            <div className="mb-6">
                                <DegenInput
                                    label="Lootbox Program ID"
                                    value={configForm.lootboxProgramId || ''}
                                    onChange={(e) => setConfigForm({ ...configForm, lootboxProgramId: e.target.value })}
                                    placeholder={config.lootboxProgramId?.toString() || "Enter program ID (after deployment)"}
                                    className="font-mono text-sm"
                                />
                                <p className="text-degen-text-muted text-sm mt-1">
                                    On-chain program address (same on devnet and mainnet if using same deploy wallet)
                                </p>
                            </div>
                        </div>

                        

                        {/* Fees Section */}
                        <div className="mb-8 p-6 bg-degen-bg border border-degen-black">
                            <h3 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">Platform Fees</h3>

                            {/* Launch Fee */}
                            <div className="mb-6">
                                <DegenInput
                                    label="Launch Fee (in $3EYES tokens)"
                                    type="number"
                                    value={configForm.launchFeeAmount}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                        setConfigForm({ ...configForm, launchFeeAmount: isNaN(value) ? 0 : value });
                                    }}
                                    min="0"
                                    step="1"
                                />
                                <p className="text-degen-text-muted text-sm mt-1">
                                    Fee users must pay to create a new project
                                </p>
                            </div>

                            
                        </div>

                        {/* Current Values Display */}
                        <div className="mb-6 p-4 bg-degen-bg border border-degen-black">
                            <p className="text-degen-text-muted text-sm uppercase tracking-wider mb-2">Current Configuration:</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-degen-text-muted text-xs uppercase tracking-wider">$3EYES Token</p>
                                    <p className="text-degen-black font-mono text-xs break-all">
                                        {config.threeEyesMint?.toString() ?
                                            `${config.threeEyesMint.toString().slice(0, 20)}...` :
                                            'Not set'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-degen-text-muted text-xs uppercase tracking-wider">Program ID</p>
                                    <p className="text-degen-black font-mono text-xs break-all">
                                        {config.lootboxProgramId?.toString() ?
                                            `${config.lootboxProgramId.toString().slice(0, 20)}...` :
                                            'Not set'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-degen-text-muted text-xs uppercase tracking-wider">Launch Fee</p>
                                    <p className="text-degen-black font-medium">{config.launchFeeAmount / 1e6} $3EYES</p>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <DegenButton
                            onClick={handleSaveConfig}
                            disabled={saving}
                            variant="primary"
                            size="lg"
                            className="w-full"
                        >
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </DegenButton>

                        {/* Warning */}
                        <div className="mt-6 p-4 bg-degen-yellow border border-degen-black">
                            <p className="text-degen-black text-sm">
                                <strong>Note:</strong> Configuration changes take effect immediately for all new operations.
                            </p>
                        </div>
                    </DegenCard>
                )}

                {/* On-Chain Config Tab */}
                {activeTab === 'onchain' && (
                    <DegenCard variant="white" padding="lg">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider">On-Chain Platform Config</h2>
                            <DegenButton
                                onClick={loadOnChainConfig}
                                variant="secondary"
                                size="sm"
                                disabled={onChainConfigLoading}
                            >
                                {onChainConfigLoading ? 'Loading...' : 'Refresh'}
                            </DegenButton>
                        </div>

                        {onChainConfigLoading && !onChainConfig ? (
                            <DegenLoadingState text="Loading on-chain config..." />
                        ) : onChainConfig ? (
                            <>
                                {/* PDA Info */}
                                <div className="mb-6 p-4 bg-degen-bg border border-degen-black">
                                    <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-1">Platform Config PDA</p>
                                    <p className="text-degen-black font-mono text-sm break-all">{onChainConfig.pda}</p>
                                    <div className="mt-2 flex gap-4">
                                        <div>
                                            <p className="text-degen-text-muted text-xs">Admin</p>
                                            <p className="text-degen-black font-mono text-xs">{onChainConfig.admin?.slice(0, 20)}...</p>
                                        </div>
                                        <div>
                                            <p className="text-degen-text-muted text-xs">Status</p>
                                            <DegenBadge variant={onChainConfig.paused ? 'error' : 'success'}>
                                                {onChainConfig.paused ? 'PAUSED' : 'ACTIVE'}
                                            </DegenBadge>
                                        </div>
                                    </div>
                                </div>

                                {/* Emergency Controls */}
                                <div className={`mb-6 p-4 border-2 ${onChainConfig.paused ? 'bg-red-100 border-red-500' : 'bg-green-100 border-green-500'}`}>
                                    <h3 className="text-degen-black text-lg font-medium uppercase tracking-wider mb-3">Emergency Controls</h3>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-degen-black font-medium">
                                                Platform is currently: <span className={onChainConfig.paused ? 'text-red-600' : 'text-green-600'}>
                                                    {onChainConfig.paused ? 'PAUSED' : 'ACTIVE'}
                                                </span>
                                            </p>
                                            <p className="text-degen-text-muted text-sm mt-1">
                                                {onChainConfig.paused
                                                    ? 'All box purchases and settlements are currently disabled.'
                                                    : 'Users can purchase and settle boxes normally.'}
                                            </p>
                                        </div>
                                        <DegenButton
                                            onClick={handleTogglePlatformPause}
                                            variant={onChainConfig.paused ? 'success' : 'danger'}
                                            size="lg"
                                            disabled={togglingPause}
                                        >
                                            {togglingPause
                                                ? 'Processing...'
                                                : onChainConfig.paused
                                                    ? 'UNPAUSE PLATFORM'
                                                    : 'PAUSE PLATFORM'}
                                        </DegenButton>
                                    </div>
                                    {onChainConfig.paused && (
                                        <div className="mt-3 p-2 bg-red-200 border border-red-400 text-red-800 text-sm">
                                            <strong>Warning:</strong> The platform is paused. Users cannot purchase or settle boxes until you unpause.
                                        </div>
                                    )}
                                </div>

                                {/* Platform Commission */}
                                <div className="mb-8 p-6 bg-degen-bg border border-degen-black">
                                    <h3 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">Platform Commission</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <DegenInput
                                                label="Commission Rate (%)"
                                                type="number"
                                                value={onChainConfigForm.platformCommission ?? 5}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, platformCommission: parseFloat(e.target.value) || 0 })}
                                                min="0"
                                                max="50"
                                                step="0.5"
                                            />
                                            <p className="text-degen-text-muted text-xs mt-1">Percentage taken from box purchases (sent to treasury)</p>
                                        </div>
                                        <div className="flex items-end">
                                            <div className="p-3 bg-degen-white border border-degen-black w-full">
                                                <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-1">Current On-Chain Value</p>
                                                <p className="text-degen-black font-medium text-lg">{onChainConfig.platformCommissionPercent ?? 5}%</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Luck Parameters */}
                                <div className="mb-8 p-6 bg-degen-yellow border border-degen-black">
                                    <h3 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">Luck Parameters</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <DegenInput
                                                label="Base Luck"
                                                type="number"
                                                value={onChainConfigForm.baseLuck ?? 5}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, baseLuck: parseInt(e.target.value) || 5 })}
                                                min="0"
                                                max="255"
                                            />
                                            <p className="text-degen-text-muted text-xs mt-1">Starting luck for new boxes</p>
                                        </div>
                                        <div>
                                            <DegenInput
                                                label="Max Luck"
                                                type="number"
                                                value={onChainConfigForm.maxLuck ?? 60}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, maxLuck: parseInt(e.target.value) || 60 })}
                                                min="0"
                                                max="255"
                                            />
                                            <p className="text-degen-text-muted text-xs mt-1">Maximum luck cap</p>
                                        </div>
                                        <div>
                                            <DegenInput
                                                label="Platform Default Luck Interval (seconds)"
                                                type="number"
                                                value={onChainConfigForm.luckTimeInterval ?? 3}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, luckTimeInterval: parseInt(e.target.value) || 3 })}
                                                min="1"
                                            />
                                            <p className="text-degen-text-muted text-xs mt-1">Seconds per +1 luck (projects can override this)</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <DegenButton
                                            onClick={() => setOnChainConfigForm({ ...onChainConfigForm, luckTimeInterval: 3 })}
                                            variant="warning"
                                            size="sm"
                                        >
                                            Dev Mode (3s)
                                        </DegenButton>
                                        <DegenButton
                                            onClick={() => setOnChainConfigForm({ ...onChainConfigForm, luckTimeInterval: 10800 })}
                                            variant="success"
                                            size="sm"
                                        >
                                            Production (3 hours)
                                        </DegenButton>
                                    </div>
                                </div>

                                {/* Security Settings */}
                                <div className="mb-8 p-6 bg-degen-bg border border-degen-black">
                                    <h3 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">Security Settings</h3>
                                    <p className="text-degen-text-muted text-sm mb-4">
                                        Platform-wide security parameters for refunds
                                    </p>
                                    <div>
                                        <DegenInput
                                            label="Refund Grace Period (seconds)"
                                            type="number"
                                            value={onChainConfigForm.refundGracePeriod ?? 120}
                                            onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, refundGracePeriod: parseInt(e.target.value) || 120 })}
                                            min="0"
                                        />
                                        <p className="text-degen-text-muted text-xs mt-1">
                                            Time users must wait after opening before they can request a refund (prevents gaming)
                                        </p>
                                        <div className="mt-2 flex gap-2">
                                            <DegenButton
                                                onClick={() => setOnChainConfigForm({ ...onChainConfigForm, refundGracePeriod: 60 })}
                                                variant="warning"
                                                size="sm"
                                            >
                                                1 min (Dev)
                                            </DegenButton>
                                            <DegenButton
                                                onClick={() => setOnChainConfigForm({ ...onChainConfigForm, refundGracePeriod: 120 })}
                                                variant="success"
                                                size="sm"
                                            >
                                                2 min
                                            </DegenButton>
                                            <DegenButton
                                                onClick={() => setOnChainConfigForm({ ...onChainConfigForm, refundGracePeriod: 300 })}
                                                variant="info"
                                                size="sm"
                                            >
                                                5 min
                                            </DegenButton>
                                        </div>
                                    </div>
                                </div>

                                {/* Payout Multipliers */}
                                <div className="mb-8 p-6 bg-degen-bg border border-degen-black">
                                    <h3 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">Payout Multipliers</h3>
                                    <p className="text-degen-text-muted text-sm mb-4">
                                        Enter as decimal (e.g., 0.8 = 0.8x, 2.5 = 2.5x, 10 = 10x)
                                    </p>
                                    <div className="grid grid-cols-5 gap-4">
                                        <div>
                                            <DegenInput
                                                label="Dud (0x)"
                                                type="number"
                                                value={onChainConfigForm.payoutDud ?? 0}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, payoutDud: parseFloat(e.target.value) || 0 })}
                                                min="0"
                                                step="0.1"
                                            />
                                        </div>
                                        <div>
                                            <DegenInput
                                                label="Rebate"
                                                type="number"
                                                value={onChainConfigForm.payoutRebate ?? 0.8}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, payoutRebate: parseFloat(e.target.value) || 0.8 })}
                                                min="0"
                                                step="0.1"
                                            />
                                        </div>
                                        <div>
                                            <DegenInput
                                                label="Break-even"
                                                type="number"
                                                value={onChainConfigForm.payoutBreakeven ?? 1}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, payoutBreakeven: parseFloat(e.target.value) || 1 })}
                                                min="0"
                                                step="0.1"
                                            />
                                        </div>
                                        <div>
                                            <DegenInput
                                                label="Profit"
                                                type="number"
                                                value={onChainConfigForm.payoutProfit ?? 2.5}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, payoutProfit: parseFloat(e.target.value) || 2.5 })}
                                                min="0"
                                                step="0.1"
                                            />
                                        </div>
                                        <div>
                                            <DegenInput
                                                label="Jackpot"
                                                type="number"
                                                value={onChainConfigForm.payoutJackpot ?? 10}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, payoutJackpot: parseFloat(e.target.value) || 10 })}
                                                min="0"
                                                step="0.5"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-4 p-3 bg-degen-white border border-degen-black">
                                        <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-2">Current On-Chain Values:</p>
                                        <div className="flex gap-4 text-sm">
                                            <span>Dud: <strong>{onChainConfig.payoutMultipliers.dud}x</strong></span>
                                            <span>Rebate: <strong>{onChainConfig.payoutMultipliers.rebate}x</strong></span>
                                            <span>Break-even: <strong>{onChainConfig.payoutMultipliers.breakeven}x</strong></span>
                                            <span>Profit: <strong>{onChainConfig.payoutMultipliers.profit}x</strong></span>
                                            <span>Jackpot: <strong>{onChainConfig.payoutMultipliers.jackpot}x</strong></span>
                                        </div>
                                    </div>
                                </div>

                                {/* EV/RTP Calculator */}
                                <div className="mb-8 p-6 bg-degen-primary border border-degen-black">
                                    <h3 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-2">Expected Value & RTP Calculator</h3>
                                    <p className="text-degen-text-muted text-sm mb-4">
                                        Real-time calculation of Expected Value (EV) and Return To Player (RTP) based on current probability settings.
                                        <strong> House always wins when RTP &lt; 100%.</strong>
                                    </p>

                                    {/* Formula explanation */}
                                    <div className="mb-4 p-3 bg-degen-white border border-degen-black text-sm">
                                        <p className="text-degen-black font-medium mb-1">Formula:</p>
                                        <p className="text-degen-text-muted font-mono text-xs">
                                            EV = (Dud% × {onChainConfigForm.payoutDud || 0}x) + (Rebate% × {onChainConfigForm.payoutRebate || 0.5}x) + (Break-even% × {onChainConfigForm.payoutBreakeven || 1}x) + (Profit% × {onChainConfigForm.payoutProfit || 1.5}x) + (Jackpot% × {onChainConfigForm.payoutJackpot || 3}x)
                                        </p>
                                        <p className="text-degen-text-muted mt-1">RTP = EV × 100% | House Edge = 100% - RTP</p>
                                    </div>

                                    {/* Calculate EVs for each tier */}
                                    {(() => {
                                        const payouts = {
                                            dud: onChainConfigForm.payoutDud || 0,
                                            rebate: onChainConfigForm.payoutRebate || 0.5,
                                            breakeven: onChainConfigForm.payoutBreakeven || 1,
                                            profit: onChainConfigForm.payoutProfit || 1.5,
                                            jackpot: onChainConfigForm.payoutJackpot || 4, // Grok recommends 4x
                                        };

                                        const calcEV = (dud, rebate, breakeven, profit) => {
                                            const jackpot = Math.max(0, 100 - dud - rebate - breakeven - profit);
                                            return (
                                                (dud / 100) * payouts.dud +
                                                (rebate / 100) * payouts.rebate +
                                                (breakeven / 100) * payouts.breakeven +
                                                (profit / 100) * payouts.profit +
                                                (jackpot / 100) * payouts.jackpot
                                            );
                                        };

                                        // Grok's no-dud model defaults
                                        // RTP: Tier1=74.5%, Tier2=85%, Tier3=94%
                                        const tier1EV = calcEV(
                                            onChainConfigForm.tier1Dud ?? 0,     // No duds
                                            onChainConfigForm.tier1Rebate ?? 72,
                                            onChainConfigForm.tier1Breakeven ?? 17,
                                            onChainConfigForm.tier1Profit ?? 9
                                        );
                                        const tier2EV = calcEV(
                                            onChainConfigForm.tier2Dud ?? 0,     // No duds
                                            onChainConfigForm.tier2Rebate ?? 57,
                                            onChainConfigForm.tier2Breakeven ?? 26,
                                            onChainConfigForm.tier2Profit ?? 15
                                        );
                                        const tier3EV = calcEV(
                                            onChainConfigForm.tier3Dud ?? 0,     // No duds
                                            onChainConfigForm.tier3Rebate ?? 44,
                                            onChainConfigForm.tier3Breakeven ?? 34,
                                            onChainConfigForm.tier3Profit ?? 20
                                        );

                                        const getVariant = (rtp) => {
                                            if (rtp >= 100) return 'error'; // House loses
                                            if (rtp >= 95) return 'warning'; // Very close
                                            if (rtp >= 85) return 'success'; // Healthy
                                            return 'info'; // High house edge
                                        };

                                        const getAdvice = (rtp, tierName) => {
                                            if (rtp >= 100) return `${tierName}: LOSING MONEY - reduce payouts or jackpot chance`;
                                            if (rtp >= 95) return `${tierName}: Very generous - only 5% house edge`;
                                            if (rtp >= 85) return `${tierName}: Healthy - players feel rewarded, house profits`;
                                            if (rtp >= 70) return `${tierName}: Moderate - reasonable for lower luck tiers`;
                                            return `${tierName}: Punishing - may discourage replays`;
                                        };

                                        return (
                                            <div className="space-y-4">
                                                {/* Tier 1 - Low Luck */}
                                                <div className="p-4 bg-degen-white border border-degen-black">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-degen-black font-medium">Tier 1 (Low Luck: 0-{onChainConfigForm.tier1MaxLuck || 5})</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-degen-text-muted">EV: <strong>{tier1EV.toFixed(3)}x</strong></span>
                                                            <DegenBadge variant={getVariant(tier1EV * 100)}>
                                                                RTP: {(tier1EV * 100).toFixed(1)}%
                                                            </DegenBadge>
                                                            <span className="text-degen-text-muted text-sm">House Edge: {(100 - tier1EV * 100).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-degen-text-muted">{getAdvice(tier1EV * 100, 'Tier 1')}</p>
                                                </div>

                                                {/* Tier 2 - Medium Luck */}
                                                <div className="p-4 bg-degen-white border border-degen-black">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-degen-black font-medium">Tier 2 (Medium Luck: {(onChainConfigForm.tier1MaxLuck || 5) + 1}-{onChainConfigForm.tier2MaxLuck || 13})</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-degen-text-muted">EV: <strong>{tier2EV.toFixed(3)}x</strong></span>
                                                            <DegenBadge variant={getVariant(tier2EV * 100)}>
                                                                RTP: {(tier2EV * 100).toFixed(1)}%
                                                            </DegenBadge>
                                                            <span className="text-degen-text-muted text-sm">House Edge: {(100 - tier2EV * 100).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-degen-text-muted">{getAdvice(tier2EV * 100, 'Tier 2')}</p>
                                                </div>

                                                {/* Tier 3 - High Luck */}
                                                <div className="p-4 bg-degen-white border border-degen-black">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-degen-black font-medium">Tier 3 (High Luck: {(onChainConfigForm.tier2MaxLuck || 13) + 1}-{onChainConfigForm.maxLuck || 60})</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-degen-text-muted">EV: <strong>{tier3EV.toFixed(3)}x</strong></span>
                                                            <DegenBadge variant={getVariant(tier3EV * 100)}>
                                                                RTP: {(tier3EV * 100).toFixed(1)}%
                                                            </DegenBadge>
                                                            <span className="text-degen-text-muted text-sm">House Edge: {(100 - tier3EV * 100).toFixed(1)}%</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-degen-text-muted">{getAdvice(tier3EV * 100, 'Tier 3')}</p>
                                                </div>

                                                
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Tier Probability Thresholds */}
                                <div className="mb-8 p-6 bg-degen-bg border border-degen-black">
                                    <h3 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-2">Tier Probability Thresholds</h3>
                                    <p className="text-degen-text-muted text-sm mb-4">
                                        Set the probability (%) for each outcome at different luck levels. Jackpot % is calculated automatically (100% - others).
                                    </p>

                                    {/* Tier 1 */}
                                    <div className="mb-6 p-4 bg-degen-white border border-degen-black">
                                        <div className="flex items-center gap-4 mb-4">
                                            <h4 className="text-degen-black font-medium">Tier 1: Low Luck</h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-degen-text-muted text-sm">Luck 0 to</span>
                                                <DegenInput
                                                    type="number"
                                                    value={onChainConfigForm.tier1MaxLuck ?? 5}
                                                    onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, tier1MaxLuck: parseInt(e.target.value) || 5 })}
                                                    min="0"
                                                    max="255"
                                                    className="w-20"
                                                />
                                            </div>
                                            <DegenBadge variant="error">Worst Odds</DegenBadge>
                                        </div>
                                        <div className="grid grid-cols-5 gap-3">
                                            <DegenInput
                                                label="Dud %"
                                                type="number"
                                                value={onChainConfigForm.tier1Dud ?? 55}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, tier1Dud: parseFloat(e.target.value) || 0 })}
                                                min="0"
                                                max="100"
                                                step="0.5"
                                            />
                                            <DegenInput
                                                label="Rebate %"
                                                type="number"
                                                value={onChainConfigForm.tier1Rebate ?? 30}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, tier1Rebate: parseFloat(e.target.value) || 0 })}
                                                min="0"
                                                max="100"
                                                step="0.5"
                                            />
                                            <DegenInput
                                                label="Break-even %"
                                                type="number"
                                                value={onChainConfigForm.tier1Breakeven ?? 10}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, tier1Breakeven: parseFloat(e.target.value) || 0 })}
                                                min="0"
                                                max="100"
                                                step="0.5"
                                            />
                                            <DegenInput
                                                label="Profit %"
                                                type="number"
                                                value={onChainConfigForm.tier1Profit ?? 4.5}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, tier1Profit: parseFloat(e.target.value) || 0 })}
                                                min="0"
                                                max="100"
                                                step="0.5"
                                            />
                                            <div>
                                                <p className="text-degen-text-muted text-sm mb-1">Jackpot %</p>
                                                <p className="text-degen-black font-medium text-lg">
                                                    {Math.max(0, 100 - (onChainConfigForm.tier1Dud || 0) - (onChainConfigForm.tier1Rebate || 0) - (onChainConfigForm.tier1Breakeven || 0) - (onChainConfigForm.tier1Profit || 0)).toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tier 2 */}
                                    <div className="mb-6 p-4 bg-degen-white border border-degen-black">
                                        <div className="flex items-center gap-4 mb-4">
                                            <h4 className="text-degen-black font-medium">Tier 2: Medium Luck</h4>
                                            <div className="flex items-center gap-2">
                                                <span className="text-degen-text-muted text-sm">Luck {(onChainConfigForm.tier1MaxLuck || 5) + 1} to</span>
                                                <DegenInput
                                                    type="number"
                                                    value={onChainConfigForm.tier2MaxLuck ?? 13}
                                                    onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, tier2MaxLuck: parseInt(e.target.value) || 13 })}
                                                    min="0"
                                                    max="255"
                                                    className="w-20"
                                                />
                                            </div>
                                            <DegenBadge variant="warning">Medium Odds</DegenBadge>
                                        </div>
                                        <div className="grid grid-cols-5 gap-3">
                                            <DegenInput
                                                label="Dud %"
                                                type="number"
                                                value={onChainConfigForm.tier2Dud ?? 45}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, tier2Dud: parseFloat(e.target.value) || 0 })}
                                                min="0"
                                                max="100"
                                                step="0.5"
                                            />
                                            <DegenInput
                                                label="Rebate %"
                                                type="number"
                                                value={onChainConfigForm.tier2Rebate ?? 30}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, tier2Rebate: parseFloat(e.target.value) || 0 })}
                                                min="0"
                                                max="100"
                                                step="0.5"
                                            />
                                            <DegenInput
                                                label="Break-even %"
                                                type="number"
                                                value={onChainConfigForm.tier2Breakeven ?? 15}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, tier2Breakeven: parseFloat(e.target.value) || 0 })}
                                                min="0"
                                                max="100"
                                                step="0.5"
                                            />
                                            <DegenInput
                                                label="Profit %"
                                                type="number"
                                                value={onChainConfigForm.tier2Profit ?? 8.5}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, tier2Profit: parseFloat(e.target.value) || 0 })}
                                                min="0"
                                                max="100"
                                                step="0.5"
                                            />
                                            <div>
                                                <p className="text-degen-text-muted text-sm mb-1">Jackpot %</p>
                                                <p className="text-degen-black font-medium text-lg">
                                                    {Math.max(0, 100 - (onChainConfigForm.tier2Dud || 0) - (onChainConfigForm.tier2Rebate || 0) - (onChainConfigForm.tier2Breakeven || 0) - (onChainConfigForm.tier2Profit || 0)).toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tier 3 */}
                                    <div className="p-4 bg-degen-white border border-degen-black">
                                        <div className="flex items-center gap-4 mb-4">
                                            <h4 className="text-degen-black font-medium">Tier 3: High Luck</h4>
                                            <span className="text-degen-text-muted text-sm">Luck {(onChainConfigForm.tier2MaxLuck || 13) + 1} to {onChainConfigForm.maxLuck || 60}</span>
                                            <DegenBadge variant="success">Best Odds</DegenBadge>
                                        </div>
                                        <div className="grid grid-cols-5 gap-3">
                                            <DegenInput
                                                label="Dud %"
                                                type="number"
                                                value={onChainConfigForm.tier3Dud ?? 30}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, tier3Dud: parseFloat(e.target.value) || 0 })}
                                                min="0"
                                                max="100"
                                                step="0.5"
                                            />
                                            <DegenInput
                                                label="Rebate %"
                                                type="number"
                                                value={onChainConfigForm.tier3Rebate ?? 25}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, tier3Rebate: parseFloat(e.target.value) || 0 })}
                                                min="0"
                                                max="100"
                                                step="0.5"
                                            />
                                            <DegenInput
                                                label="Break-even %"
                                                type="number"
                                                value={onChainConfigForm.tier3Breakeven ?? 20}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, tier3Breakeven: parseFloat(e.target.value) || 0 })}
                                                min="0"
                                                max="100"
                                                step="0.5"
                                            />
                                            <DegenInput
                                                label="Profit %"
                                                type="number"
                                                value={onChainConfigForm.tier3Profit ?? 20}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, tier3Profit: parseFloat(e.target.value) || 0 })}
                                                min="0"
                                                max="100"
                                                step="0.5"
                                            />
                                            <div>
                                                <p className="text-degen-text-muted text-sm mb-1">Jackpot %</p>
                                                <p className="text-degen-black font-medium text-lg">
                                                    {Math.max(0, 100 - (onChainConfigForm.tier3Dud || 0) - (onChainConfigForm.tier3Rebate || 0) - (onChainConfigForm.tier3Breakeven || 0) - (onChainConfigForm.tier3Profit || 0)).toFixed(1)}%
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Current Values */}
                                    {onChainConfig.tiers && (
                                        <div className="mt-4 p-3 bg-degen-yellow border border-degen-black">
                                            <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-2">Current On-Chain Tier Values:</p>
                                            <div className="space-y-1 text-sm">
                                                <p><strong>Tier 1 (0-{onChainConfig.tiers.tier1?.maxLuck}):</strong> {onChainConfig.tiers.tier1?.dud}% dud, {onChainConfig.tiers.tier1?.rebate}% rebate, {onChainConfig.tiers.tier1?.breakeven}% break-even, {onChainConfig.tiers.tier1?.profit}% profit, {onChainConfig.tiers.tier1?.jackpot}% jackpot</p>
                                                <p><strong>Tier 2 ({(onChainConfig.tiers.tier1?.maxLuck || 5) + 1}-{onChainConfig.tiers.tier2?.maxLuck}):</strong> {onChainConfig.tiers.tier2?.dud}% dud, {onChainConfig.tiers.tier2?.rebate}% rebate, {onChainConfig.tiers.tier2?.breakeven}% break-even, {onChainConfig.tiers.tier2?.profit}% profit, {onChainConfig.tiers.tier2?.jackpot}% jackpot</p>
                                                <p><strong>Tier 3 ({(onChainConfig.tiers.tier2?.maxLuck || 13) + 1}-{onChainConfig.maxLuck}):</strong> {onChainConfig.tiers.tier3?.dud}% dud, {onChainConfig.tiers.tier3?.rebate}% rebate, {onChainConfig.tiers.tier3?.breakeven}% break-even, {onChainConfig.tiers.tier3?.profit}% profit, {onChainConfig.tiers.tier3?.jackpot}% jackpot</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Save Button */}
                                <DegenButton
                                    onClick={handleSaveOnChainConfig}
                                    disabled={savingOnChain}
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                >
                                    {savingOnChain ? 'Updating On-Chain...' : 'Update On-Chain Config'}
                                </DegenButton>

                                {/* Warning */}
                                <div className="mt-6 p-4 bg-degen-yellow border border-degen-black">
                                    <p className="text-degen-black text-sm">
                                        <strong>Warning:</strong> These changes are written directly to the Solana blockchain.
                                        They affect ALL projects and take effect immediately for new box reveals.
                                        This transaction is signed by the server&apos;s deploy wallet.
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-degen-text-muted">Failed to load on-chain config</p>
                                <DegenButton onClick={loadOnChainConfig} variant="primary" className="mt-4">
                                    Retry
                                </DegenButton>
                            </div>
                        )}
                    </DegenCard>
                )}

                {/* Treasury Tab */}
                {activeTab === 'treasury' && (
                    <DegenCard variant="white" padding="lg">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider">Platform Treasury</h2>
                            <DegenButton
                                onClick={loadTreasuryData}
                                variant="secondary"
                                size="sm"
                                disabled={treasuryLoading}
                            >
                                {treasuryLoading ? 'Loading...' : 'Refresh'}
                            </DegenButton>
                        </div>

                        {treasuryLoading && !treasuryData ? (
                            <DegenLoadingState text="Loading treasury data..." />
                        ) : treasuryData ? (
                            <>
                                {/* Treasury PDA Info */}
                                <div className="mb-6 p-4 bg-degen-bg border border-degen-black">
                                    <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-1">Treasury PDA</p>
                                    <p className="text-degen-black font-mono text-sm break-all">{treasuryData.treasuryPDA}</p>
                                    <div className="mt-3 flex gap-8">
                                        <div>
                                            <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-1">Commission Rate</p>
                                            <p className="text-degen-black font-medium">{onChainConfig?.platformCommissionPercent ?? 5}% on all box purchases</p>
                                        </div>
                                        <div>
                                            <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-1">Token Types</p>
                                            <p className="text-degen-black font-medium">{treasuryData.totalTokenTypes || 0}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Token Balances */}
                                <div className="mb-6">
                                    <h3 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">Token Balances</h3>

                                    {treasuryData.balances && treasuryData.balances.length > 0 ? (
                                        <div className="space-y-3">
                                            {treasuryData.balances.map((token, index) => (
                                                <div key={index} className="p-4 bg-degen-bg border border-degen-black">
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-1">
                                                                {token.symbol || 'Token'}
                                                            </p>
                                                            <p className="text-degen-black text-2xl font-medium">
                                                                {token.balanceFormatted?.toLocaleString(undefined, { maximumFractionDigits: 2 }) || '0'}
                                                            </p>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <p className="text-degen-text-muted text-xs uppercase tracking-wider mb-1">Mint</p>
                                                                <p className="text-degen-black font-mono text-xs">
                                                                    {token.tokenMint?.slice(0, 8)}...{token.tokenMint?.slice(-8)}
                                                                </p>
                                                            </div>
                                                            {/* Withdraw button removed - use CLI script instead:
                                                               node backend/scripts/process-treasury-fees.js */}
                                                        </div>
                                                    </div>
                                                    {token.treasuryTokenAccount && (
                                                        <div className="mt-2 pt-2 border-t border-degen-black">
                                                            <p className="text-degen-text-muted text-xs">
                                                                Token Account: <span className="font-mono">{token.treasuryTokenAccount}</span>
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 bg-degen-bg border border-degen-black text-center">
                                            <p className="text-degen-text-muted">No tokens collected yet</p>
                                            <p className="text-degen-text-muted text-sm mt-1">
                                                Treasury will accumulate tokens as boxes are purchased
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Recent Activity */}
                                <div className="mb-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-degen-black text-xl font-medium uppercase tracking-wider">Recent Activity</h3>
                                        <DegenButton
                                            onClick={loadTreasuryLogs}
                                            variant="secondary"
                                            size="sm"
                                            disabled={treasuryLogsLoading}
                                        >
                                            {treasuryLogsLoading ? 'Loading...' : 'Refresh'}
                                        </DegenButton>
                                    </div>

                                    {treasuryLogsLoading && treasuryLogs.length === 0 ? (
                                        <div className="p-4 bg-degen-bg border border-degen-black text-center">
                                            <p className="text-degen-text-muted">Loading activity...</p>
                                        </div>
                                    ) : treasuryLogs.length > 0 ? (
                                        <div className="space-y-2">
                                            {treasuryLogs.map((log) => (
                                                <div key={log.id} className="p-3 bg-degen-bg border border-degen-black">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <DegenBadge variant={
                                                                log.action_type === 'withdraw' ? 'warning' :
                                                                log.action_type === 'swap' ? 'info' :
                                                                log.action_type === 'buyback' ? 'success' :
                                                                log.action_type === 'dev_transfer' ? 'feature' :
                                                                'secondary'
                                                            }>
                                                                {log.action_type?.toUpperCase()}
                                                            </DegenBadge>
                                                            <DegenBadge variant={log.status === 'completed' ? 'success' : 'error'}>
                                                                {log.status?.toUpperCase()}
                                                            </DegenBadge>
                                                        </div>
                                                        <span className="text-degen-text-muted text-xs">
                                                            {new Date(log.processed_at).toLocaleString()}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        {/* Token info */}
                                                        <div>
                                                            <p className="text-degen-text-muted text-xs uppercase">Token</p>
                                                            <p className="text-degen-black font-mono text-xs">
                                                                {log.token_mint?.slice(0, 8)}...{log.token_mint?.slice(-8)}
                                                            </p>
                                                        </div>

                                                        {/* Amount info based on action type */}
                                                        {log.action_type === 'withdraw' && log.amount_withdrawn && (
                                                            <div>
                                                                <p className="text-degen-text-muted text-xs uppercase">Amount Withdrawn</p>
                                                                <p className="text-degen-black font-medium">
                                                                    {(Number(log.amount_withdrawn) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 4 })} ${log.token_symbol || ''}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {log.action_type === 'swap' && log.sol_received && (
                                                            <div>
                                                                <p className="text-degen-text-muted text-xs uppercase">SOL Received</p>
                                                                <p className="text-degen-black font-medium">
                                                                    {(Number(log.sol_received) / 1e9).toFixed(6)} SOL
                                                                </p>
                                                            </div>
                                                        )}
                                                        {log.action_type === 'buyback' && log.three_eyes_bought && (
                                                            <div>
                                                                <p className="text-degen-text-muted text-xs uppercase">$3EYES Bought</p>
                                                                <p className="text-degen-black font-medium">
                                                                    {(Number(log.three_eyes_bought) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {log.action_type === 'dev_transfer' && log.dev_sol_amount && (
                                                            <div>
                                                                <p className="text-degen-text-muted text-xs uppercase">Dev SOL</p>
                                                                <p className="text-degen-black font-medium">
                                                                    {(Number(log.dev_sol_amount) / 1e9).toFixed(6)} SOL
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Solscan Links */}
                                                    <div className="mt-2 pt-2 border-t border-degen-black flex gap-3 flex-wrap">
                                                        {log.explorer_links?.tx_signature && (
                                                            <a
                                                                href={log.explorer_links.tx_signature}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-degen-blue text-xs hover:underline"
                                                            >
                                                                View TX on Solscan
                                                            </a>
                                                        )}
                                                        {log.explorer_links?.swap_to_sol_signature && (
                                                            <a
                                                                href={log.explorer_links.swap_to_sol_signature}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-degen-blue text-xs hover:underline"
                                                            >
                                                                Swap TX
                                                            </a>
                                                        )}
                                                        {log.explorer_links?.buyback_signature && (
                                                            <a
                                                                href={log.explorer_links.buyback_signature}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-degen-blue text-xs hover:underline"
                                                            >
                                                                Buyback TX
                                                            </a>
                                                        )}
                                                        {log.explorer_links?.dev_transfer_signature && (
                                                            <a
                                                                href={log.explorer_links.dev_transfer_signature}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-degen-blue text-xs hover:underline"
                                                            >
                                                                Dev Transfer TX
                                                            </a>
                                                        )}
                                                    </div>

                                                    {/* Error message if failed */}
                                                    {log.status === 'failed' && log.error_message && (
                                                        <div className="mt-2 p-2 bg-red-50 border border-red-200 text-red-600 text-xs">
                                                            {log.error_message}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-degen-bg border border-degen-black text-center">
                                            <p className="text-degen-text-muted">No activity recorded yet</p>
                                            <p className="text-degen-text-muted text-sm mt-1">
                                                Treasury transactions will appear here
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Info about batch processing */}
                                <div className="p-4 bg-degen-bg border border-degen-black">
                                    <h4 className="text-degen-black font-medium uppercase tracking-wider mb-2">Treasury Processing Flow</h4>
                                    <p className="text-degen-text-muted text-sm mb-2">
                                        Platform commission is collected in project tokens during box purchases.
                                    </p>
                                    <ol className="text-degen-text-muted text-sm list-decimal list-inside space-y-1">
                                        <li>Click Withdraw to move tokens to admin wallet</li>
                                        <li>Swap tokens to SOL via Jupiter (jup.ag)</li>
                                        <li>Send 10% SOL to dev wallet</li>
                                        <li>Swap 90% SOL to $3EYES via Jupiter</li>
                                    </ol>
                                    <p className="text-degen-text-muted text-sm mt-2 italic">
                                        Run: <code className="bg-degen-white px-1">node scripts/process-treasury-fees.js --help</code> for full automation
                                    </p>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-degen-text-muted">Failed to load treasury data</p>
                                <DegenButton onClick={loadTreasuryData} variant="primary" className="mt-4">
                                    Retry
                                </DegenButton>
                            </div>
                        )}
                    </DegenCard>
                )}

                {/* Logs Tab */}
                {activeTab === 'logs' && (
                    <LogsViewer />
                )}
            </div>
        </div>
    );
}
