// components/project/ProjectPage.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainCanvas from '@/components/three/mainCanvas';
import useProjectStore from '@/store/useProjectStore';
import useNetworkStore from '@/store/useNetworkStore';

export default function ProjectPage({ subdomain }) {
    const router = useRouter();
    const [mounted, setMounted] = useState(false);

    // Zustand stores
    const {
        currentProject,
        projectLoading,
        projectError,
        loadProjectBySubdomain,
        clearCurrentProject,
        subscribeToProject,
    } = useProjectStore();

    const { config, configLoading, loadConfig } = useNetworkStore();

    // Load network config and project data on mount
    useEffect(() => {
        setMounted(true);

        async function init() {
            try {
                // Load network config first
                if (!config) {
                    await loadConfig();
                }

                // Load project by subdomain
                await loadProjectBySubdomain(subdomain);
            } catch (error) {
                console.error('Failed to initialize project page:', error);
            }
        }

        init();

        // Subscribe to project updates
        const unsubscribe = subscribeToProject(subdomain);

        // Cleanup
        return () => {
            clearCurrentProject();
            unsubscribe();
        };
    }, [subdomain]);

    // Show loading state
    if (!mounted || configLoading || projectLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center">
                    <div className="text-4xl mb-4">👁️👁️👁️</div>
                    <p className="text-white text-lg font-medium">Loading {subdomain}...</p>
                </div>
            </div>
        );
    }

    // Show error state
    if (projectError || !currentProject) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center max-w-md mx-auto p-8">
                    <div className="text-6xl mb-4">🚫</div>
                    <h1 className="text-white text-2xl font-bold mb-2">
                        Project Not Found
                    </h1>
                    <p className="text-gray-400 mb-6">
                        {projectError || `The project "${subdomain}" does not exist.`}
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                        Go to Homepage
                    </button>
                </div>
            </div>
        );
    }

    // Check if project is active
    if (!currentProject.active) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="text-center max-w-md mx-auto p-8">
                    <div className="text-6xl mb-4">⏸️</div>
                    <h1 className="text-white text-2xl font-bold mb-2">
                        Project Paused
                    </h1>
                    <p className="text-gray-400 mb-6">
                        {currentProject.name} is currently paused by the creator.
                        Check back later!
                    </p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                        Browse Other Projects
                    </button>
                </div>
            </div>
        );
    }

    // Network badge (show if devnet)
    const showNetworkBadge = config?.network === 'devnet';

    return (
        <>
            {/* Network Badge (devnet only) */}
            {showNetworkBadge && (
                <div className="fixed top-4 right-4 z-50 bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold shadow-lg">
                    🧪 DEVNET MODE
                </div>
            )}

            {/* Project UI Overlay */}
            <div className="fixed top-0 left-0 w-screen h-screen z-10 pointer-events-none">
                <div className="flex flex-col items-center justify-center h-full pointer-events-auto">
                    {/* Project Header */}
                    <div className="text-center mb-8">
                        {currentProject.logo_url && (
                            <img
                                src={currentProject.logo_url}
                                alt={currentProject.name}
                                className="w-24 h-24 mx-auto mb-4 rounded-full"
                            />
                        )}
                        <h1 className="text-white text-4xl font-bold mb-2">
                            {currentProject.name}
                        </h1>
                        {currentProject.description && (
                            <p className="text-gray-400 text-lg max-w-md mx-auto">
                                {currentProject.description}
                            </p>
                        )}
                    </div>

                    {/* Box Price Display */}
                    <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-6 mb-6 border border-white/10">
                        <div className="text-center">
                            <p className="text-gray-400 text-sm mb-1">Box Price</p>
                            <div className="flex items-center justify-center gap-2">
                                {currentProject.payment_token_logo && (
                                    <img
                                        src={currentProject.payment_token_logo}
                                        alt={currentProject.payment_token_symbol}
                                        className="w-6 h-6 rounded-full"
                                    />
                                )}
                                <p className="text-white text-3xl font-bold">
                                    {(currentProject.box_price / Math.pow(10, currentProject.payment_token_decimals || 9)).toLocaleString()}
                                </p>
                                <p className="text-gray-400 text-xl">
                                    {currentProject.payment_token_symbol || 'TOKEN'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Buy Box Button */}
                    <button
                        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xl font-bold rounded-xl shadow-lg transform transition-all hover:scale-105 active:scale-95"
                        onClick={() => {
                            // TODO: Implement buy box flow
                            console.log('Buy box clicked');
                        }}
                    >
                        🎲 Buy Box
                    </button>

                    {/* Stats */}
                    <div className="mt-8 flex gap-6 text-center">
                        <div className="bg-black/30 backdrop-blur-sm rounded-lg px-6 py-3">
                            <p className="text-gray-400 text-sm">Total Boxes</p>
                            <p className="text-white text-2xl font-bold">
                                {currentProject.total_boxes_created?.toLocaleString() || '0'}
                            </p>
                        </div>
                        <div className="bg-black/30 backdrop-blur-sm rounded-lg px-6 py-3">
                            <p className="text-gray-400 text-sm">Jackpots Hit</p>
                            <p className="text-white text-2xl font-bold">
                                {currentProject.total_jackpots_hit?.toLocaleString() || '0'}
                            </p>
                        </div>
                        <div className="bg-black/30 backdrop-blur-sm rounded-lg px-6 py-3">
                            <p className="text-gray-400 text-sm">Vault Balance</p>
                            <p className="text-white text-2xl font-bold">
                                {(currentProject.vault_balance / Math.pow(10, currentProject.payment_token_decimals || 9)).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3D Canvas Background */}
            <MainCanvas />
        </>
    );
}
