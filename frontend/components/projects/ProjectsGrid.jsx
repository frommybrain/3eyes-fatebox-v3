'use client';

// components/projects/ProjectsGrid.jsx
// Grid view of all active projects on the platform

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DegenCard, DegenBadge, DegenButton } from '@/components/ui';

/**
 * Get the base domain URL (strips subdomain if on a project subdomain)
 */
function getBaseDomainUrl() {
    if (typeof window === 'undefined') return '';

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:${window.location.port}`;
    }

    // Production - get base domain (e.g., degenbox.fun from catbox.degenbox.fun)
    const parts = hostname.split('.');
    if (parts.length > 2) {
        // On a subdomain, return base domain
        const baseDomain = parts.slice(-2).join('.');
        return `${protocol}//${baseDomain}`;
    }

    // Already on base domain
    return `${protocol}//${hostname}`;
}

/**
 * Get the project URL (subdomain or path based on environment)
 */
function getProjectUrl(subdomain) {
    if (typeof window === 'undefined') return `/project/${subdomain}`;

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    // Local development - use path-based routing
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:${window.location.port}/project/${subdomain}`;
    }

    // Production - use subdomain
    const parts = hostname.split('.');
    const baseDomain = parts.length > 2 ? parts.slice(-2).join('.') : hostname;
    return `${protocol}//${subdomain}.${baseDomain}`;
}

function ProjectCard({ project }) {
    const projectUrl = getProjectUrl(project.subdomain);

    // Format box price with decimals
    const formatPrice = (price, decimals = 6, symbol = 'tokens') => {
        const amount = price / Math.pow(10, decimals);
        return `${amount.toLocaleString()} ${symbol}`;
    };

    return (
        <DegenCard className="p-6 hover:border-degen-yellow transition-colors">
            {/* Project Header */}
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-lg font-bold text-degen-black">
                        {project.project_name}
                    </h3>
                    <p className="text-sm text-degen-text-muted">
                        {project.subdomain}
                    </p>
                </div>
                {project.is_paused && (
                    <DegenBadge variant="danger" size="sm">
                        Paused
                    </DegenBadge>
                )}
            </div>

            {/* Description */}
            {project.description && (
                <p className="text-sm text-degen-text-muted mb-4 line-clamp-2">
                    {project.description}
                </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-degen-bg p-3">
                    <p className="text-xs text-degen-text-muted uppercase tracking-wider">
                        Box Price
                    </p>
                    <p className="text-sm font-bold text-degen-black">
                        {formatPrice(
                            project.box_price,
                            project.payment_token_decimals || 6,
                            project.payment_token_symbol || ''
                        )}
                    </p>
                </div>
                <div className="bg-degen-bg p-3">
                    <p className="text-xs text-degen-text-muted uppercase tracking-wider">
                        Total Boxes
                    </p>
                    <p className="text-sm font-bold text-degen-black">
                        {project.total_boxes_sold?.toLocaleString() || '0'}
                    </p>
                </div>
            </div>

            {/* Action */}
            <a
                href={projectUrl}
                className="block w-full"
            >
                <DegenButton variant="primary" className="w-full">
                    Visit Project
                </DegenButton>
            </a>
        </DegenCard>
    );
}

export default function ProjectsGrid() {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchProjects() {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
                const response = await fetch(`${backendUrl}/api/projects`);
                const data = await response.json();

                if (data.success) {
                    setProjects(data.projects);
                } else {
                    setError(data.error || 'Failed to load projects');
                }
            } catch (err) {
                console.error('Error fetching projects:', err);
                setError('Failed to connect to server');
            } finally {
                setLoading(false);
            }
        }

        fetchProjects();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-degen-bg pt-14">
                <div className="max-w-7xl mx-auto px-4 py-12">
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-degen-black"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-degen-bg pt-14">
                <div className="max-w-7xl mx-auto px-4 py-12">
                    <div className="text-center py-20">
                        <p className="text-red-500 mb-4">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-degen-blue hover:underline"
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-degen-bg pt-14">
            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-degen-black mb-2">
                        Browse Projects
                    </h1>
                    <p className="text-degen-text-muted">
                        Explore all lootbox projects on DegenBox
                    </p>
                </div>

                {/* Projects Grid */}
                {projects.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-degen-text-muted mb-4">
                            No projects yet. Be the first to create one!
                        </p>
                        <Link href={`${getBaseDomainUrl()}/dashboard/create`}>
                            <DegenButton variant="primary">
                                Create Project
                            </DegenButton>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </div>
                )}

                {/* Footer CTA */}
                {projects.length > 0 && (
                    <div className="mt-12 text-center">
                        <p className="text-degen-text-muted mb-4">
                            Want to create your own lootbox project?
                        </p>
                        <Link href={`${getBaseDomainUrl()}/dashboard/create`}>
                            <DegenButton variant="secondary">
                                Create Project
                            </DegenButton>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}
