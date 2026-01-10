// components/dashboard/Dashboard.jsx
'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useProjectStore from '@/store/useProjectStore';
import useNetworkStore from '@/store/useNetworkStore';

export default function Dashboard() {
    const router = useRouter();
    const { publicKey, connected } = useWallet();
    const [activeTab, setActiveTab] = useState('projects');

    const {
        projects,
        projectsLoading,
        projectsError,
        loadProjectsByOwner,
    } = useProjectStore();

    const { config, configLoading } = useNetworkStore();

    // Handle redirects and data loading
    useEffect(() => {
        // Redirect if not connected
        if (!connected) {
            router.push('/');
            return;
        }

        // Load user's projects
        if (publicKey && config) {
            loadProjectsByOwner(publicKey.toString());
        }
    }, [publicKey, connected, config, router, loadProjectsByOwner]);

    if (configLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">👁️👁️👁️</div>
                    <p className="text-white text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    if (!connected) {
        return null; // Will redirect
    }

    // Network badge
    const isDevnet = config?.network === 'devnet';

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 pt-24 pb-12 px-6">
            <div className="max-w-7xl mx-auto">
                {/* Network Badge */}
                {isDevnet && (
                    <div className="mb-6 inline-block bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold">
                        🧪 DEVNET MODE
                    </div>
                )}

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-white text-4xl font-bold mb-2">Dashboard</h1>
                    <p className="text-gray-400 text-lg">
                        Manage your projects and view your purchased boxes
                    </p>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-8">
                    <button
                        onClick={() => setActiveTab('projects')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all ${
                            activeTab === 'projects'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        My Projects
                    </button>
                    <button
                        onClick={() => setActiveTab('boxes')}
                        className={`px-6 py-3 rounded-lg font-medium transition-all ${
                            activeTab === 'boxes'
                                ? 'bg-purple-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                    >
                        My Boxes
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'projects' ? (
                    <MyProjectsTab
                        projects={projects}
                        projectsLoading={projectsLoading}
                        projectsError={projectsError}
                        config={config}
                    />
                ) : (
                    <MyBoxesTab
                        walletAddress={publicKey?.toString()}
                        config={config}
                    />
                )}
            </div>
        </div>
    );
}

function MyProjectsTab({ projects, projectsLoading, projectsError, config }) {
    return (
        <>
            {/* Create New Project Button */}
            <Link
                href="/dashboard/create"
                className="inline-block mb-8 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg font-bold rounded-xl shadow-lg transform transition-all hover:scale-105 active:scale-95"
            >
                + Create New Project
            </Link>

            {/* Projects List */}
            {projectsLoading ? (
                <div className="text-center py-12">
                    <div className="text-2xl mb-2">...</div>
                    <p className="text-gray-400">Loading your projects...</p>
                </div>
            ) : projectsError ? (
                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center">
                    <p className="text-red-400">Error loading projects: {projectsError}</p>
                </div>
            ) : projects.length === 0 ? (
                <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                    <div className="text-6xl mb-4">🎲</div>
                    <h2 className="text-white text-2xl font-bold mb-2">
                        No Projects Yet
                    </h2>
                    <p className="text-gray-400 mb-6">
                        Create your first lootbox project to get started!
                    </p>
                    <Link
                        href="/dashboard/create"
                        className="inline-block px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
                    >
                        Create Your First Project
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} config={config} />
                    ))}
                </div>
            )}
        </>
    );
}

function MyBoxesTab({ walletAddress, config }) {
    const [boxesData, setBoxesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const platformDomain = config?.network === 'devnet' ? 'degenbox.fun' : 'degenbox.fun';

    useEffect(() => {
        async function fetchUserBoxes() {
            if (!walletAddress) {
                setLoading(false);
                return;
            }

            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
                const response = await fetch(`${backendUrl}/api/projects/boxes/by-owner/${walletAddress}`);
                const data = await response.json();

                if (data.success) {
                    setBoxesData(data);
                } else {
                    setError(data.error || 'Failed to fetch boxes');
                }
            } catch (err) {
                console.error('Error fetching boxes:', err);
                setError('Failed to connect to server');
            } finally {
                setLoading(false);
            }
        }

        fetchUserBoxes();
    }, [walletAddress]);

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="text-2xl mb-2">...</div>
                <p className="text-gray-400">Loading your boxes...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-6 text-center">
                <p className="text-red-400">Error: {error}</p>
            </div>
        );
    }

    if (!boxesData || boxesData.totalBoxes === 0) {
        return (
            <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                <div className="text-6xl mb-4">📦</div>
                <h2 className="text-white text-2xl font-bold mb-2">
                    No Boxes Yet
                </h2>
                <p className="text-gray-400 mb-6">
                    You haven&apos;t purchased any lootboxes yet. Browse projects to get started!
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Summary */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-white text-xl font-bold">Your Collection</h2>
                        <p className="text-gray-400 text-sm">
                            {boxesData.totalBoxes} box{boxesData.totalBoxes !== 1 ? 'es' : ''} across {boxesData.projectCount} project{boxesData.projectCount !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>

            {/* Projects with Boxes */}
            {boxesData.projectsWithBoxes.map((projectGroup) => (
                <ProjectBoxesGroup
                    key={projectGroup.project.id}
                    projectGroup={projectGroup}
                    platformDomain={platformDomain}
                />
            ))}
        </div>
    );
}

function ProjectBoxesGroup({ projectGroup, platformDomain }) {
    const { project, boxes } = projectGroup;

    const projectUrl = typeof window !== 'undefined' && window.location.hostname.includes('localhost')
        ? `http://localhost:3000/project/${project.subdomain}`
        : `https://${project.subdomain}.${platformDomain}`;

    // Count box states
    const pendingBoxes = boxes.filter(b => b.box_result === 0).length;
    const revealedBoxes = boxes.filter(b => b.box_result !== 0).length;

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            {/* Project Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center text-xl">
                        🎲
                    </div>
                    <div>
                        <h3 className="text-white text-lg font-bold">{project.project_name}</h3>
                        <a
                            href={projectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                        >
                            {project.subdomain}.{platformDomain}
                        </a>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-white font-bold">{boxes.length} box{boxes.length !== 1 ? 'es' : ''}</p>
                    <p className="text-gray-400 text-sm">
                        {pendingBoxes} pending, {revealedBoxes} revealed
                    </p>
                </div>
            </div>

            {/* Boxes Grid */}
            <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {boxes.map((box) => (
                        <BoxCard key={box.id} box={box} project={project} />
                    ))}
                </div>
            </div>
        </div>
    );
}

function BoxCard({ box, project }) {
    const isPending = box.box_result === 0;
    const isWinner = box.box_result === 1;

    // Format payout amount
    const payoutFormatted = box.payout_amount
        ? (box.payout_amount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)
        : '0';

    return (
        <div className={`relative p-4 rounded-lg border text-center transition-all ${
            isPending
                ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/20'
                : isWinner
                    ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
                    : 'bg-gray-500/10 border-gray-500/30 hover:bg-gray-500/20'
        }`}>
            {/* Box Number */}
            <div className="text-2xl mb-2">
                {isPending ? '📦' : isWinner ? '🎉' : '📭'}
            </div>
            <p className="text-white font-bold">Box #{box.box_number}</p>

            {/* Status */}
            <p className={`text-xs mt-1 ${
                isPending ? 'text-yellow-400' : isWinner ? 'text-green-400' : 'text-gray-400'
            }`}>
                {isPending ? 'Pending' : isWinner ? `Won ${payoutFormatted}` : 'No Win'}
            </p>

            {/* Purchase Date */}
            <p className="text-gray-500 text-xs mt-2">
                {new Date(box.created_at).toLocaleDateString()}
            </p>
        </div>
    );
}

function ProjectCard({ project, config }) {
    const router = useRouter();
    const [vaultBalance, setVaultBalance] = useState(null);
    const [balanceLoading, setBalanceLoading] = useState(true);

    const isDevnet = project.network === 'devnet';
    const platformDomain = config?.network === 'devnet'
        ? 'degenbox.fun'  // Will be localhost:3000 in dev
        : 'degenbox.fun';

    // Generate project URL
    const projectUrl = typeof window !== 'undefined' && window.location.hostname.includes('localhost')
        ? `http://localhost:3000/project/${project.subdomain}`
        : `https://${project.subdomain}.${platformDomain}`;

    // Fetch vault balance
    useEffect(() => {
        async function fetchVaultBalance() {
            if (!project.project_numeric_id) {
                setBalanceLoading(false);
                return;
            }

            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
                const response = await fetch(`${backendUrl}/api/vault/balance/${project.project_numeric_id}`);
                const data = await response.json();

                if (data.success) {
                    setVaultBalance(data.balance);
                } else {
                    setVaultBalance(0);
                }
            } catch (error) {
                console.error('Failed to fetch vault balance:', error);
                setVaultBalance(0);
            } finally {
                setBalanceLoading(false);
            }
        }

        fetchVaultBalance();
    }, [project.project_numeric_id]);

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
            {/* Network Badge */}
            {isDevnet && (
                <div className="inline-block mb-3 bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded text-xs font-bold">
                    DEVNET
                </div>
            )}

            {/* Project Logo */}
            {project.logo_url && (
                <img
                    src={project.logo_url}
                    alt={project.name}
                    className="w-16 h-16 rounded-full mb-4"
                />
            )}

            {/* Project Name */}
            <h3 className="text-white text-xl font-bold mb-2">{project.name}</h3>

            {/* Description */}
            {project.description && (
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {project.description}
                </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center">
                    <p className="text-gray-500 text-xs">Boxes</p>
                    <p className="text-white font-bold">{project.total_boxes_created || 0}</p>
                </div>
                <div className="text-center">
                    <p className="text-gray-500 text-xs">Jackpots</p>
                    <p className="text-white font-bold">{project.total_jackpots_hit || 0}</p>
                </div>
                <div className="text-center">
                    <p className="text-gray-500 text-xs">Vault Balance</p>
                    <p className="text-green-400 font-bold">
                        {balanceLoading
                            ? 'Loading...'
                            : `${(vaultBalance / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)} ${project.payment_token_symbol || 'tokens'}`}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-gray-500 text-xs">Status</p>
                    <p className={`font-bold ${project.is_active ? 'text-green-400' : 'text-red-400'}`}>
                        {project.is_active ? 'Active' : 'Paused'}
                    </p>
                </div>
            </div>

            {/* Subdomain */}
            <div className="mb-4 p-3 bg-black/30 rounded-lg">
                <p className="text-gray-500 text-xs mb-1">Your Subdomain</p>
                <a
                    href={projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300 text-sm break-all transition-colors"
                >
                    {project.subdomain}.{platformDomain}
                </a>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
                <button
                    onClick={() => window.open(projectUrl, '_blank')}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    Visit Site
                </button>
                <button
                    onClick={() => router.push(`/dashboard/manage/${project.id}`)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    Manage
                </button>
            </div>
        </div>
    );
}
