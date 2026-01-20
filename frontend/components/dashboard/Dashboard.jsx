// components/dashboard/Dashboard.jsx
'use client';

import { useEffect, useState, useCallback, useTransition, useOptimistic } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { useRouter, useSearchParams } from 'next/navigation';
import useProjectStore from '@/store/useProjectStore';
import useNetworkStore from '@/store/useNetworkStore';
import { getProjectUrl } from '@/lib/getNetworkConfig';
import {
    DegenButton,
    DegenCard,
    DegenTabs,
    DegenTabsList,
    DegenTabsTrigger,
    DegenTabsContent,
    DegenBadge,
    DegenLoadingState,
    DegenEmptyState,
    DegenInput,
    CardDropdown,
    useToast,
    useTransaction,
    WinModal,
    BadgeModal,
    XLogo,
    MyBoxesTabSkeleton,
    MyProjectsTabSkeleton,
    MyProfileTabSkeleton,
    DashboardSkeleton,
} from '@/components/ui';
import { getWinShareHandler, getMyProjectShareHandler } from '@/lib/shareManager';
import TrophyCabinet from '@/components/profile/TrophyCabinet';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileBadges from '@/components/profile/ProfileBadges';
import DegenAccordion from '@/components/ui/DegenAccordion';

// ===== TESTING CONFIG =====
// Set to 30 for quick testing, 3600 for production (1 hour)
const REVEAL_WINDOW_SECONDS = 3600;
// ===========================

/**
 * Parse a database timestamp as UTC
 * Supabase returns timestamps without timezone suffix (e.g., '2026-01-20T17:18:47.959')
 * which JavaScript parses as local time. This causes timezone-dependent bugs.
 * This helper ensures timestamps are always parsed as UTC.
 */
function parseAsUTC(timestamp) {
    if (!timestamp) return null;
    // If timestamp already ends with Z or has timezone info, parse directly
    if (timestamp.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(timestamp)) {
        return new Date(timestamp).getTime();
    }
    // Otherwise, append Z to treat as UTC
    return new Date(timestamp + 'Z').getTime();
}

export default function Dashboard() {
    const { publicKey, connected } = useWallet();
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') || 'boxes';
    const [activeTab, setActiveTab] = useState(initialTab);

    // Badge notification state
    const [newBadges, setNewBadges] = useState([]);
    const [showBadgeModal, setShowBadgeModal] = useState(false);
    const [currentBadgeIndex, setCurrentBadgeIndex] = useState(0);

    const {
        projects,
        projectsLoading,
        projectsError,
        loadProjectsByOwner,
    } = useProjectStore();

    const { config, configLoading } = useNetworkStore();

    // Load data when connected
    useEffect(() => {
        // Load user's projects when connected
        if (publicKey && config && connected) {
            loadProjectsByOwner(publicKey.toString());
        }
    }, [publicKey, connected, config, loadProjectsByOwner]);

    // Check for new badges on dashboard load
    useEffect(() => {
        async function checkBadges() {
            if (!publicKey || !connected) return;

            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
                const response = await fetch(`${backendUrl}/api/users/${publicKey.toString()}/badges?check=true`);
                const data = await response.json();

                if (data.success && data.newBadges && data.newBadges.length > 0) {
                    setNewBadges(data.newBadges);
                    setCurrentBadgeIndex(0);
                    setShowBadgeModal(true);
                }
            } catch (error) {
                console.error('Error checking badges:', error);
            }
        }

        checkBadges();
    }, [publicKey, connected]);

    // Handle badge modal close - show next badge or close
    const handleBadgeModalClose = () => {
        if (currentBadgeIndex < newBadges.length - 1) {
            setCurrentBadgeIndex(prev => prev + 1);
        } else {
            setShowBadgeModal(false);
            setNewBadges([]);
            setCurrentBadgeIndex(0);
        }
    };

    const currentBadge = newBadges[currentBadgeIndex];

    if (configLoading) {
        return <DashboardSkeleton />;
    }

    if (!connected) {
        return (
            <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-4">
                        <h1 className="text-degen-black text-4xl font-medium uppercase tracking-wider mb-2">Dashboard</h1>
                        <p className="text-degen-text-muted text-sm">
                            Manage your projects and view your purchased boxes
                        </p>
                    </div>
                    <DegenCard variant="white" padding="lg" className="text-center">
                        <h2 className="text-degen-black text-2xl font-medium uppercase tracking-wider mb-4">
                            Connect Your Wallet
                        </h2>
                        <p className="text-degen-text-muted mb-6">
                            Please connect your wallet to view your dashboard, projects, and boxes.
                        </p>
                    </DegenCard>
                </div>
            </div>
        );
    }

    // Network badge
    const isDevnet = config?.network === 'devnet';

    return (
        <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-4">
            <div className="w-full mx-auto">
                {/* Network Badge */}
                {isDevnet && (
                    <div className="mb-6">
                        <DegenBadge variant="warning" size="lg">
                            DEVNET MODE
                        </DegenBadge>
                    </div>
                )}

                {/* Header */}
                <div className="mb-4">
                    <h1 className="text-degen-black text-4xl font-medium uppercase tracking-wider mb-2">Dashboard</h1>
                    <p className="text-degen-text-muted text-sm">
                        Manage your projects and view your purchased boxes
                    </p>
                </div>

                {/* Tab Navigation */}
                <DegenTabs value={activeTab} onValueChange={setActiveTab}>
                    <DegenTabsList className="mb-8">
                        <DegenTabsTrigger value="boxes">
                            My Boxes
                        </DegenTabsTrigger>
                        <DegenTabsTrigger value="projects">
                            My Projects
                        </DegenTabsTrigger>
                        <DegenTabsTrigger value="profile">
                            Profile
                        </DegenTabsTrigger>
                    </DegenTabsList>

                    <DegenTabsContent value="projects">
                        <MyProjectsTab
                            projects={projects}
                            projectsLoading={projectsLoading}
                            projectsError={projectsError}
                        />
                    </DegenTabsContent>

                    <DegenTabsContent value="boxes">
                        <MyBoxesTab walletAddress={publicKey?.toString()} />
                    </DegenTabsContent>

                    <DegenTabsContent value="profile">
                        <MyProfileTab walletAddress={publicKey?.toString()} />
                    </DegenTabsContent>
                </DegenTabs>

                {/* Badge Notification Modal */}
                <BadgeModal
                    isOpen={showBadgeModal}
                    onClose={handleBadgeModalClose}
                    badge={currentBadge}
                />
            </div>
        </div>
    );
}

function MyProjectsTab({ projects, projectsLoading, projectsError }) {
    return (
        <>
            {/* Create New Project Button */}
            <DegenButton href="/dashboard/create" size="lg" className="mb-8">
                + Create New Project
            </DegenButton>

            {/* Projects List */}
            {projectsLoading ? (
                <MyProjectsTabSkeleton />
            ) : projectsError ? (
                <DegenCard variant="feature" padding="md">
                    <p className="text-white text-center">Error loading projects: {projectsError}</p>
                </DegenCard>
            ) : projects.length === 0 ? (
                <DegenEmptyState
                    title="No Projects Yet"
                    description="Create your first lootbox project to get started!"
                    action="Create Your First Project"
                    actionHref="/dashboard/create"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            )}
        </>
    );
}

function MyProfileTab({ walletAddress }) {
    const { toast } = useToast();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [badges, setBadges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [username, setUsername] = useState('');
    const [xHandle, setXHandle] = useState('');
    const [usernameAvailable, setUsernameAvailable] = useState(null);
    const [usernameChecking, setUsernameChecking] = useState(false);
    const [profileTab, setProfileTab] = useState('trophies');

    // Fetch profile data
    useEffect(() => {
        async function fetchProfile() {
            if (!walletAddress) return;

            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
                const response = await fetch(`${backendUrl}/api/users/${walletAddress}`);
                const data = await response.json();

                if (data.success) {
                    setProfile(data.profile);
                    setStats(data.stats);
                    setBadges(data.badges || []);
                    if (data.profile) {
                        setUsername(data.profile.username || '');
                        setXHandle(data.profile.xHandle || '');
                    }
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchProfile();
    }, [walletAddress]);

    // Check username availability
    const checkUsername = async (value) => {
        if (!value || value.length < 3) {
            setUsernameAvailable(null);
            return;
        }

        // Skip check if it's the current username
        if (profile?.username === value) {
            setUsernameAvailable(true);
            return;
        }

        setUsernameChecking(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
            const response = await fetch(`${backendUrl}/api/users/check-username/${value}`);
            const data = await response.json();
            setUsernameAvailable(data.available);
        } catch (error) {
            console.error('Error checking username:', error);
        } finally {
            setUsernameChecking(false);
        }
    };

    // Save profile
    const handleSave = async () => {
        if (!walletAddress) return;

        // Validate username format
        if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
            toast.error('Username must be 3-20 lowercase letters, numbers, or underscores');
            return;
        }

        // Validate x handle format
        if (xHandle && !/^[a-zA-Z0-9_]{1,15}$/.test(xHandle)) {
            toast.error('X handle must be 1-15 characters');
            return;
        }

        setSaving(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
            const response = await fetch(`${backendUrl}/api/users/${walletAddress}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username || null, xHandle: xHandle || null }),
            });
            const data = await response.json();

            if (data.success) {
                setProfile(data.profile);
                toast.success('Profile saved!');
            } else {
                toast.error(data.error || 'Failed to save profile');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            toast.error('Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <MyProfileTabSkeleton />;
    }

    const truncatedWallet = walletAddress
        ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
        : '';

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Sidebar - Profile Info & Quick Stats */}
            <div className="w-full lg:w-1/3 space-y-4">
                {/* Profile Info Card */}
                <DegenCard variant="white" padding="md">
                    {/* Avatar/Icon */}
                    <div className="w-20 h-20 mx-auto mb-4 bg-degen-black flex items-center justify-center text-degen-white text-3xl font-bold border border-degen-black">
                        {profile?.username ? profile.username[0].toUpperCase() : '?'}
                    </div>

                    {/* Username */}
                    <h2 className="text-degen-black text-xl font-medium text-center uppercase tracking-wider mb-2">
                        {profile?.username || 'Anonymous'}
                    </h2>

                    {/* X Handle */}
                    {profile?.xHandle && (
                        <a
                            href={`https://x.com/${profile.xHandle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-degen-blue text-sm text-center block mb-3 hover:underline"
                        >
                            @{profile.xHandle}
                        </a>
                    )}

                    {/* Wallet */}
                    <p className="text-degen-text-muted text-xs text-center font-mono mb-4">
                        {truncatedWallet}
                    </p>
                </DegenCard>

                {/* Quick Stats Card */}
                {stats && (
                    <DegenCard variant="default" padding="md">
                        <h3 className="text-degen-black text-sm font-medium uppercase tracking-wider mb-3">
                            Quick Stats
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="text-center p-2 bg-degen-white border border-degen-black">
                                <p className="text-degen-text-muted text-xs uppercase">Boxes</p>
                                <p className="text-degen-black text-lg font-medium">{stats.totalBoxes || 0}</p>
                            </div>
                            <div className="text-center p-2 bg-degen-white border border-degen-black">
                                <p className="text-degen-text-muted text-xs uppercase">Wins</p>
                                <p className="text-degen-black text-lg font-medium">{stats.winsCount || 0}</p>
                            </div>
                            <div className={`text-center p-2 border border-degen-black ${stats.jackpotCount > 0 ? 'bg-degen-yellow' : 'bg-degen-white'}`}>
                                <p className="text-degen-text-muted text-xs uppercase">Jackpots</p>
                                <p className="text-degen-black text-lg font-medium">{stats.jackpotCount || 0}</p>
                            </div>
                            <div className="text-center p-2 bg-degen-white border border-degen-black">
                                <p className="text-degen-text-muted text-xs uppercase">Projects</p>
                                <p className="text-degen-black text-lg font-medium">{stats.projectsCreated || 0}</p>
                            </div>
                        </div>
                    </DegenCard>
                )}

                {/* Badges Preview */}
                {badges && badges.length > 0 && (
                    <DegenCard variant="default" padding="md">
                        <h3 className="text-degen-black text-sm font-medium uppercase tracking-wider mb-3">
                            Badges ({badges.length})
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {badges.slice(0, 6).map((badge) => (
                                <div
                                    key={badge.badge_type}
                                    className="w-10 h-10 bg-degen-container border border-degen-black flex items-center justify-center"
                                    title={badge.name}
                                >
                                    {badge.icon ? (
                                        <img src={badge.icon} alt={badge.name} className="w-6 h-6" />
                                    ) : (
                                        <span className="text-xs font-bold">{badge.badge_type[0].toUpperCase()}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </DegenCard>
                )}
            </div>

            {/* Right Panel - Tabbed Content */}
            <div className="w-full lg:w-2/3">
                <DegenTabs value={profileTab} onValueChange={setProfileTab}>
                    <DegenTabsList className="mb-4">
                        <DegenTabsTrigger value="trophies">
                            Trophies
                        </DegenTabsTrigger>
                        <DegenTabsTrigger value="stats">
                            Stats
                        </DegenTabsTrigger>
                        <DegenTabsTrigger value="settings">
                            Settings
                        </DegenTabsTrigger>
                        <DegenTabsTrigger value="support">
                            Support
                        </DegenTabsTrigger>
                    </DegenTabsList>

                    {/* Trophies Tab */}
                    <DegenTabsContent value="trophies">
                        <TrophyCabinet walletAddress={walletAddress} username={profile?.username} />
                    </DegenTabsContent>

                    {/* Stats Tab */}
                    <DegenTabsContent value="stats">
                        <ProfileStats stats={stats} />
                        <ProfileBadges badges={badges} username={profile?.username} className="mt-4" />
                    </DegenTabsContent>

                    {/* Settings Tab */}
                    <DegenTabsContent value="settings">
                        <DegenCard variant="white" padding="lg">
                            <h2 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-6">
                                Profile Settings
                            </h2>

                            {/* Wallet Address */}
                            <div className="mb-6">
                                <label className="block text-degen-black font-medium text-sm uppercase tracking-wider mb-2">
                                    Wallet Address
                                </label>
                                <p className="text-degen-text-muted font-mono text-sm bg-degen-container p-3 border border-degen-black break-all">
                                    {walletAddress}
                                </p>
                            </div>

                            {/* Username */}
                            <div className="mb-6">
                                <label className="block text-degen-black font-medium text-sm uppercase tracking-wider mb-2">
                                    Username
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => {
                                            const value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                                            setUsername(value);
                                            setUsernameAvailable(null);
                                        }}
                                        onBlur={() => checkUsername(username)}
                                        placeholder="your_username"
                                        className="w-full px-3 py-2 bg-degen-white text-degen-black placeholder:text-degen-text-muted border border-degen-black outline-none transition-colors duration-100 focus:bg-degen-container"
                                        maxLength={20}
                                    />
                                    {usernameChecking && (
                                        <div className="absolute right-3 top-2 text-degen-text-muted">...</div>
                                    )}
                                    {usernameAvailable === true && !usernameChecking && (
                                        <div className="absolute right-3 top-2 text-degen-green">OK</div>
                                    )}
                                    {usernameAvailable === false && !usernameChecking && (
                                        <div className="absolute right-3 top-2 text-degen-feature">Taken</div>
                                    )}
                                </div>
                                <p className="text-degen-text-muted text-xs mt-1">
                                    3-20 characters, lowercase letters, numbers, and underscores only
                                </p>
                            </div>

                            {/* X Handle */}
                            <div className="mb-6">
                                <label className="block text-degen-black font-medium text-sm uppercase tracking-wider mb-2">
                                    X.com Username
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-degen-text-muted">@</span>
                                    <input
                                        type="text"
                                        value={xHandle}
                                        onChange={(e) => setXHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                        placeholder="your_handle"
                                        className="flex-1 px-3 py-2 bg-degen-white text-degen-black placeholder:text-degen-text-muted border border-degen-black outline-none transition-colors duration-100 focus:bg-degen-container"
                                        maxLength={15}
                                    />
                                </div>
                            </div>

                            {/* Save Button */}
                            <DegenButton
                                onClick={handleSave}
                                disabled={saving || usernameAvailable === false}
                                variant="primary"
                                size="lg"
                            >
                                {saving ? 'Saving...' : 'Save Profile'}
                            </DegenButton>
                        </DegenCard>
                    </DegenTabsContent>

                    {/* Support Tab */}
                    <DegenTabsContent value="support">
                        <DegenCard variant="white" padding="lg">
                            <h2 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-6">
                                Frequently Asked Questions
                            </h2>

                            <div className="space-y-2">
                                <DegenAccordion title="How do I open a box?">
                                    <p className="text-degen-text-muted text-sm">
                                        Click "Open Box" to commit randomness, wait 10 seconds for the oracle, then click "Reveal" to see your result.
                                    </p>
                                </DegenAccordion>

                                <DegenAccordion title="What happens if I don't reveal in time?">
                                    <p className="text-degen-text-muted text-sm">
                                        You have 1 hour to reveal after opening. If you miss the window, the box becomes a Dud.
                                    </p>
                                </DegenAccordion>

                                <DegenAccordion title="How do trophies work?">
                                    <p className="text-degen-text-muted text-sm">
                                        Every winning box (rebate or better) earns you a unique trophy badge that appears in your collection.
                                    </p>
                                </DegenAccordion>

                                <DegenAccordion title="What are the win tiers?">
                                    <p className="text-degen-text-muted text-sm">
                                        Dud (0x), Rebate (0.5x), Break-even (1x), Profit (1.5x), Jackpot (4x)
                                    </p>
                                </DegenAccordion>

                                <DegenAccordion title="What if there's a system error during reveal?">
                                    <p className="text-degen-text-muted text-sm">
                                        If the oracle or network fails during reveal, you'll be eligible for a full refund of the box price. The refund button will appear automatically.
                                    </p>
                                </DegenAccordion>

                                <DegenAccordion title="How do I claim my winnings?">
                                    <p className="text-degen-text-muted text-sm">
                                        After revealing a winning box, click the "Claim" button to transfer your reward to your wallet. Make sure you have enough SOL for transaction fees.
                                    </p>
                                </DegenAccordion>
                            </div>
                        </DegenCard>
                    </DegenTabsContent>
                </DegenTabs>
            </div>
        </div>
    );
}

function MyBoxesTab({ walletAddress }) {
    const [boxesData, setBoxesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPending, startTransition] = useTransition();

    // Fetch boxes data
    const fetchUserBoxes = useCallback(async () => {
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
    }, [walletAddress]);

    // Refresh boxes with transition (non-blocking update)
    const refreshBoxes = useCallback(() => {
        startTransition(() => {
            fetchUserBoxes();
        });
    }, [fetchUserBoxes]);

    // Initial load
    useEffect(() => {
        fetchUserBoxes();
    }, [fetchUserBoxes]);

    if (loading) {
        return <MyBoxesTabSkeleton />;
    }

    if (error) {
        return (
            <DegenCard variant="feature" padding="md">
                <p className="text-white text-center">Error: {error}</p>
            </DegenCard>
        );
    }

    if (!boxesData || boxesData.totalBoxes === 0) {
        return (
            <DegenEmptyState
                icon=""
                title="No Boxes Yet"
                description="You haven't purchased any lootboxes yet. Browse projects to get started!"
            />
        );
    }

    return (
        <div className={`space-y-3 transition-opacity duration-150 ${isPending ? 'opacity-70' : 'opacity-100'}`}>
            {/* Summary */}
            <DegenCard variant="default" padding="sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-degen-black text-lg font-medium uppercase tracking-wider">Your Collection</h2>
                        <p className="text-degen-text-muted text-sm">
                            {boxesData.totalBoxes} box{boxesData.totalBoxes !== 1 ? 'es' : ''} across {boxesData.projectCount} project{boxesData.projectCount !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        {isPending && (
                            <div className="text-degen-text-muted text-sm animate-pulse">
                                Updating...
                            </div>
                        )}
                    </div>
                </div>
            </DegenCard>

            {/* Projects with Boxes */}
            {boxesData.projectsWithBoxes.map((projectGroup) => (
                <ProjectBoxesGroup
                    key={projectGroup.project.id}
                    projectGroup={projectGroup}
                    onRefresh={refreshBoxes}
                />
            ))}
        </div>
    );
}

function ProjectBoxesGroup({ projectGroup, onRefresh }) {
    const { project, boxes } = projectGroup;
    const projectUrl = getProjectUrl(project.subdomain);

    // Sort boxes by box_number in reverse order (newest first)
    const sortedBoxes = [...boxes].sort((a, b) => b.box_number - a.box_number);

    // Count box states
    const pendingBoxes = boxes.filter(b => b.box_result === 0).length;
    const revealedBoxes = boxes.filter(b => b.box_result !== 0).length;

    return (
        <DegenCard variant="default" padding="none" className="overflow-hidden">
            {/* Project Header */}
            <div className="p-3 border-b border-degen-black flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-degen-black flex items-center justify-center text-xl text-degen-white">

                    </div>
                    <div>
                        <h3 className="text-degen-black text-lg font-extrabold uppercase tracking-wider">{project.project_name}</h3>
                        <a
                            href={projectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-degen-blue hover:underline text-sm hidden lg:block"
                        >
                            {project.subdomain}.degenbox.fun
                        </a>

                        <a
                            href={projectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-degen-blue hover:underline text-sm block lg:hidden"
                        >
                            Go to project
                        </a>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-degen-black font-medium">{boxes.length} box{boxes.length !== 1 ? 'es' : ''}</p>
                    <p className="text-degen-text-muted text-sm">
                        {pendingBoxes} pending, {revealedBoxes} revealed
                    </p>
                </div>
            </div>

            {/* Boxes Grid */}
            <div className="p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {sortedBoxes.map((box) => (
                        <BoxCard
                            key={box.id}
                            box={box}
                            project={project}
                            onRefresh={onRefresh}
                        />
                    ))}
                </div>
            </div>
        </DegenCard>
    );
}

// Question mark tooltip component for explanations
function QuestionMarkTooltip({ children, variant = 'info' }) {
    const [showTooltip, setShowTooltip] = useState(false);

    const handleClick = (e) => {
        e.stopPropagation();
        setShowTooltip(prev => !prev);
    };

    const handleClose = (e) => {
        e.stopPropagation();
        setShowTooltip(false);
    };

    // Color variants
    const colors = {
        info: 'bg-degen-blue text-white',
        warning: 'bg-degen-yellow text-degen-black',
        danger: 'bg-red-500 text-white',
        refund: 'bg-degen-black text-white'
    };

    return (
        <div className="relative inline-block">
            <button
                onClick={handleClick}
                className={`w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer ${colors[variant]}`}
                title="Click for info"
            >
                ?
            </button>
            {showTooltip && (
                <>
                    <div className="fixed inset-0 z-10" onClick={handleClose} />
                    <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-degen-white border border-degen-black shadow-lg">
                        <div className="px-3 py-2 text-xs text-degen-black">
                            {children}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

// Pie clock timer component for expiry countdown
function ExpiryPieClock({ expiryCountdown, formatExpiryTime }) {
    const [showTooltip, setShowTooltip] = useState(false);

    // Calculate remaining time as a fraction (1 = full, 0 = empty)
    const totalSeconds = REVEAL_WINDOW_SECONDS;
    const remaining = expiryCountdown > 0 ? (expiryCountdown / totalSeconds) : 0;

    // SVG arc calculation for pie slice
    const size = 20;
    const center = size / 2;
    const radius = 7;

    // Calculate the arc path for REMAINING time (black portion)
    // Starts at 12 o'clock, draws counter-clockwise to show remaining time
    // 60 mins = full black circle, 30 mins = left half black, 15 mins = top-left quarter black
    const getRemainingArcPath = () => {
        if (remaining <= 0) return '';
        if (remaining >= 1) {
            // Full circle
            return `M ${center} ${center - radius} A ${radius} ${radius} 0 1 1 ${center - 0.001} ${center - radius} Z`;
        }

        // Draw arc counter-clockwise from 12 o'clock for remaining time
        // This makes the black portion shrink clockwise as time passes
        const angle = remaining * 360;
        const radians = (-angle - 90) * (Math.PI / 180); // Negative for counter-clockwise
        const x = center + radius * Math.cos(radians);
        const y = center + radius * Math.sin(radians);
        const largeArc = angle > 180 ? 1 : 0;

        // Draw counter-clockwise (sweep-flag = 0)
        return `M ${center} ${center} L ${center} ${center - radius} A ${radius} ${radius} 0 ${largeArc} 0 ${x} ${y} Z`;
    };

    const handleClick = (e) => {
        e.stopPropagation();
        setShowTooltip(prev => !prev);
    };

    const handleClose = (e) => {
        e.stopPropagation();
        setShowTooltip(false);
    };

    return (
        <div className="relative">
            <button
                onClick={handleClick}
                className="w-5 h-5 flex items-center justify-center cursor-pointer"
            >
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    {/* Background circle - white (elapsed/empty time) */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="#ffffff"
                    />
                    {/* Remaining time pie slice - black, shrinks clockwise as time passes */}
                    <path
                        d={getRemainingArcPath()}
                        fill="#1a1a1a"
                    />
                    {/* Border circle */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="#1a1a1a"
                        strokeWidth="1"
                    />
                </svg>
            </button>
            {showTooltip && (
                <>
                    <div className="fixed inset-0 z-10" onClick={handleClose} />
                    <div className="absolute right-0 top-full mt-1 z-20 min-w-[100px] bg-degen-white border border-degen-black shadow-sm">
                        <div className="px-3 py-2 text-sm text-degen-black">
                            {formatExpiryTime(expiryCountdown)} remaining
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

function BoxCard({ box, project, onRefresh }) {
    const { publicKey, signTransaction, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const { config } = useNetworkStore();
    const { toast } = useToast();
    const { startTransaction, addLog, endTransaction, startCountdown } = useTransaction();

    const walletAddress = publicKey?.toString();
    const network = config?.network || 'devnet';
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState(null); // 'commit' | 'reveal' | 'claim'
    const [revealResult, setRevealResult] = useState(null);
    const [error, setError] = useState(null);
    const [revealCountdown, setRevealCountdown] = useState(null); // seconds until reveal enabled
    const [expiryCountdown, setExpiryCountdown] = useState(null); // seconds until commit expires
    const [commitCooldown, setCommitCooldown] = useState(null); // seconds until "Open Box" enabled after purchase
    const [, startBoxTransition] = useTransition();

    // Win popup state
    const [showWinModal, setShowWinModal] = useState(false);
    const [winData, setWinData] = useState(null);

    // Optimistic box state for instant UI feedback
    const [optimisticBox, setOptimisticBox] = useOptimistic(
        box,
        (currentBox, update) => ({ ...currentBox, ...update })
    );

    // Use optimistic state for rendering
    const displayBox = optimisticBox;

    // Box states (using optimistic state)
    const isRevealed = displayBox.box_result > 0;
    const isCommitted = displayBox.randomness_committed && !isRevealed;
    const isPending = displayBox.box_result === 0 && !displayBox.randomness_committed;
    const hasReward = displayBox.payout_amount > 0;
    const isJackpot = displayBox.box_result === 5;
    const isRefunded = displayBox.box_result === 6;
    // Use actual box prop for refund_eligible (not optimistic state) since it's set by backend
    // Also check optimistic state in case we just marked it eligible in this session
    const isRefundEligible = (box.refund_eligible === true || displayBox.refund_eligible === true) && !isRefunded;

    // Check if commit has expired (uses REVEAL_WINDOW_SECONDS config)
    // Use parseAsUTC to handle timezone-agnostic timestamps from database
    const committedAtUTC = parseAsUTC(box.committed_at);
    const isExpired = isCommitted && committedAtUTC &&
        (Date.now() - committedAtUTC > REVEAL_WINDOW_SECONDS * 1000);

    // Cooldown timer for pending boxes (must wait 30s after purchase before opening)
    useEffect(() => {
        if (!isPending || !box.created_at) return;

        // Use parseAsUTC to handle timezone-agnostic timestamps from database
        const createdTime = parseAsUTC(box.created_at);
        if (!createdTime) return;

        const COMMIT_COOLDOWN = 30 * 1000; // 30 seconds after purchase before commit/open is allowed

        const updateCooldown = () => {
            const now = Date.now();
            const timeSincePurchase = now - createdTime;

            if (timeSincePurchase < COMMIT_COOLDOWN) {
                setCommitCooldown(Math.ceil((COMMIT_COOLDOWN - timeSincePurchase) / 1000));
            } else {
                setCommitCooldown(0);
            }
        };

        updateCooldown();
        const interval = setInterval(updateCooldown, 1000);
        return () => clearInterval(interval);
    }, [isPending, box.created_at]);

    // Countdown timers for committed boxes
    useEffect(() => {
        if (!isCommitted || !box.committed_at) return;

        // Use parseAsUTC to handle timezone-agnostic timestamps from database
        const committedTime = parseAsUTC(box.committed_at);
        if (!committedTime) return;

        const REVEAL_DELAY = 10 * 1000; // 10 seconds before reveal enabled (oracles need time to process)
        const EXPIRY_TIME = REVEAL_WINDOW_SECONDS * 1000;

        const updateCountdowns = () => {
            const now = Date.now();
            const timeSinceCommit = now - committedTime;

            // Reveal countdown (10 seconds after commit)
            if (timeSinceCommit < REVEAL_DELAY) {
                setRevealCountdown(Math.ceil((REVEAL_DELAY - timeSinceCommit) / 1000));
            } else {
                setRevealCountdown(0);
            }

            // Expiry countdown
            const timeUntilExpiry = EXPIRY_TIME - timeSinceCommit;
            if (timeUntilExpiry > 0) {
                setExpiryCountdown(Math.ceil(timeUntilExpiry / 1000));
            } else {
                setExpiryCountdown(0);
            }
        };

        updateCountdowns();
        const interval = setInterval(updateCountdowns, 1000);
        return () => clearInterval(interval);
    }, [isCommitted, box.committed_at]);

    // Format expiry countdown as MM:SS
    const formatExpiryTime = (seconds) => {
        if (seconds <= 0) return 'Expired';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Format payout amount
    const payoutFormatted = box.payout_amount
        ? (box.payout_amount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)
        : '0';

    // Solscan URLs (more user-friendly than Solana Explorer)
    const getSolscanTxUrl = (signature) => {
        const base = 'https://solscan.io/tx';
        return network === 'mainnet-beta'
            ? `${base}/${signature}`
            : `${base}/${signature}?cluster=${network}`;
    };

    const getSolscanAccountUrl = (address) => {
        const base = 'https://solscan.io/account';
        return network === 'mainnet-beta'
            ? `${base}/${address}`
            : `${base}/${address}?cluster=${network}`;
    };

    // Build menu items for on-chain proof
    const getMenuItems = () => {
        const items = [];

        // Purchase transaction
        if (box.purchase_tx_signature) {
            items.push({
                label: 'Purchase Tx',
                onClick: () => window.open(getSolscanTxUrl(box.purchase_tx_signature), '_blank'),
            });
        }

        // Reveal transaction (if revealed)
        if (box.reveal_tx_signature) {
            items.push({
                label: 'Reveal Tx',
                onClick: () => window.open(getSolscanTxUrl(box.reveal_tx_signature), '_blank'),
            });
        }

        // Settle/Claim transaction (if claimed, not refunded)
        if (box.settle_tx_signature && !isRefunded) {
            items.push({
                label: 'Claim Tx',
                onClick: () => window.open(getSolscanTxUrl(box.settle_tx_signature), '_blank'),
            });
        }

        // Refund transaction (if refunded)
        if (box.refund_tx_signature) {
            items.push({
                label: 'Refund Tx',
                onClick: () => window.open(getSolscanTxUrl(box.refund_tx_signature), '_blank'),
            });
        }

        // Box PDA account (if we have it)
        if (box.box_pda) {
            items.push({
                label: 'Box Account',
                onClick: () => window.open(getSolscanAccountUrl(box.box_pda), '_blank'),
            });
        }

        // If revealed (and not refunded), show the result details
        if (isRevealed && !isRefunded && (box.luck_value !== undefined || box.random_percentage !== undefined)) {
            items.push({
                label: `Luck: ${box.luck_value || '?'}/${box.max_luck || '?'}`,
                onClick: () => { },
            });
            if (box.random_percentage !== undefined) {
                items.push({
                    label: `Random: ${box.random_percentage?.toFixed(2) || '?'}%`,
                    onClick: () => { },
                });
            }
        }

        return items;
    };

    // Get tier name from result
    // DB values: 0=pending, 1=dud, 2=rebate, 3=break-even, 4=profit, 5=jackpot, 6=refunded
    const getTierName = (result) => {
        switch (result) {
            case 1: return 'Dud';
            case 2: return 'Rebate';
            case 3: return 'Break-even';
            case 4: return 'Profit';
            case 5: return 'Jackpot';
            case 6: return 'Refunded';
            default: return 'Pending';
        }
    };

    // Construct badge URL from tier and badge image ID
    const getBadgeUrl = (tier, badgeImageId) => {
        if (!badgeImageId || tier < 2) return null;

        const tierFolders = { 2: '0.5x', 3: '1x', 4: '1.5x', 5: '4x' };
        const tierPrefixes = { 2: 'badge_0-5x_', 3: 'badge_1x_', 4: 'badge_1-5x_', 5: 'badge_4x_' };

        const folder = tierFolders[tier];
        const prefix = tierPrefixes[tier];
        if (!folder || !prefix) return null;

        const paddedId = String(badgeImageId).padStart(3, '0');
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        return `${supabaseUrl}/storage/v1/object/public/badges/${folder}/${prefix}${paddedId}.png`;
    };

    // Handle commit box (Open Box - step 1)
    const handleCommit = async () => {
        if (!publicKey || !signTransaction) return;

        setIsProcessing(true);
        setProcessingStep('commit');
        setError(null);
        startTransaction(`Opening Box #${box.box_number}...`);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            // Optimistic update: immediately show as "committed" state (wrapped in transition)
            startBoxTransition(() => {
                setOptimisticBox({ randomness_committed: true, committed_at: new Date().toISOString() });
            });

            // Step 1: Build commit transaction
            addLog('Building transaction...');
            const buildResponse = await fetch(`${backendUrl}/api/program/build-commit-box-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    ownerWallet: walletAddress,
                }),
            });

            const buildResult = await buildResponse.json();
            if (!buildResult.success) {
                throw new Error(buildResult.details || buildResult.error);
            }
            addLog('Transaction built');

            // Step 2: Deserialize transaction
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));

            // Step 3: Add randomness keypair as signer (base64 encoded from backend)
            addLog('Creating randomness account...');
            const { Keypair } = await import('@solana/web3.js');
            const secretKeyBytes = Buffer.from(buildResult.randomnessKeypair, 'base64');
            const randomnessKeypair = Keypair.fromSecretKey(secretKeyBytes);

            // Get fresh blockhash
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;
            transaction.feePayer = publicKey;

            // Partially sign with randomness keypair first
            transaction.partialSign(randomnessKeypair);

            // Step 4: Sign with user's wallet
            addLog('Requesting wallet signature...');
            const signedTransaction = await signTransaction(transaction);

            // Step 5: Send the signed transaction
            addLog('Submitting to Solana...');
            const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
                skipPreflight: true,
                preflightCommitment: 'confirmed',
            });
            addLog(`TX: ${signature.slice(0, 8)}...`);

            // Step 6: Wait for confirmation
            addLog('Waiting for confirmation...');
            await connection.confirmTransaction(signature, 'confirmed');

            // Optimistic UI update - show committed state immediately
            startBoxTransition(() => {
                setOptimisticBox({
                    randomness_committed: true,
                    randomness_account: buildResult.randomnessAccount
                });
            });

            // Step 7: Confirm with backend
            addLog('Confirming with backend...');
            await fetch(`${backendUrl}/api/program/confirm-commit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    signature,
                    randomnessAccount: buildResult.randomnessAccount,
                }),
            });

            endTransaction(true, 'Box opened! Wait 10s then reveal.');
            // Refresh boxes list to show committed state
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error('Error committing box:', err);
            let errorMessage = err.message;
            if (err.logs) {
                console.error('Transaction logs:', err.logs);
            }
            setError(errorMessage);
            endTransaction(false, errorMessage);
        } finally {
            setIsProcessing(false);
            setProcessingStep(null);
        }
    };

    // Handle reveal box (step 2 - after commit)
    const handleReveal = async () => {
        if (!publicKey || !sendTransaction) return;

        // Check if reveal is too soon (need to wait ~10 seconds for oracle)
        if (revealCountdown > 0) {
            setError(`Please wait ${revealCountdown} seconds for oracle...`);
            return;
        }

        setIsProcessing(true);
        setProcessingStep('reveal');
        setError(null);
        startTransaction(`Revealing Box #${box.box_number}...`);

        // Note: We don't optimistically update reveal since we don't know the result yet
        // The result comes from the blockchain/mock, so we wait for the actual response

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            // Step 1: Build reveal transaction
            // Start 16-second countdown - this is the oracle timeout duration
            addLog('Waiting for oracle randomness...');
            startCountdown(16);
            const buildResponse = await fetch(`${backendUrl}/api/program/build-reveal-box-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    ownerWallet: walletAddress,
                }),
            });

            const buildResult = await buildResponse.json();

            if (!buildResult.success) {
                // Handle specific error codes from backend
                const errorCode = buildResult.errorCode;
                console.log('Reveal failed:', { errorCode, refundEligible: buildResult.refundEligible, error: buildResult.error });

                // PRIORITY: If backend marked as refund-eligible, update UI immediately
                // This takes precedence over other error handling to ensure user can claim refund
                if (buildResult.refundEligible === true) {
                    console.log('Box marked as refund-eligible by backend - updating UI immediately');
                    startBoxTransition(() => {
                        setOptimisticBox({
                            refund_eligible: true,
                            randomness_committed: false  // Clear committed state so box shows refund UI
                        });
                    });
                    // Don't show error message - the refund UI with info tooltip is sufficient
                    setError(null);
                    endTransaction(false, 'Refund available');
                    if (onRefresh) onRefresh();
                    return;
                }

                // Check if expired - box becomes a Dud
                if (buildResult.expired || errorCode === 'REVEAL_EXPIRED') {
                    // Update UI immediately to show Dud state
                    startBoxTransition(() => {
                        setOptimisticBox({
                            box_result: 1, // Dud tier
                            payout_amount: 0,
                            randomness_committed: false,
                        });
                    });
                    endTransaction(false, 'Reveal window expired - box is now a Dud');
                    if (onRefresh) onRefresh();
                    return;
                }

                // Handle oracle unavailability - show retry message
                // Note: If refundEligible was true, it was already handled above
                if (errorCode === 'ORACLE_UNAVAILABLE' || errorCode === 'ORACLE_TIMEOUT') {
                    const timeRemaining = buildResult.timeRemainingSeconds;
                    let timeMsg = '';
                    if (timeRemaining && timeRemaining > 0) {
                        const mins = Math.floor(timeRemaining / 60);
                        const secs = timeRemaining % 60;
                        timeMsg = ` You have ${mins}m ${secs}s remaining to retry.`;
                    }
                    const retryMsg = buildResult.retryAfterSeconds
                        ? ` Try again in ${buildResult.retryAfterSeconds} seconds.`
                        : ' Please try again shortly.';

                    const fullErrorMsg = buildResult.error + timeMsg + retryMsg;
                    setError(fullErrorMsg);
                    endTransaction(false, 'Oracle temporarily unavailable');
                    return;
                }

                // Handle insufficient funds
                if (errorCode === 'INSUFFICIENT_FUNDS') {
                    setError(buildResult.error);
                    endTransaction(false, 'Insufficient SOL for fees');
                    return;
                }

                throw new Error(buildResult.details || buildResult.error);
            }

            // Check if result was recovered from on-chain (already revealed)
            if (buildResult.alreadyRevealed && buildResult.reward) {
                addLog('Result recovered from on-chain!');

                // Update UI with recovered result
                startBoxTransition(() => {
                    setOptimisticBox({
                        box_result: buildResult.reward.tier,
                        payout_amount: buildResult.reward.payoutAmount,
                        randomness_committed: false
                    });
                });
                setRevealResult(buildResult.reward);

                const tierName = getTierName(buildResult.reward.tier);
                const payout = buildResult.reward.payoutAmount
                    ? (buildResult.reward.payoutAmount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)
                    : '0';
                endTransaction(true, `Recovered: ${tierName}! Payout: ${payout} ${project.payment_token_symbol}`);

                // Show win popup for winning results (tier > 1, not dud)
                if (buildResult.reward.tier > 1) {
                    setWinData({
                        tier: buildResult.reward.tier,
                        amount: payout,
                        tokenSymbol: project.payment_token_symbol,
                        projectUrl: getProjectUrl(project.subdomain),
                        badgeUrl: getBadgeUrl(buildResult.reward.tier, buildResult.reward.badgeImageId),
                    });
                    setShowWinModal(true);
                }

                // Refresh boxes list
                if (onRefresh) onRefresh();
                return;
            }

            addLog('Reveal transaction built');

            // Step 2: Deserialize transaction
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;

            // Step 3: Send transaction using wallet adapter
            addLog('Requesting wallet signature...');
            const signature = await sendTransaction(transaction, connection, {
                skipPreflight: true,
            });
            addLog(`TX: ${signature.slice(0, 8)}...`);

            // Step 4: Wait for confirmation
            addLog('Waiting for confirmation...');
            await connection.confirmTransaction(signature, 'confirmed');

            // Step 5: Confirm with backend to read on-chain reward
            addLog('Reading on-chain result...');
            const confirmResponse = await fetch(`${backendUrl}/api/program/confirm-reveal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    ownerWallet: walletAddress,
                    signature,
                }),
            });

            const confirmResult = await confirmResponse.json();
            if (confirmResult.success && confirmResult.reward) {
                // Optimistic update with reveal result (wrapped in transition)
                startBoxTransition(() => {
                    setOptimisticBox({
                        box_result: confirmResult.reward?.tier || 1,
                        payout_amount: confirmResult.reward?.payoutAmount || 0,
                        randomness_committed: false
                    });
                });
                setRevealResult(confirmResult.reward);

                const tierName = getTierName(confirmResult.reward?.tier);
                const payout = confirmResult.reward?.payoutAmount
                    ? (confirmResult.reward.payoutAmount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)
                    : '0';
                endTransaction(true, `Result: ${tierName}! Payout: ${payout} ${project.payment_token_symbol}`);

                // Show win popup for winning results (tier > 1, not dud)
                if (confirmResult.reward?.tier > 1) {
                    setWinData({
                        tier: confirmResult.reward.tier,
                        amount: payout,
                        tokenSymbol: project.payment_token_symbol,
                        projectUrl: getProjectUrl(project.subdomain),
                        badgeUrl: getBadgeUrl(confirmResult.reward.tier, confirmResult.reward.badgeImageId),
                    });
                    setShowWinModal(true);
                }
            } else {
                endTransaction(true, 'Revealed!');
            }

            // Refresh boxes list
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error('Error revealing box:', err);

            // Check if this is "already processed" error - means the reveal happened but we missed it
            // Retry the reveal call to trigger backend's recovery flow
            if (err.message?.includes('already been processed') || err.message?.includes('AlreadyProcessed')) {
                console.log('Transaction already processed - retrying to trigger recovery flow...');
                addLog('Recovering result...');

                try {
                    const retryResponse = await fetch(`${backendUrl}/api/program/build-reveal-box-tx`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            projectId: project.project_numeric_id,
                            boxId: box.box_number,
                            ownerWallet: walletAddress,
                        }),
                    });

                    const retryResult = await retryResponse.json();

                    if (retryResult.alreadyRevealed && retryResult.reward) {
                        // Recovery succeeded!
                        startBoxTransition(() => {
                            setOptimisticBox({
                                box_result: retryResult.reward.tier,
                                payout_amount: retryResult.reward.payoutAmount,
                                randomness_committed: false
                            });
                        });
                        setRevealResult(retryResult.reward);

                        const tierName = getTierName(retryResult.reward.tier);
                        const payout = retryResult.reward.payoutAmount
                            ? (retryResult.reward.payoutAmount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)
                            : '0';
                        endTransaction(true, `Recovered: ${tierName}! Payout: ${payout} ${project.payment_token_symbol}`);

                        // Show win popup for winning results (tier > 1, not dud)
                        if (retryResult.reward.tier > 1) {
                            setWinData({
                                tier: retryResult.reward.tier,
                                amount: payout,
                                tokenSymbol: project.payment_token_symbol,
                                projectUrl: getProjectUrl(project.subdomain),
                                badgeUrl: getBadgeUrl(retryResult.reward.tier, retryResult.reward.badgeImageId),
                            });
                            setShowWinModal(true);
                        }

                        if (onRefresh) onRefresh();
                        return;
                    }
                } catch (retryErr) {
                    console.error('Recovery retry failed:', retryErr);
                }
            }

            let errorMessage = err.message;
            if (err.logs) {
                console.error('Transaction logs:', err.logs);
                errorMessage = err.logs.join('\n');
            }
            if (err.message?.includes('custom program error')) {
                errorMessage = `Program error: ${err.message}`;
            }

            // Check if this is a user-caused error (they let the box expire)
            // Only user-caused expiry should NOT be refund-eligible
            const isUserCausedExpiry = err.message?.includes('expired') ||
                err.message?.includes('Expired');

            // Any reveal failure that isn't user-caused expiry should be refund-eligible
            // This includes: oracle errors, network issues, backend failures, etc.
            if (!isUserCausedExpiry) {
                errorMessage = 'System error during reveal. Please try again. If the issue persists and time runs out, a refund will be available.';

                // Mark box as refund-eligible for any system error
                try {
                    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
                    const markResponse = await fetch(`${backendUrl}/api/program/mark-reveal-failed`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            projectId: project.project_numeric_id,
                            boxId: box.box_number,
                            ownerWallet: walletAddress,
                            failureReason: `system_error: ${err.message?.substring(0, 200)}`,
                        }),
                    });
                    const markResult = await markResponse.json();
                    if (markResult.success) {
                        console.log('Box marked as refund-eligible due to system error');
                        // Update optimistic state to immediately show refund UI
                        startBoxTransition(() => {
                            setOptimisticBox({
                                refund_eligible: true,
                                randomness_committed: false  // Clear committed state so box shows refund UI
                            });
                        });
                        // Don't show error - the refund UI with info tooltip is sufficient
                        errorMessage = null;
                    }
                } catch (markErr) {
                    console.error('Failed to mark box as refund-eligible:', markErr);
                }
            }

            setError(errorMessage);
            setRevealResult(null);
            endTransaction(false, errorMessage);
        } finally {
            setIsProcessing(false);
            setProcessingStep(null);
        }
    };

    // Handle claim reward (settle)
    const handleClaim = async () => {
        if (!publicKey || !sendTransaction) return;

        setIsProcessing(true);
        setProcessingStep('claim');
        setError(null);

        startTransaction(`Claiming reward from Box #${box.box_number}...`);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            // Step 1: Build settle transaction
            addLog('Building settle transaction...');
            const buildResponse = await fetch(`${backendUrl}/api/program/build-settle-box-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    ownerWallet: walletAddress,
                }),
            });

            const buildResult = await buildResponse.json();

            if (!buildResult.success) {
                throw new Error(buildResult.details || buildResult.error);
            }
            addLog('Transaction built');

            // Step 2: Deserialize transaction and update blockhash
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;

            // Step 3: Send transaction using wallet adapter (handles signing internally)
            addLog('Requesting wallet signature...');
            const signature = await sendTransaction(transaction, connection, {
                skipPreflight: true,
            });
            addLog(`TX: ${signature.slice(0, 8)}...`);

            // Step 4: Wait for confirmation
            addLog('Waiting for confirmation...');
            await connection.confirmTransaction(signature, 'confirmed');

            // Optimistic UI update - show settled state immediately
            startBoxTransition(() => {
                setOptimisticBox({ settled_at: new Date().toISOString() });
            });

            // Step 5: Confirm with backend
            addLog('Confirming with backend...');
            await fetch(`${backendUrl}/api/program/confirm-settle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    signature,
                }),
            });

            // Show success and refresh
            endTransaction(true, `Claimed ${payoutFormatted} ${project.payment_token_symbol}!`);
            toast.success(`Successfully claimed ${payoutFormatted} ${project.payment_token_symbol}!`);
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error('Error claiming reward:', err);
            // Extract more detailed error info if available
            let errorMessage = err.message;
            if (err.logs) {
                console.error('Transaction logs:', err.logs);
                errorMessage = err.logs.join('\n');
            }
            if (err.message?.includes('custom program error')) {
                errorMessage = `Program error: ${err.message}`;
            }
            setError(errorMessage);
            endTransaction(false, errorMessage);
        } finally {
            setIsProcessing(false);
            setProcessingStep(null);
        }
    };

    // Handle refund (for boxes that failed due to system issues)
    const handleRefund = async () => {
        if (!publicKey || !sendTransaction) return;

        setIsProcessing(true);
        setProcessingStep('refund');
        setError(null);

        startTransaction(`Refunding Box #${box.box_number}...`);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            // Step 1: Build refund transaction
            addLog('Building refund transaction...');
            const buildResponse = await fetch(`${backendUrl}/api/program/build-refund-box-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    ownerWallet: walletAddress,
                }),
            });

            const buildResult = await buildResponse.json();

            if (!buildResult.success) {
                throw new Error(buildResult.details || buildResult.error);
            }
            addLog('Transaction built');

            // Step 2: Deserialize transaction and update blockhash
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;

            // Step 3: Send transaction using wallet adapter
            addLog('Requesting wallet signature...');
            const signature = await sendTransaction(transaction, connection, {
                skipPreflight: true,
            });
            addLog(`TX: ${signature.slice(0, 8)}...`);

            // Step 4: Wait for confirmation
            addLog('Waiting for confirmation...');
            await connection.confirmTransaction(signature, 'confirmed');

            // Step 5: Verify on-chain state with backend (BEFORE optimistic update)
            // This ensures the refund actually happened before showing success
            addLog('Verifying refund on-chain...');
            const confirmResponse = await fetch(`${backendUrl}/api/program/confirm-refund`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    ownerWallet: walletAddress,
                    signature,
                }),
            });

            const confirmResult = await confirmResponse.json();

            if (!confirmResult.success) {
                // On-chain verification failed - refund didn't actually happen
                console.error('Refund verification failed:', confirmResult.error);
                throw new Error(confirmResult.error || 'Refund verification failed - the transaction may not have executed correctly');
            }

            // NOW apply optimistic update after on-chain verification succeeds
            startBoxTransition(() => {
                setOptimisticBox({
                    box_result: 6,
                    refund_eligible: false,
                    payout_amount: buildResult.refundAmount,
                    refund_tx_signature: signature
                });
            });

            const refundFormatted = buildResult.refundAmount
                ? (buildResult.refundAmount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)
                : payoutFormatted;

            endTransaction(true, `Refunded ${refundFormatted} ${project.payment_token_symbol}!`);
            toast.success(`Successfully refunded ${refundFormatted} ${project.payment_token_symbol}!`);
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error('Error refunding box:', err);
            let errorMessage = err.message;
            if (err.logs) {
                console.error('Transaction logs:', err.logs);
            }
            setError(errorMessage);
            endTransaction(false, errorMessage);
        } finally {
            setIsProcessing(false);
            setProcessingStep(null);
        }
    };

    // Get box status text (no emojis)
    const getBoxStatusText = () => {
        if (isProcessing) return 'Processing';
        if (isRefunded) return 'Refunded';
        if (isRefundEligible) return 'Refund Available';
        if (isExpired) return 'Expired';
        if (isCommitted) return 'Opened';
        if (isPending) return 'Sealed';
        if (isJackpot) return 'JACKPOT';
        if (box.box_result === 4) return 'Profit';
        if (hasReward) return 'Winner';
        return 'Dud';
    };

    // Get badge variant for tier
    const getTierBadgeVariant = () => {
        if (isJackpot) return 'warning';
        if (hasReward) return 'success';
        return 'default';
    };

    const menuItems = getMenuItems();

    // Calculate reveal button progress (for the loading bar effect) - 10 second delay
    const revealProgress = revealCountdown !== null && revealCountdown > 0
        ? ((10 - revealCountdown) / 10) * 100
        : 100;

    return (
        <div
            className={`
                relative p-4 text-center transition-all duration-100
                border
                ${isPending ? 'bg-degen-yellow/10 border-degen-yellow hover:bg-degen-yellow/20' : ''}
                ${isCommitted && !isExpired && !isRefundEligible ? 'bg-degen-yellow/10 border-degen-yellow hover:bg-degen-yellow/20' : ''}
                ${isRefundEligible ? 'bg-degen-container border-degen-black' : ''}
                ${isRefunded ? 'bg-degen-container border-degen-black' : ''}
                ${isExpired && !isRefundEligible ? 'bg-degen-feature/10 border-degen-feature' : ''}
                ${isJackpot ? 'bg-degen-yellow/20 border-degen-yellow' : ''}
                ${hasReward && !isJackpot && !isRefunded ? 'bg-degen-green/10 border-degen-green hover:bg-degen-green/20' : ''}
                ${isRevealed && !hasReward && !isRefunded && !isRefundEligible ? 'bg-degen-container border-degen-black hover:bg-degen-white' : ''}
            `}
        >
            {/* Top right icons: Pie clock (for committed, not refund-eligible) + Proof Menu Dropdown */}
            <div className="absolute top-1 right-1 flex items-center gap-1">
                {/* Pie clock for committed boxes - hide if refund-eligible */}
                {isCommitted && !isExpired && !isRefundEligible && expiryCountdown !== null && expiryCountdown > 0 && (
                    <ExpiryPieClock expiryCountdown={expiryCountdown} formatExpiryTime={formatExpiryTime} />
                )}
                {/* Proof Menu Dropdown */}
                {menuItems.length > 0 && (
                    <CardDropdown items={menuItems} />
                )}
            </div>

            {/* Box Status Text (no emojis) */}
            <div className="text-sm font-medium text-degen-text-muted mb-1 mt-2">
                {getBoxStatusText()}
            </div>
            <p className="text-degen-black font-medium">Box #{box.box_number}</p>

            {/* Status / Result - Fixed height container */}
            <div className="mt-2 h-[42px] flex flex-col items-center justify-center">
                {isPending ? (
                    <DegenBadge variant="warning" size="sm">
                        Ready to Open
                    </DegenBadge>
                ) : isRefundEligible ? (
                    <div className="flex items-center justify-center gap-1">
                        <DegenBadge variant="default" size="sm">
                            Refund Available
                        </DegenBadge>
                        <QuestionMarkTooltip variant="info">
                            <strong>System Error</strong><br />
                            This box failed to reveal due to an oracle or network issue. You can claim a full refund of the box price.
                            {box.reveal_failure_reason && (
                                <><br /><br /><em>Reason: {box.reveal_failure_reason}</em></>
                            )}
                        </QuestionMarkTooltip>
                    </div>
                ) : isRefunded ? (
                    <>
                        <DegenBadge variant="default" size="sm">
                            Refunded
                        </DegenBadge>
                        {box.payout_amount > 0 && (
                            <p className="text-degen-text-muted text-xs mt-1 font-medium">
                                {payoutFormatted} {project.payment_token_symbol}
                            </p>
                        )}
                    </>
                ) : isExpired ? (
                    <div className="flex items-center justify-center gap-1">
                        <DegenBadge variant="danger" size="sm">
                            Expired - Dud
                        </DegenBadge>
                        <QuestionMarkTooltip variant="danger">
                            <strong>Reveal Window Expired</strong><br />
                            This box was opened but not revealed within the 1-hour time limit. Boxes must be revealed promptly after opening to claim rewards.
                        </QuestionMarkTooltip>
                    </div>
                ) : isCommitted ? (
                    <DegenBadge variant="warning" size="sm">
                        Awaiting Reveal
                    </DegenBadge>
                ) : (
                    <>
                        <DegenBadge variant={getTierBadgeVariant()} size="sm">
                            {getTierName(box.box_result)}
                        </DegenBadge>
                        {hasReward && !isRefunded && (
                            <p className="text-degen-black text-xs mt-1 font-medium">
                                {payoutFormatted} {project.payment_token_symbol}
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Error Display - Fixed height container (shows content or empty space) */}
            <div className="h-[48px] mt-2 flex items-center justify-center">
                {error ? (
                    <div className="bg-red-50 border border-red-200 rounded px-2 py-1.5 w-full">
                        <p className="text-red-700 text-xs font-medium">
                            {error.includes('oracle') || error.includes('Oracle')
                                ? 'Oracle Service Issue'
                                : error.includes('Insufficient')
                                    ? 'Insufficient Funds'
                                    : 'Error'}
                        </p>
                        <p className="text-red-600 text-xs mt-0.5 break-words line-clamp-1">
                            {error.length > 50 ? error.slice(0, 47) + '...' : error}
                        </p>
                    </div>
                ) : null}
            </div>

            {/* Action Button - Fixed height container */}
            <div className="h-[36px] flex items-center justify-center">
                {isPending ? (
                    // Step 1: Open Box (commit randomness) - with cooldown after purchase
                    <button
                        onClick={handleCommit}
                        disabled={isProcessing || (commitCooldown !== null && commitCooldown > 0)}
                        className={`
                            relative w-full h-[36px] text-sm font-medium uppercase tracking-wider
                            border border-degen-black overflow-hidden
                            transition-all duration-100
                            ${commitCooldown > 0 ? 'bg-degen-white cursor-not-allowed' : 'bg-degen-black text-degen-white hover:bg-degen-primary'}
                        `}
                    >
                        {/* Progress bar that fills from left to right - black background */}
                        {commitCooldown > 0 && (
                            <div
                                className="absolute inset-y-0 left-0 bg-degen-black transition-all duration-1000 ease-linear"
                                style={{ width: `${((30 - commitCooldown) / 30) * 100}%` }}
                            />
                        )}
                        {/* Text with mix-blend-difference - black on white, white on black */}
                        <span className={`relative z-10 ${commitCooldown > 0 ? 'mix-blend-difference text-white' : ''}`}>
                            {isProcessing && processingStep === 'commit'
                                ? 'Opening...'
                                : commitCooldown > 0
                                    ? `Open in ${commitCooldown}s`
                                    : 'Open Box'}
                        </span>
                    </button>
                ) : isRefundEligible ? (
                    // Refund available - show refund button
                    <button
                        onClick={handleRefund}
                        disabled={isProcessing}
                        className="w-full h-[36px] text-sm font-medium uppercase tracking-wider bg-degen-black text-degen-white border border-degen-black hover:bg-degen-primary transition-all duration-100"
                    >
                        {isProcessing && processingStep === 'refund' ? 'Refunding...' : 'Claim Refund'}
                    </button>
                ) : isRefunded ? (
                    // Already refunded - text centered in fixed height
                    <span className="text-degen-text-muted text-xs font-medium">Refund claimed</span>
                ) : isExpired ? (
                    // Expired - text centered in fixed height
                    <span className="text-degen-text-muted text-xs">Reveal window expired</span>
                ) : isCommitted ? (
                    // Step 2: Reveal Box (after commit) - with progress bar
                    <button
                        onClick={handleReveal}
                        disabled={isProcessing || revealCountdown > 0}
                        className={`
                            relative w-full h-[36px] text-sm font-medium uppercase tracking-wider
                            border border-degen-black overflow-hidden
                            transition-all duration-100
                            ${revealCountdown > 0 ? 'bg-degen-container text-degen-text-muted cursor-not-allowed' : 'bg-degen-yellow text-degen-black hover:bg-degen-black hover:text-degen-white'}
                        `}
                    >
                        {/* Progress bar that fills from left to right */}
                        {revealCountdown > 0 && (
                            <div
                                className="absolute inset-y-0 left-0 bg-degen-yellow/60 transition-all duration-1000 ease-linear"
                                style={{ width: `${revealProgress}%` }}
                            />
                        )}
                        <span className="relative z-10">
                            {isProcessing && processingStep === 'reveal'
                                ? 'Revealing...'
                                : revealCountdown > 0
                                    ? `Reveal in ${revealCountdown}s`
                                    : 'Reveal Box'}
                        </span>
                    </button>
                ) : hasReward && !box.settled_at ? (
                    // Revealed with reward - claim button
                    <button
                        onClick={handleClaim}
                        disabled={isProcessing}
                        className="w-full h-[36px] text-sm font-medium uppercase tracking-wider bg-degen-green text-degen-black border border-degen-black hover:bg-degen-black hover:text-degen-white transition-all duration-100"
                    >
                        {isProcessing && processingStep === 'claim' ? 'Claiming...' : 'Claim'}
                    </button>
                ) : hasReward ? (
                    // Already claimed - badge centered in fixed height
                    <DegenBadge variant="success" size="sm">Claimed</DegenBadge>
                ) : (
                    // Revealed but no reward (dud) - text centered in fixed height
                    <span className="text-degen-text-muted text-xs">No reward</span>
                )}
            </div>

            {/* Purchase Date */}
            <p className="text-degen-text-light text-xs mt-2">
                {new Date(box.created_at).toLocaleDateString()}
            </p>

            {/* Win Modal */}
            <WinModal
                isOpen={showWinModal}
                onClose={() => setShowWinModal(false)}
                tier={winData?.tier}
                amount={winData?.amount}
                tokenSymbol={winData?.tokenSymbol}
                badgeUrl={winData?.badgeUrl}
                onShare={winData ? getWinShareHandler(winData.tier, {
                    amount: winData.amount,
                    token: winData.tokenSymbol,
                    projectUrl: winData.projectUrl,
                }) : null}
            />
        </div>
    );
}

function ProjectCard({ project }) {
    const router = useRouter();
    const [vaultBalance, setVaultBalance] = useState(null);
    const [balanceLoading, setBalanceLoading] = useState(true);

    const isDevnet = project.network === 'devnet';
    const projectUrl = getProjectUrl(project.subdomain);

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
        <DegenCard variant="white" className="flex flex-col">
            {/* Network Badge */}
            {isDevnet && (
                <div className="mb-3">
                    <DegenBadge variant="warning" size="sm">
                        DEVNET
                    </DegenBadge>
                </div>
            )}

            {/* Project Logo */}
            {project.logo_url && (
                <img
                    src={project.logo_url}
                    alt={project.name}
                    className="w-16 h-16 mb-4 border border-degen-black"
                />
            )}

            {/* Project Name */}
            <h3 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-2">{project.name}</h3>

            {/* Description */}
            {project.description && (
                <p className="text-degen-text-muted text-sm mb-4 line-clamp-2">
                    {project.description}
                </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="text-center bg-degen-bg p-2 border border-degen-black">
                    <p className="text-degen-text-muted text-xs uppercase">Boxes</p>
                    <p className="text-degen-black font-medium">{project.total_boxes_created || 0}</p>
                </div>
                <div className="text-center bg-degen-bg p-2 border border-degen-black">
                    <p className="text-degen-text-muted text-xs uppercase">Settled</p>
                    <p className="text-degen-black font-medium">{project.total_boxes_settled || 0}</p>
                </div>
                <div className="text-center bg-degen-bg p-2 border border-degen-black">
                    <p className="text-degen-text-muted text-xs uppercase">Vault Balance</p>
                    <p className="text-degen-black font-medium">
                        {balanceLoading
                            ? '...'
                            : `${(vaultBalance / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)} ${project.payment_token_symbol || 'tokens'}`}
                    </p>
                </div>
                <div className="text-center bg-degen-bg p-2 border border-degen-black">
                    <p className="text-degen-text-muted text-xs uppercase">Status</p>
                    <DegenBadge
                        variant={project.closed_at ? 'default' : (project.is_active ? 'success' : 'danger')}
                        size="sm"
                        dot
                    >
                        {project.closed_at ? 'Permanently Closed' : (project.is_active ? 'Active' : 'Paused')}
                    </DegenBadge>
                </div>
            </div>

            {/* Subdomain */}
            <div className="mb-4 p-3 bg-degen-bg border border-degen-black">
                <p className="text-degen-text-muted text-xs uppercase mb-1">Your Subdomain</p>
                <a
                    href={projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-degen-blue hover:underline text-sm break-all font-medium"
                >
                    {project.subdomain}.degenbox.fun
                </a>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-auto">
                <DegenButton
                    onClick={() => window.open(projectUrl, '_blank')}
                    variant="blue"
                    size="sm"
                    className="flex-1"
                >
                    Visit Site
                </DegenButton>
                <DegenButton
                    onClick={() => router.push(`/dashboard/manage/${project.id}`)}
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                >
                    Manage
                </DegenButton>
                <DegenButton
                    onClick={getMyProjectShareHandler(project, projectUrl)}
                    variant="secondary"
                    size="sm"
                    title="Share on X"
                >
                    <XLogo size={14} />
                </DegenButton>
            </div>
        </DegenCard>
    );
}
