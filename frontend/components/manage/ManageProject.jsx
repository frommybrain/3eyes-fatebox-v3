// components/manage/ManageProject.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ManageProject({ projectId }) {
    const router = useRouter();
    const { publicKey, connected } = useWallet();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!connected) {
            router.push('/');
            return;
        }

        loadProject();
    }, [projectId, connected]);

    const loadProject = async () => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();

            if (error) throw error;

            // Check ownership
            if (data.owner_wallet !== publicKey.toString()) {
                alert('You do not own this project');
                router.push('/dashboard');
                return;
            }

            setProject(data);
        } catch (error) {
            console.error('Error loading project:', error);
            alert('Failed to load project');
            router.push('/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (updates) => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('projects')
                .update(updates)
                .eq('id', projectId);

            if (error) throw error;

            alert('Project updated successfully!');
            loadProject();
        } catch (error) {
            console.error('Error updating project:', error);
            alert('Failed to update project');
        } finally {
            setSaving(false);
        }
    };

    const togglePause = () => {
        handleUpdate({ is_paused: !project.is_paused });
    };

    const toggleActive = () => {
        handleUpdate({ is_active: !project.is_active });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
                <div className="text-center">
                    <div className="text-4xl mb-4">👁️👁️👁️</div>
                    <p className="text-white text-lg">Loading project...</p>
                </div>
            </div>
        );
    }

    if (!project) return null;

    const projectUrl = `https://${project.subdomain}.degenbox.fun`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 pt-24 pb-12 px-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center text-purple-400 hover:text-purple-300 mb-4"
                    >
                        ← Back to Dashboard
                    </Link>
                    <h1 className="text-4xl font-bold text-white mb-2">
                        Manage Project
                    </h1>
                    <p className="text-gray-400">{project.project_name}</p>
                </div>

                {/* Project Info Card */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 mb-6">
                    <h2 className="text-2xl font-bold text-white mb-6">Project Details</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Project Name</label>
                            <p className="text-white text-lg">{project.project_name}</p>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Subdomain</label>
                            <a
                                href={projectUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-400 hover:text-purple-300 text-lg"
                            >
                                {project.subdomain}
                            </a>
                        </div>

                        <div>
                            <label className="block text-sm text-gray-400 mb-1">Description</label>
                            <p className="text-white">{project.description || 'No description'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Box Price</label>
                                <p className="text-white">{(project.box_price / 1e9).toFixed(4)} SOL</p>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Max Boxes</label>
                                <p className="text-white">{project.max_boxes}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Created</label>
                                <p className="text-white">{new Date(project.created_at).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Boxes Created</label>
                                <p className="text-white">{project.boxes_created}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Controls */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8 mb-6">
                    <h2 className="text-2xl font-bold text-white mb-6">Project Status</h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                            <div>
                                <h3 className="text-white font-semibold">Active Status</h3>
                                <p className="text-sm text-gray-400">
                                    {project.is_active ? 'Project is live and accepting boxes' : 'Project is inactive'}
                                </p>
                            </div>
                            <button
                                onClick={toggleActive}
                                disabled={saving}
                                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                                    project.is_active
                                        ? 'bg-green-600 hover:bg-green-700 text-white'
                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                            >
                                {project.is_active ? '✓ Active' : '✗ Inactive'}
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg">
                            <div>
                                <h3 className="text-white font-semibold">Paused Status</h3>
                                <p className="text-sm text-gray-400">
                                    {project.is_paused ? 'New boxes are paused' : 'Accepting new boxes'}
                                </p>
                            </div>
                            <button
                                onClick={togglePause}
                                disabled={saving}
                                className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                                    project.is_paused
                                        ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                            >
                                {project.is_paused ? '⏸ Paused' : '▶ Running'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700 p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Quick Actions</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => window.open(projectUrl, '_blank')}
                            className="px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                        >
                            🔗 Visit Live Site
                        </button>
                        <Link
                            href="/dashboard"
                            className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition-colors text-center"
                        >
                            ← Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
