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
} from '@/components/ui';

export default function AdminDashboard() {
    const router = useRouter();
    const { publicKey, connected } = useWallet();
    const { config, configLoading, refreshConfig } = useNetworkStore();
    const { projects, loadAllProjects } = useProjectStore();

    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState('projects'); // 'projects' or 'config'
    const [configForm, setConfigForm] = useState({});
    const [saving, setSaving] = useState(false);

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
                luckIntervalSeconds: config.luckIntervalSeconds ?? 3,
                vaultFundAmount: config.vaultFundAmount ? config.vaultFundAmount / 1e9 : 50000000, // 50M default
            });
        }
    }, [config, isAdmin]);

    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            const updates = {
                launch_fee_amount: Math.floor(configForm.launchFeeAmount * 1e9),
                withdrawal_fee_percentage: configForm.withdrawalFeePercentage,
                luck_interval_seconds: configForm.luckIntervalSeconds,
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
                    alert('Invalid $3EYES Token Mint address format. Please enter a valid Solana address.');
                    setSaving(false);
                    return;
                }
            }
            if (lootboxProgramIdStr?.trim()) {
                try {
                    new PublicKey(lootboxProgramIdStr.trim());
                    updates.lootbox_program_id = lootboxProgramIdStr.trim();
                } catch (error) {
                    alert('Invalid Lootbox Program ID format. Please enter a valid Solana address.');
                    setSaving(false);
                    return;
                }
            }

            const { error } = await supabase
                .from('super_admin_config')
                .update(updates)
                .eq('id', 1);

            if (error) throw error;

            alert('Configuration updated successfully! ✓');
            await refreshConfig();
        } catch (error) {
            console.error('Error updating config:', error);
            alert('Failed to update configuration');
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

            alert(`Project ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
            loadAllProjects();
        } catch (error) {
            console.error('Error toggling project active:', error);
            alert('Failed to update project');
        }
    };

    const toggleProjectPaused = async (projectId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('projects')
                .update({ is_paused: !currentStatus })
                .eq('id', projectId);

            if (error) throw error;

            alert(`Project ${!currentStatus ? 'paused' : 'unpaused'} successfully`);
            loadAllProjects();
        } catch (error) {
            console.error('Error toggling project paused:', error);
            alert('Failed to update project');
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
                        Platform Config
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

                        {/* Game Settings Section */}
                        <div className="mb-8 p-6 bg-degen-yellow border border-degen-black">
                            <h3 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">Game Settings</h3>
                            <p className="text-degen-black text-sm mb-4">
                                REMINDER: Change luck interval to 10800 (3 hours) before mainnet launch!
                            </p>

                            {/* Luck Interval */}
                            <div className="mb-6">
                                <DegenInput
                                    label="Luck Interval (seconds)"
                                    type="number"
                                    value={configForm.luckIntervalSeconds ?? 3}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? 3 : parseInt(e.target.value);
                                        setConfigForm({ ...configForm, luckIntervalSeconds: isNaN(value) ? 3 : value });
                                    }}
                                    min="1"
                                    step="1"
                                />
                                <p className="text-degen-text-muted text-sm mt-1">
                                    How often luck increases by 1 point. Dev: 3 seconds | Production: 10800 seconds (3 hours)
                                </p>
                                <div className="mt-2 flex gap-2">
                                    <DegenButton
                                        type="button"
                                        onClick={() => setConfigForm({ ...configForm, luckIntervalSeconds: 3 })}
                                        variant="warning"
                                        size="sm"
                                    >
                                        Set Dev Mode (3s)
                                    </DegenButton>
                                    <DegenButton
                                        type="button"
                                        onClick={() => setConfigForm({ ...configForm, luckIntervalSeconds: 10800 })}
                                        variant="success"
                                        size="sm"
                                    >
                                        Set Production (3 hours)
                                    </DegenButton>
                                </div>
                            </div>

                            {/* Current Luck Setting Display */}
                            <div className="p-3 bg-degen-white border border-degen-black">
                                <p className="text-degen-text-muted text-xs uppercase tracking-wider">Current Setting:</p>
                                <p className="text-degen-black font-medium">
                                    {config.luckIntervalSeconds ?? 3} seconds
                                    <DegenBadge variant={(config.luckIntervalSeconds ?? 3) === 10800 ? 'success' : 'warning'} className="ml-2">
                                        {(config.luckIntervalSeconds ?? 3) === 10800 ? 'Production mode' : 'Dev/Testing mode'}
                                    </DegenBadge>
                                </p>
                            </div>
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
            </div>
        </div>
    );
}
