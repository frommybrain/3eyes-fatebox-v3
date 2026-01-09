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
    const [mounted, setMounted] = useState(false);

    const {
        projects,
        projectsLoading,
        projectsError,
        loadProjectsByOwner,
    } = useProjectStore();

    const { config, configLoading } = useNetworkStore();

    useEffect(() => {
        setMounted(true);

        // Redirect if not connected
        if (mounted && !connected) {
            router.push('/');
            return;
        }

        // Load user's projects
        if (publicKey && config) {
            loadProjectsByOwner(publicKey.toString());
        }
    }, [publicKey, connected, mounted, config]);

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
                    <h1 className="text-white text-4xl font-bold mb-2">My Projects</h1>
                    <p className="text-gray-400 text-lg">
                        Manage your lootbox projects
                    </p>
                </div>

                {/* Create New Project Button */}
                <Link
                    href="/dashboard/create"
                    className="inline-block mb-8 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg font-bold rounded-xl shadow-lg transform transition-all hover:scale-105 active:scale-95"
                >
                    ➕ Create New Project
                </Link>

                {/* Projects List */}
                {projectsLoading ? (
                    <div className="text-center py-12">
                        <div className="text-2xl mb-2">⏳</div>
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
            </div>
        </div>
    );
}

function ProjectCard({ project, config }) {
    const router = useRouter();
    const isDevnet = project.network === 'devnet';
    const platformDomain = config?.network === 'devnet'
        ? 'degenbox.fun'  // Will be localhost:3000 in dev
        : 'degenbox.fun';

    // Generate project URL
    const projectUrl = typeof window !== 'undefined' && window.location.hostname.includes('localhost')
        ? `http://localhost:3000?subdomain=${project.subdomain}`
        : `https://${project.subdomain}.${platformDomain}`;

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-all">
            {/* Network Badge */}
            {isDevnet && (
                <div className="inline-block mb-3 bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded text-xs font-bold">
                    🧪 DEVNET
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
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                    <p className="text-gray-500 text-xs">Boxes</p>
                    <p className="text-white font-bold">{project.total_boxes_created || 0}</p>
                </div>
                <div className="text-center">
                    <p className="text-gray-500 text-xs">Jackpots</p>
                    <p className="text-white font-bold">{project.total_jackpots_hit || 0}</p>
                </div>
                <div className="text-center">
                    <p className="text-gray-500 text-xs">Status</p>
                    <p className={`font-bold ${project.is_active ? 'text-green-400' : 'text-red-400'}`}>
                        {project.is_active ? '✓' : '⏸'}
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
                    🔗 Visit Site
                </button>
                <button
                    onClick={() => router.push(`/project/${project.subdomain}/manage`)}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    ⚙️ Manage
                </button>
            </div>
        </div>
    );
}
