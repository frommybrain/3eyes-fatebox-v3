// components/admin/AdminDashboard.jsx
'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useRouter } from 'next/navigation';
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

export default function AdminDashboard() {
    const router = useRouter();
    const { toast } = useToast();
    const { publicKey, connected } = useWallet();
    const { config, configLoading, refreshConfig } = useNetworkStore();
    const { projects, loadAllProjects } = useProjectStore();

    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState('projects'); // 'projects', 'config', or 'onchain'
    const [configForm, setConfigForm] = useState({});
    const [saving, setSaving] = useState(false);

    // On-chain config state
    const [onChainConfig, setOnChainConfig] = useState(null);
    const [onChainConfigLoading, setOnChainConfigLoading] = useState(false);
    const [onChainConfigForm, setOnChainConfigForm] = useState({});
    const [savingOnChain, setSavingOnChain] = useState(false);

    // Check if user is admin
    const isAdmin = publicKey && config && publicKey.toString() === config.adminWallet.toString();

    useEffect(() => {
        setMounted(true);

        // Redirect if not admin
        if (mounted && (!connected || !isAdmin)) {
            router.push('/');
            return;
        }

        // Load data
        if (isAdmin) {
            loadAllProjects();
        }
    }, [connected, isAdmin, mounted, router, loadAllProjects]);

    // Separate effect to update form when config changes
    useEffect(() => {
        if (config && isAdmin) {
            setConfigForm({
                launchFeeAmount: config.launchFeeAmount ? config.launchFeeAmount / 1e9 : 100,
                withdrawalFeePercentage: config.withdrawalFeePercentage ?? 2.0,
                threeEyesMint: config.threeEyesMint?.toString() || '',
                lootboxProgramId: config.lootboxProgramId?.toString() || config.programId?.toString() || '',
                vaultFundAmount: config.vaultFundAmount ? config.vaultFundAmount / 1e9 : 50000000, // 50M default
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
                    payoutJackpot: cfg.payoutMultipliers.jackpot,
                    // Tier probabilities (as percentages)
                    tier1MaxLuck: cfg.tiers?.tier1?.maxLuck ?? 5,
                    tier1Dud: cfg.tiers?.tier1?.dud ?? 55,
                    tier1Rebate: cfg.tiers?.tier1?.rebate ?? 30,
                    tier1Breakeven: cfg.tiers?.tier1?.breakeven ?? 10,
                    tier1Profit: cfg.tiers?.tier1?.profit ?? 4.5,
                    tier2MaxLuck: cfg.tiers?.tier2?.maxLuck ?? 13,
                    tier2Dud: cfg.tiers?.tier2?.dud ?? 45,
                    tier2Rebate: cfg.tiers?.tier2?.rebate ?? 30,
                    tier2Breakeven: cfg.tiers?.tier2?.breakeven ?? 15,
                    tier2Profit: cfg.tiers?.tier2?.profit ?? 8.5,
                    tier3Dud: cfg.tiers?.tier3?.dud ?? 30,
                    tier3Rebate: cfg.tiers?.tier3?.rebate ?? 25,
                    tier3Breakeven: cfg.tiers?.tier3?.breakeven ?? 20,
                    tier3Profit: cfg.tiers?.tier3?.profit ?? 20,
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (result.success) {
                toast.success('On-chain config updated!');
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
                launch_fee_amount: Math.floor(configForm.launchFeeAmount * 1e9),
                withdrawal_fee_percentage: configForm.withdrawalFeePercentage,
                vault_fund_amount: Math.floor(configForm.vaultFundAmount * 1e9),
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

    if (!connected || !isAdmin) {
        return null; // Will redirect
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

                {/* Network Status */}
                <DegenCard variant="white" padding="lg" className="mb-6">
                    <div className="flex items-center justify-between">
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
                            <p className="text-degen-black text-sm font-mono">{config.rpcUrl.slice(0, 30)}...</p>
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
                                    Platform token used for launch fees and withdrawal fees
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

                        {/* Game Settings Notice */}
                        <div className="mb-8 p-6 bg-degen-yellow border border-degen-black">
                            <h3 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">Game Settings</h3>
                            <p className="text-degen-black text-sm">
                                Game settings (luck interval, payout multipliers, tier probabilities) are now managed in the
                                <strong> On-Chain Config</strong> tab. These values are stored on the Solana blockchain for
                                provable fairness.
                            </p>
                            <DegenButton
                                onClick={() => {
                                    setActiveTab('onchain');
                                    if (!onChainConfig) loadOnChainConfig();
                                }}
                                variant="primary"
                                size="sm"
                                className="mt-4"
                            >
                                Go to On-Chain Config
                            </DegenButton>
                        </div>

                        {/* Project Creation Settings Section */}
                        <div className="mb-8 p-6 bg-degen-bg border border-degen-black">
                            <h3 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">Project Creation Settings</h3>

                            {/* Vault Fund Amount */}
                            <div className="mb-6">
                                <DegenInput
                                    label="Required Vault Funding (tokens)"
                                    type="number"
                                    value={configForm.vaultFundAmount ?? 50000000}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? 50000000 : parseFloat(e.target.value);
                                        setConfigForm({ ...configForm, vaultFundAmount: isNaN(value) ? 50000000 : value });
                                    }}
                                    min="0"
                                    step="1000000"
                                />
                                <p className="text-degen-text-muted text-sm mt-1">
                                    Amount of tokens project creators must transfer to fund their vault on project creation.
                                    This ensures there are funds to pay out rewards.
                                </p>
                                <div className="mt-2 flex gap-2">
                                    <DegenButton
                                        type="button"
                                        onClick={() => setConfigForm({ ...configForm, vaultFundAmount: 1000 })}
                                        variant="warning"
                                        size="sm"
                                    >
                                        Set Dev Mode (1K)
                                    </DegenButton>
                                    <DegenButton
                                        type="button"
                                        onClick={() => setConfigForm({ ...configForm, vaultFundAmount: 50000000 })}
                                        variant="success"
                                        size="sm"
                                    >
                                        Set Production (50M)
                                    </DegenButton>
                                </div>
                            </div>

                            {/* Current Vault Fund Setting Display */}
                            <div className="p-3 bg-degen-white border border-degen-black">
                                <p className="text-degen-text-muted text-xs uppercase tracking-wider">Current Setting:</p>
                                <p className="text-degen-black font-medium">
                                    {(config.vaultFundAmount ? (Number(config.vaultFundAmount) / 1e9).toLocaleString() : '50,000,000')} tokens
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

                            {/* Withdrawal Fee */}
                            <div className="mb-6">
                                <DegenInput
                                    label="Withdrawal Fee (percentage)"
                                    type="number"
                                    value={configForm.withdrawalFeePercentage}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                        setConfigForm({ ...configForm, withdrawalFeePercentage: isNaN(value) ? 0 : value });
                                    }}
                                    min="0"
                                    max="100"
                                    step="0.1"
                                />
                                <p className="text-degen-text-muted text-sm mt-1">
                                    Fee creators pay when withdrawing earnings (in $3EYES)
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
                                    <p className="text-degen-black font-medium">{config.launchFeeAmount / 1e9} $3EYES</p>
                                </div>
                                <div>
                                    <p className="text-degen-text-muted text-xs uppercase tracking-wider">Withdrawal Fee</p>
                                    <p className="text-degen-black font-medium">{config.withdrawalFeePercentage}%</p>
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
                                                label="Luck Interval (seconds)"
                                                type="number"
                                                value={onChainConfigForm.luckTimeInterval ?? 3}
                                                onChange={(e) => setOnChainConfigForm({ ...onChainConfigForm, luckTimeInterval: parseInt(e.target.value) || 3 })}
                                                min="1"
                                            />
                                            <p className="text-degen-text-muted text-xs mt-1">Seconds per +1 luck</p>
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
            </div>
        </div>
    );
}
