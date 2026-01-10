// components/admin/AdminDashboard.jsx
'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useRouter } from 'next/navigation';
import useNetworkStore from '@/store/useNetworkStore';
import useProjectStore from '@/store/useProjectStore';
import { supabase } from '@/lib/supabase';

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
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">👁️👁️👁️</div>
                    <p className="text-white text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    if (!connected || !isAdmin) {
        return null; // Will redirect
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 pt-24 pb-12 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-white text-4xl font-bold">🔧 Admin Dashboard</h1>
                        <div className="bg-purple-500 text-white px-3 py-1 rounded text-sm font-bold">
                            SUPER ADMIN
                        </div>
                    </div>
                    <p className="text-gray-400 text-lg">
                        Platform management and configuration
                    </p>
                </div>

                {/* Network Status */}
                <div className="mb-6 p-6 bg-white/5 border border-white/10 rounded-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Current Network</p>
                            <p className="text-white text-2xl font-bold">
                                {config.network === 'devnet' ? '🧪 Devnet' : '🚀 Mainnet'}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm mb-1">Production Mode</p>
                            <p className={`text-xl font-bold ${config.isProduction ? 'text-red-400' : 'text-yellow-400'}`}>
                                {config.isProduction ? '✓ LIVE' : '⚠️ Testing'}
                            </p>
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm mb-1">RPC URL</p>
                            <p className="text-white text-sm font-mono">{config.rpcUrl.slice(0, 30)}...</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setActiveTab('projects')}
                        className={`px-6 py-3 font-medium rounded-lg transition-colors ${
                            activeTab === 'projects'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                    >
                        All Projects ({projects.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('config')}
                        className={`px-6 py-3 font-medium rounded-lg transition-colors ${
                            activeTab === 'config'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}
                    >
                        Platform Config
                    </button>
                </div>

                {/* Projects Tab */}
                {activeTab === 'projects' && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                        <h2 className="text-white text-2xl font-bold mb-6">All Projects</h2>

                        {projects.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-400">No projects yet</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {projects.map((project) => (
                                    <div
                                        key={project.id}
                                        className="p-4 bg-black/30 border border-white/10 rounded-lg flex items-center justify-between"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-white font-bold">{project.project_name}</h3>
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    project.is_active
                                                        ? 'bg-green-500/20 text-green-500'
                                                        : 'bg-red-500/20 text-red-500'
                                                }`}>
                                                    {project.is_active ? 'ACTIVE' : 'INACTIVE'}
                                                </span>
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    project.is_paused
                                                        ? 'bg-yellow-500/20 text-yellow-500'
                                                        : 'bg-blue-500/20 text-blue-500'
                                                }`}>
                                                    {project.is_paused ? 'PAUSED' : 'RUNNING'}
                                                </span>
                                            </div>
                                            <p className="text-gray-400 text-sm mb-2">{project.subdomain}.degenbox.fun</p>
                                            <div className="flex gap-6 text-sm">
                                                <span className="text-gray-500">Owner: {project.owner_wallet.slice(0, 8)}...</span>
                                                <span className="text-gray-500">Boxes: {project.boxes_created || 0}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => toggleProjectActive(project.id, project.is_active)}
                                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                                    project.is_active
                                                        ? 'bg-red-600 hover:bg-red-700 text-white'
                                                        : 'bg-green-600 hover:bg-green-700 text-white'
                                                }`}
                                            >
                                                {project.is_active ? '✗ Deactivate' : '✓ Activate'}
                                            </button>
                                            <button
                                                onClick={() => toggleProjectPaused(project.id, project.is_paused)}
                                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                                    project.is_paused
                                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                                        : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                                }`}
                                            >
                                                {project.is_paused ? '▶ Unpause' : '⏸ Pause'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Config Tab */}
                {activeTab === 'config' && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-8">
                        <h2 className="text-white text-2xl font-bold mb-6">Platform Configuration</h2>

                        {/* Token Addresses Section */}
                        <div className="mb-8 p-6 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                            <h3 className="text-white text-xl font-bold mb-4">🪙 Token Addresses</h3>

                            {/* $3EYES Token Mint */}
                            <div className="mb-6">
                                <label className="block text-white font-medium mb-2">
                                    $3EYES Token Mint Address
                                </label>
                                <input
                                    type="text"
                                    value={configForm.threeEyesMint}
                                    onChange={(e) => setConfigForm({ ...configForm, threeEyesMint: e.target.value })}
                                    placeholder="Enter token mint address"
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                                />
                                <p className="text-gray-400 text-sm mt-1">
                                    Platform token used for launch fees and withdrawal fees
                                </p>
                                {config.network === 'devnet' && (
                                    <p className="text-yellow-500 text-sm mt-1">
                                        🧪 Use devnet test token address for testing
                                    </p>
                                )}
                            </div>

                            {/* Lootbox Program ID */}
                            <div className="mb-6">
                                <label className="block text-white font-medium mb-2">
                                    Lootbox Program ID
                                </label>
                                <input
                                    type="text"
                                    value={configForm.lootboxProgramId || ''}
                                    onChange={(e) => setConfigForm({ ...configForm, lootboxProgramId: e.target.value })}
                                    placeholder={config.lootboxProgramId?.toString() || "Enter program ID (after deployment)"}
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-purple-500"
                                />
                                <p className="text-gray-400 text-sm mt-1">
                                    On-chain program address (same on devnet and mainnet if using same deploy wallet)
                                </p>
                            </div>
                        </div>

                        {/* Game Settings Section */}
                        <div className="mb-8 p-6 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                            <h3 className="text-white text-xl font-bold mb-4">🎮 Game Settings</h3>
                            <p className="text-orange-400 text-sm mb-4">
                                ⚠️ REMINDER: Change luck interval to 10800 (3 hours) before mainnet launch!
                            </p>

                            {/* Luck Interval */}
                            <div className="mb-6">
                                <label className="block text-white font-medium mb-2">
                                    Luck Interval (seconds)
                                </label>
                                <input
                                    type="number"
                                    value={configForm.luckIntervalSeconds ?? 3}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? 3 : parseInt(e.target.value);
                                        setConfigForm({ ...configForm, luckIntervalSeconds: isNaN(value) ? 3 : value });
                                    }}
                                    min="1"
                                    step="1"
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-orange-500"
                                />
                                <p className="text-gray-500 text-sm mt-1">
                                    How often luck increases by 1 point. Dev: 3 seconds | Production: 10800 seconds (3 hours)
                                </p>
                                <div className="mt-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setConfigForm({ ...configForm, luckIntervalSeconds: 3 })}
                                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded"
                                    >
                                        Set Dev Mode (3s)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfigForm({ ...configForm, luckIntervalSeconds: 10800 })}
                                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                                    >
                                        Set Production (3 hours)
                                    </button>
                                </div>
                            </div>

                            {/* Current Luck Setting Display */}
                            <div className="p-3 bg-black/30 rounded-lg">
                                <p className="text-gray-400 text-xs">Current Setting:</p>
                                <p className={`font-bold ${(config.luckIntervalSeconds ?? 3) === 10800 ? 'text-green-400' : 'text-yellow-400'}`}>
                                    {config.luckIntervalSeconds ?? 3} seconds
                                    ({(config.luckIntervalSeconds ?? 3) === 10800 ? '✓ Production mode' : '⚠️ Dev/Testing mode'})
                                </p>
                            </div>
                        </div>

                        {/* Project Creation Settings Section */}
                        <div className="mb-8 p-6 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                            <h3 className="text-white text-xl font-bold mb-4">🏗️ Project Creation Settings</h3>

                            {/* Vault Fund Amount */}
                            <div className="mb-6">
                                <label className="block text-white font-medium mb-2">
                                    Required Vault Funding (tokens)
                                </label>
                                <input
                                    type="number"
                                    value={configForm.vaultFundAmount ?? 50000000}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? 50000000 : parseFloat(e.target.value);
                                        setConfigForm({ ...configForm, vaultFundAmount: isNaN(value) ? 50000000 : value });
                                    }}
                                    min="0"
                                    step="1000000"
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                                />
                                <p className="text-gray-500 text-sm mt-1">
                                    Amount of tokens project creators must transfer to fund their vault on project creation.
                                    This ensures there are funds to pay out rewards.
                                </p>
                                <div className="mt-2 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setConfigForm({ ...configForm, vaultFundAmount: 1000 })}
                                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded"
                                    >
                                        Set Dev Mode (1K)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setConfigForm({ ...configForm, vaultFundAmount: 50000000 })}
                                        className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                                    >
                                        Set Production (50M)
                                    </button>
                                </div>
                            </div>

                            {/* Current Vault Fund Setting Display */}
                            <div className="p-3 bg-black/30 rounded-lg">
                                <p className="text-gray-400 text-xs">Current Setting:</p>
                                <p className="text-white font-bold">
                                    {(config.vaultFundAmount ? (Number(config.vaultFundAmount) / 1e9).toLocaleString() : '50,000,000')} tokens
                                </p>
                            </div>
                        </div>

                        {/* Fees Section */}
                        <div className="mb-8">
                            <h3 className="text-white text-xl font-bold mb-4">💰 Platform Fees</h3>

                            {/* Launch Fee */}
                            <div className="mb-6">
                                <label className="block text-white font-medium mb-2">
                                    Launch Fee (in $3EYES tokens)
                                </label>
                                <input
                                    type="number"
                                    value={configForm.launchFeeAmount}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                        setConfigForm({ ...configForm, launchFeeAmount: isNaN(value) ? 0 : value });
                                    }}
                                    min="0"
                                    step="1"
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                />
                                <p className="text-gray-500 text-sm mt-1">
                                    Fee users must pay to create a new project
                                </p>
                            </div>

                            {/* Withdrawal Fee */}
                            <div className="mb-6">
                                <label className="block text-white font-medium mb-2">
                                    Withdrawal Fee (percentage)
                                </label>
                                <input
                                    type="number"
                                    value={configForm.withdrawalFeePercentage}
                                    onChange={(e) => {
                                        const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                        setConfigForm({ ...configForm, withdrawalFeePercentage: isNaN(value) ? 0 : value });
                                    }}
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                                />
                                <p className="text-gray-500 text-sm mt-1">
                                    Fee creators pay when withdrawing earnings (in $3EYES)
                                </p>
                            </div>
                        </div>

                        {/* Current Values Display */}
                        <div className="mb-6 p-4 bg-black/30 rounded-lg">
                            <p className="text-gray-400 text-sm mb-2">Current Configuration:</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-gray-500 text-xs">$3EYES Token</p>
                                    <p className="text-white font-mono text-xs break-all">
                                        {config.threeEyesMint?.toString() ?
                                            `${config.threeEyesMint.toString().slice(0, 20)}...` :
                                            'Not set'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs">Program ID</p>
                                    <p className="text-white font-mono text-xs break-all">
                                        {config.lootboxProgramId?.toString() ?
                                            `${config.lootboxProgramId.toString().slice(0, 20)}...` :
                                            'Not set'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs">Launch Fee</p>
                                    <p className="text-white font-bold">{config.launchFeeAmount / 1e9} $3EYES</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs">Withdrawal Fee</p>
                                    <p className="text-white font-bold">{config.withdrawalFeePercentage}%</p>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <button
                            onClick={handleSaveConfig}
                            disabled={saving}
                            className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold rounded-xl shadow-lg transform transition-all hover:scale-105 active:scale-95"
                        >
                            {saving ? 'Saving...' : 'Save Configuration'}
                        </button>

                        {/* Warning */}
                        <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
                            <p className="text-yellow-500 text-sm">
                                ⚠️ <strong>Note:</strong> Configuration changes take effect immediately for all new operations.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
