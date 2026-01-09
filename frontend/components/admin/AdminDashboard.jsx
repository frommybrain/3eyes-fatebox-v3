// components/admin/AdminDashboard.jsx
'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import useNetworkStore from '@/store/useNetworkStore';
import useProjectStore from '@/store/useProjectStore';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
    const router = useRouter();
    const { publicKey, connected } = useWallet();
    const { config, configLoading, refreshConfig } = useNetworkStore();
    const { projects, loadProjects } = useProjectStore();

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
            loadProjects(config.network);
            setConfigForm({
                launchFeeAmount: config.launchFeeAmount ? config.launchFeeAmount / 1e9 : 100,
                withdrawalFeePercentage: config.withdrawalFeePercentage || 2.0,
            });
        }
    }, [connected, isAdmin, mounted, router, config]);

    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('super_admin_config')
                .update({
                    launch_fee_amount: Math.floor(configForm.launchFeeAmount * 1e9),
                    withdrawal_fee_percentage: configForm.withdrawalFeePercentage,
                })
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

    const toggleProjectStatus = async (projectId, currentStatus) => {
        try {
            const { error } = await supabase
                .from('projects')
                .update({ is_active: !currentStatus })
                .eq('id', projectId);

            if (error) throw error;

            alert(`Project ${!currentStatus ? 'activated' : 'paused'} successfully`);
            loadProjects(config.network);
        } catch (error) {
            console.error('Error toggling project:', error);
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
                                                <h3 className="text-white font-bold">{project.name}</h3>
                                                {project.network === 'devnet' && (
                                                    <span className="bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded text-xs font-bold">
                                                        DEVNET
                                                    </span>
                                                )}
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    project.is_active
                                                        ? 'bg-green-500/20 text-green-500'
                                                        : 'bg-red-500/20 text-red-500'
                                                }`}>
                                                    {project.is_active ? 'ACTIVE' : 'PAUSED'}
                                                </span>
                                            </div>
                                            <p className="text-gray-400 text-sm mb-2">{project.subdomain}.degenbox.fun</p>
                                            <div className="flex gap-6 text-sm">
                                                <span className="text-gray-500">Owner: {project.owner_wallet.slice(0, 8)}...</span>
                                                <span className="text-gray-500">Boxes: {project.total_boxes_created || 0}</span>
                                                <span className="text-gray-500">Jackpots: {project.total_jackpots_hit || 0}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => toggleProjectStatus(project.project_id, project.is_active)}
                                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                                project.is_active
                                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                                    : 'bg-green-600 hover:bg-green-700 text-white'
                                            }`}
                                        >
                                            {project.is_active ? '⏸ Pause' : '▶ Activate'}
                                        </button>
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

                        {/* Launch Fee */}
                        <div className="mb-6">
                            <label className="block text-white font-medium mb-2">
                                Launch Fee (in $3EYES tokens)
                            </label>
                            <input
                                type="number"
                                value={configForm.launchFeeAmount}
                                onChange={(e) => setConfigForm({ ...configForm, launchFeeAmount: parseFloat(e.target.value) })}
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
                                onChange={(e) => setConfigForm({ ...configForm, withdrawalFeePercentage: parseFloat(e.target.value) })}
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            />
                            <p className="text-gray-500 text-sm mt-1">
                                Fee creators pay when withdrawing earnings (in $3EYES)
                            </p>
                        </div>

                        {/* Current Values Display */}
                        <div className="mb-6 p-4 bg-black/30 rounded-lg">
                            <p className="text-gray-400 text-sm mb-2">Current Configuration:</p>
                            <div className="flex gap-8">
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
