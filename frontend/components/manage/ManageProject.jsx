// components/manage/ManageProject.jsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import {
    DegenButton,
    DegenCard,
    DegenBadge,
    DegenLoadingState,
} from '@/components/ui';

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
            <div className="min-h-screen flex items-center justify-center bg-degen-bg">
                <DegenLoadingState text="Loading project..." />
            </div>
        );
    }

    if (!project) return null;

    const projectUrl = `https://${project.subdomain}.degenbox.fun`;
    const isDevnet = project.network === 'devnet';

    return (
        <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href="/dashboard"
                        className="inline-flex items-center text-degen-blue hover:underline mb-4 text-sm uppercase tracking-wider"
                    >
                        Back to Dashboard
                    </Link>
                    <div className="flex items-center gap-4">
                        <h1 className="text-degen-black text-4xl font-medium uppercase tracking-wider">
                            Manage Project
                        </h1>
                        {isDevnet && (
                            <DegenBadge variant="warning" size="sm">DEVNET</DegenBadge>
                        )}
                    </div>
                    <p className="text-degen-text-muted text-lg mt-2">{project.project_name}</p>
                </div>

                {/* Project Info Card */}
                <DegenCard variant="white" padding="lg" className="mb-6">
                    <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-6">Project Details</h2>

                    <div className="space-y-4">
                        <div className="flex justify-between py-3 border-b border-degen-black">
                            <span className="text-degen-text-muted text-sm uppercase">Project Name</span>
                            <span className="text-degen-black font-medium">{project.project_name}</span>
                        </div>

                        <div className="flex justify-between py-3 border-b border-degen-black">
                            <span className="text-degen-text-muted text-sm uppercase">Subdomain</span>
                            <a
                                href={projectUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-degen-blue hover:underline"
                            >
                                {project.subdomain}
                            </a>
                        </div>

                        <div className="flex justify-between py-3 border-b border-degen-black">
                            <span className="text-degen-text-muted text-sm uppercase">Description</span>
                            <span className="text-degen-black text-right max-w-md">{project.description || 'No description'}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="bg-degen-bg p-4 border border-degen-black">
                                <p className="text-degen-text-muted text-xs uppercase mb-1">Box Price</p>
                                <p className="text-degen-black font-medium">
                                    {(project.box_price / Math.pow(10, project.payment_token_decimals || 9)).toFixed(4)} {project.payment_token_symbol || 'TOKEN'}
                                </p>
                            </div>
                            <div className="bg-degen-bg p-4 border border-degen-black">
                                <p className="text-degen-text-muted text-xs uppercase mb-1">Max Boxes</p>
                                <p className="text-degen-black font-medium">{project.max_boxes}</p>
                            </div>
                            <div className="bg-degen-bg p-4 border border-degen-black">
                                <p className="text-degen-text-muted text-xs uppercase mb-1">Created</p>
                                <p className="text-degen-black font-medium">{new Date(project.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="bg-degen-bg p-4 border border-degen-black">
                                <p className="text-degen-text-muted text-xs uppercase mb-1">Boxes Created</p>
                                <p className="text-degen-black font-medium">{project.boxes_created || 0}</p>
                            </div>
                        </div>
                    </div>
                </DegenCard>

                {/* Status Controls */}
                <DegenCard variant="white" padding="lg" className="mb-6">
                    <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-6">Project Status</h2>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-degen-bg border border-degen-black">
                            <div>
                                <h3 className="text-degen-black font-medium uppercase tracking-wider">Active Status</h3>
                                <p className="text-sm text-degen-text-muted">
                                    {project.is_active ? 'Project is live and accepting boxes' : 'Project is inactive'}
                                </p>
                            </div>
                            <DegenButton
                                onClick={toggleActive}
                                disabled={saving}
                                variant={project.is_active ? 'success' : 'feature'}
                                size="sm"
                            >
                                {project.is_active ? 'Active' : 'Inactive'}
                            </DegenButton>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-degen-bg border border-degen-black">
                            <div>
                                <h3 className="text-degen-black font-medium uppercase tracking-wider">Paused Status</h3>
                                <p className="text-sm text-degen-text-muted">
                                    {project.is_paused ? 'New boxes are paused' : 'Accepting new boxes'}
                                </p>
                            </div>
                            <DegenButton
                                onClick={togglePause}
                                disabled={saving}
                                variant={project.is_paused ? 'warning' : 'blue'}
                                size="sm"
                            >
                                {project.is_paused ? 'Paused' : 'Running'}
                            </DegenButton>
                        </div>
                    </div>
                </DegenCard>

                {/* Quick Actions */}
                <DegenCard variant="white" padding="lg">
                    <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-6">Quick Actions</h2>

                    <div className="grid grid-cols-2 gap-4">
                        <DegenButton
                            onClick={() => window.open(projectUrl, '_blank')}
                            variant="blue"
                            size="lg"
                        >
                            Visit Live Site
                        </DegenButton>
                        <DegenButton
                            href="/dashboard"
                            variant="secondary"
                            size="lg"
                        >
                            Back to Dashboard
                        </DegenButton>
                    </div>
                </DegenCard>
            </div>
        </div>
    );
}
