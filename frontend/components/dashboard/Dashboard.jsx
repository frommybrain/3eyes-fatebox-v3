// components/dashboard/Dashboard.jsx
'use client';

import { useEffect, useState, useCallback, useTransition, useOptimistic, useMemo, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { Transaction } from '@solana/web3.js';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
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
    DegenDropdown,
    CardDropdown,
    useToast,
    useTransaction,
    InlineTransactionStatus,
    WinModal,
    BadgeModal,
    XLogo,
    MyBoxesTabSkeleton,
    MyProjectsTabSkeleton,
    MyProfileTabSkeleton,
    DashboardSkeleton,
    BoxCardSkeleton,
    DegenTooltip,
} from '@/components/ui';
import { getWinShareHandler, getMyProjectShareHandler } from '@/lib/shareManager';
import TrophyCabinet from '@/components/profile/TrophyCabinet';
import ProfileStats from '@/components/profile/ProfileStats';
import ProfileBadges from '@/components/profile/ProfileBadges';
import DegenAccordion from '@/components/ui/DegenAccordion';
import { useTransitionOverlay, checkTransitionArrival } from '@/components/ui/TransitionOverlay';

// Super admin wallet - only this wallet can access My Projects tab
const SUPER_ADMIN_WALLET = 'Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6';

// ===== TESTING CONFIG =====
// Set to 30 for quick testing, 3600 for production (1 hour)
const REVEAL_WINDOW_SECONDS = 3600;
// Refund grace period - must wait this many seconds after commit before refund is allowed
// This prevents abuse where users could commit, see oracle results, then refund if unfavorable
const REFUND_GRACE_PERIOD_SECONDS = 120; // 2 minutes - matches on-chain default
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
    const openBoxParam = searchParams.get('openBox'); // Box ID to auto-open from purchase flow
    const [activeTab, setActiveTab] = useState(initialTab);

    // Auto-open box state (from post-purchase "Open Now" flow)
    const [autoOpenBoxId, setAutoOpenBoxId] = useState(openBoxParam ? parseInt(openBoxParam) : null);

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

    // Transition overlay for smooth page entrance
    const { revealPage } = useTransitionOverlay();

    // Reveal the transition overlay once config is loaded
    useEffect(() => {
        if (!configLoading && checkTransitionArrival()) {
            // Small delay to ensure content is painted
            const timer = setTimeout(() => {
                revealPage();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [configLoading, revealPage]);

    // Load data when connected
    useEffect(() => {
        // Load user's projects when connected
        if (publicKey && config && connected) {
            loadProjectsByOwner(publicKey.toString());
        }
    }, [publicKey, connected, config, loadProjectsByOwner]);

    // Check for new badges on dashboard load
    // DISABLED: Badge system temporarily disabled
    // useEffect(() => {
    //     async function checkBadges() {
    //         if (!publicKey || !connected) return;

    //         try {
    //             const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
    //             const response = await fetch(`${backendUrl}/api/users/${publicKey.toString()}/badges?check=true`);
    //             const data = await response.json();

    //             if (data.success && data.newBadges && data.newBadges.length > 0) {
    //                 setNewBadges(data.newBadges);
    //                 setCurrentBadgeIndex(0);
    //                 setShowBadgeModal(true);
    //             }
    //         } catch (error) {
    //             console.error('Error checking badges:', error);
    //         }
    //     }

    //     checkBadges();
    // }, [publicKey, connected]);

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
                            Manage your projects, purchased boxes and profile
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

    // Check if current user is the super admin
    const isAdmin = publicKey?.toString() === SUPER_ADMIN_WALLET;

    return (
        <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-2 md:px-4">
            <div className="w-full mx-auto">
                {/* Network Badge */}
                {isDevnet && (
                    <div className="mb-6">
                        <DegenBadge variant="warning" size="lg">
                            DEVNET MODE
                        </DegenBadge>
                    </div>
                )}

                {/* Platform Paused Notice */}
                {config?.paused && (
                    <div className="mb-6 p-4 bg-red-100 border-2 border-red-500 text-center">
                        <h2 className="text-red-700 text-xl font-bold uppercase mb-2">Platform Temporarily Paused</h2>
                        <p className="text-red-600">
                            The platform is currently undergoing maintenance. Box purchases, opening, and settlements are temporarily disabled.
                            Your existing boxes are safe. Please check back soon.
                        </p>
                    </div>
                )}

                {/* Header */}
                <div className="mb-4">
                    <h1 className="text-degen-black text-4xl font-medium uppercase tracking-wider mb-2">Dashboard</h1>
                </div>

                {/* Main Content Grid - 3/4 dashboard, 1/4 leaderboard */}
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Main Dashboard Content - 3/4 */}
                    <div className="w-full lg:w-3/4">
                        {/* Tab Navigation */}
                        <DegenTabs value={activeTab} onValueChange={(value) => {
                            // Prevent non-admins from accessing projects tab
                            if (value === 'projects' && !isAdmin) return;
                            setActiveTab(value);
                        }}>
                            <DegenTabsList className="mb-4">
                                <DegenTabsTrigger value="boxes">
                                    My Boxes
                                </DegenTabsTrigger>
                                <DegenTooltip
                                    content="We are currently working with projects on an as-per basis to onboard them to deploy their own community lootbox. If you are interested in running your own lootbox, please reach out to @3eyes_iii on X.com"
                                    position="bottom"
                                    maxWidth={320}
                                    disabled={isAdmin}
                                >
                                    <DegenTabsTrigger
                                        value="projects"
                                        disabled={!isAdmin}
                                        className={!isAdmin ? 'relative' : ''}
                                        label="My Projects"
                                    >
                                        {!isAdmin && (
                                            <span className="absolute -top-2 -right-3 px-1.5 py-0.5 text-[10px] font-bold uppercase bg-degen-yellow text-degen-black rounded-sm whitespace-nowrap">
                                                Coming Soon
                                            </span>
                                        )}
                                    </DegenTabsTrigger>
                                </DegenTooltip>
                                <DegenTabsTrigger value="profile">
                                    Profile
                                </DegenTabsTrigger>
                            </DegenTabsList>

                            {/* Only render projects tab content for admins */}
                            {isAdmin && (
                                <DegenTabsContent value="projects">
                                    <MyProjectsTab
                                        projects={projects}
                                        projectsLoading={projectsLoading}
                                        projectsError={projectsError}
                                    />
                                </DegenTabsContent>
                            )}

                            <DegenTabsContent value="boxes">
                                <MyBoxesTab
                                    walletAddress={publicKey?.toString()}
                                    autoOpenBoxId={autoOpenBoxId}
                                    onAutoOpenComplete={() => setAutoOpenBoxId(null)}
                                />
                            </DegenTabsContent>

                            <DegenTabsContent value="profile">
                                <MyProfileTab walletAddress={publicKey?.toString()} />
                            </DegenTabsContent>
                        </DegenTabs>
                    </div>

                    {/* Leaderboard Sidebar - 1/4, sticky on desktop */}
                    <div className="w-full lg:w-1/4 lg:self-start lg:sticky lg:top-16">
                        <Leaderboard />
                    </div>
                </div>

                {/* Badge Notification Modal - DISABLED: Badge system temporarily disabled */}
                {/* <BadgeModal
                    isOpen={showBadgeModal}
                    onClose={handleBadgeModalClose}
                    badge={currentBadge}
                /> */}
            </div>
        </div>
    );
}

// Leaderboard component for top projects and top users
function Leaderboard() {
    const [topProjects, setTopProjects] = useState([]);
    const [topUsers, setTopUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                setLoading(true);
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
                const response = await fetch(`${backendUrl}/api/projects/leaderboard?projectLimit=5&userLimit=5&minBoxes=3`);
                const data = await response.json();

                if (data.success) {
                    setTopProjects(data.topProjects || []);
                    setTopUsers(data.topUsers || []);
                } else {
                    setError(data.error);
                }
            } catch (err) {
                console.error('Error fetching leaderboard:', err);
                setError('Failed to load leaderboard');
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, []);

    // Get luck score color based on value
    const getLuckColor = (score) => {
        if (score >= 1.5) return 'text-degen-yellow'; // Very lucky (150%+ return)
        if (score >= 1.0) return 'text-degen-green';  // Lucky (100%+ return)
        if (score >= 0.7) return 'text-degen-blue';   // Average
        return 'text-degen-text-muted';               // Below average
    };

    // Get luck label
    const getLuckLabel = (score) => {
        if (score >= 2.0) return 'On Fire';
        if (score >= 1.5) return 'Hot';
        if (score >= 1.0) return 'Lucky';
        if (score >= 0.7) return 'Warm';
        return 'Cold';
    };

    return (
        <div className="space-y-4">
            {/* Top Projects */}
            <DegenCard variant="default" padding="none">
                <div className="p-3 border-b border-degen-black">
                    <h3 className="text-degen-black text-sm font-medium uppercase tracking-wider">
                        Top Projects
                    </h3>
                </div>
                <div className="p-2">
                    {loading ? (
                        <div className="py-4 text-center text-degen-text-muted text-sm">Loading...</div>
                    ) : error ? (
                        <div className="py-4 text-center text-degen-text-muted text-sm">{error}</div>
                    ) : topProjects.length === 0 ? (
                        <div className="py-4 text-center text-degen-text-muted text-sm">No projects yet</div>
                    ) : (
                        <div className="space-y-1">
                            {topProjects.map((project, index) => (
                                <div
                                    key={project.id}
                                    className="flex items-center gap-3 p-2"
                                >
                                    {/* Rank */}
                                    <div className="w-5 text-center text-white text-[10px] font-medium">
                                        {index + 1}
                                    </div>
                                    {/* Round project icon/logo */}
                                    <div className="w-8 h-8 rounded-full bg-degen-black flex items-center justify-center text-degen-white text-xs font-bold flex-shrink-0 overflow-hidden">
                                        {project.logo_url ? (
                                            <img
                                                src={project.logo_url}
                                                alt={project.project_name}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            project.project_name[0]
                                        )}
                                    </div>
                                    {/* Project info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-degen-black font-medium text-sm truncate">
                                            {project.project_name}
                                        </p>
                                        <p className="text-degen-text-muted text-xs">
                                            {(project.boxes_purchased || 0).toLocaleString()} boxes
                                        </p>
                                    </div>
                                    {/* View link */}
                                    <a
                                        href={`https://${project.subdomain}.degenbox.fun`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-degen-blue text-xs font-medium uppercase tracking-wider hover:underline flex-shrink-0"
                                    >
                                        View
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </DegenCard>

            {/* Top Users - Hottest */}
            <DegenCard variant="default" padding="none">
                <div className="p-3 border-b border-degen-black">
                    <h3 className="text-degen-black text-sm font-medium uppercase tracking-wider">
                        Luckiest Users
                    </h3>
                </div>
                <div className="p-2">
                    {loading ? (
                        <div className="py-4 text-center text-degen-text-muted text-sm">Loading...</div>
                    ) : error ? (
                        <div className="py-4 text-center text-degen-text-muted text-sm">{error}</div>
                    ) : topUsers.length === 0 ? (
                        <div className="py-4 text-center text-degen-text-muted text-sm">No qualifying users yet</div>
                    ) : (
                        <div className="space-y-1">
                            {topUsers.map((user, index) => {
                                const shortWallet = `${user.wallet_address.slice(0, 4)}...${user.wallet_address.slice(-4)}`;
                                const displayName = user.username || shortWallet;
                                return (
                                    <div
                                        key={user.wallet_address}
                                        className="flex items-center gap-3 p-2"
                                    >
                                        {/* Rank */}
                                        <div className="w-6 text-center text-degen-text-muted text-xs font-bold">
                                            #{index + 1}
                                        </div>
                                        {/* User avatar */}
                                        <div className="w-8 h-8 rounded-full bg-degen-container border border-degen-black flex items-center justify-center text-degen-black text-xs font-bold flex-shrink-0 overflow-hidden">
                                            {user.avatar_url ? (
                                                <img
                                                    src={user.avatar_url}
                                                    alt={displayName}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                user.wallet_address.slice(0, 2)
                                            )}
                                        </div>
                                        {/* User info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-degen-black font-medium text-sm truncate">
                                                {displayName}
                                            </p>
                                            <div className="flex items-center gap-1">
                                                <span className={`text-xs font-bold ${getLuckColor(user.luck_score)}`}>
                                                    {user.luck_score.toFixed(2)}x
                                                </span>
                                                {user.luck_score >= 1.0 && (
                                                    <FlameIcon className="w-3 h-3 text-orange-500" />
                                                )}
                                            </div>
                                        </div>
                                        {/* Stats */}
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-degen-text-muted text-xs">
                                                {user.boxes_opened} boxes
                                            </p>
                                            {user.jackpots > 0 && (
                                                <p className="text-degen-yellow text-xs font-bold">
                                                    {user.jackpots} jackpot{user.jackpots > 1 ? 's' : ''}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DegenCard>
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
                    description="Create your first DegenBox project"
                    action="Create Your First Project"
                    actionHref="/dashboard/create"
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {projects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))}
                </div>
            )}
        </>
    );
}

/**
 * AvatarUploadSection - Allows users to upload a custom avatar or choose from defaults
 */
function AvatarUploadSection({ walletAddress, currentAvatar, onAvatarChange }) {
    const { toast } = useToast();
    const [uploading, setUploading] = useState(false);

    // Handle file upload
    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            toast.error('Please upload a JPEG, PNG, GIF, or WebP image');
            return;
        }

        // Validate file size (2MB max)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be less than 2MB');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
            const response = await fetch(`${backendUrl}/api/users/${walletAddress}/avatar`, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (data.success) {
                onAvatarChange(data.avatarUrl);
                toast.success('Avatar updated!');
            } else {
                toast.error(data.error || 'Failed to upload avatar');
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            toast.error('Failed to upload avatar');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="mb-6">
            <label className="block text-degen-black font-medium text-sm uppercase tracking-wider mb-2">
                Profile Picture
            </label>
            <div className="flex items-start gap-4">
                {/* Current avatar */}
                <div className="w-20 h-20 bg-degen-container border border-degen-black flex items-center justify-center overflow-hidden flex-shrink-0">
                    {currentAvatar ? (
                        <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-2xl text-degen-text-muted">?</span>
                    )}
                </div>

                {/* Upload options */}
                <div className="flex-1 space-y-2">
                    {/* Upload button */}
                    <label className={`
                        inline-flex items-center gap-2 px-4 py-2 text-sm font-medium uppercase tracking-wider
                        cursor-pointer transition-colors
                        ${uploading ? 'bg-degen-container text-degen-text-muted' : 'bg-degen-green text-black hover:opacity-80'}
                    `}>
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                        {uploading ? 'Uploading...' : 'Upload Image'}
                    </label>

                    <p className="text-degen-text-muted text-xs">
                        Max 2MB. JPEG, PNG, GIF, or WebP.
                    </p>
                </div>
            </div>
        </div>
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
    const [avatarUrl, setAvatarUrl] = useState(null);
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
                        setAvatarUrl(data.profile.avatar_url || null);
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
            <div className="w-full lg:w-1/3 space-y-3">
                {/* Profile Info Card */}
                <DegenCard variant="white" padding="sm">
                    {/* Avatar/Icon */}
                    <div className="w-20 h-20 mx-auto mb-3 bg-degen-black flex items-center justify-center text-degen-white text-3xl font-bold border border-degen-black overflow-hidden">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : profile?.username ? (
                            profile.username[0].toUpperCase()
                        ) : (
                            '?'
                        )}
                    </div>

                    {/* Username */}
                    <h2 className="text-degen-black text-xl font-medium text-center uppercase tracking-wider mb-1">
                        {profile?.username || 'Anonymous'}
                    </h2>

                    {/* X Handle */}
                    {profile?.xHandle && (
                        <a
                            href={`https://x.com/${profile.xHandle}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-degen-blue text-sm text-center block mb-1 hover:underline"
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
                                <p className="text-degen-black text-lg font-medium">{stats.totalBoxes || 0}</p>
                                <p className="text-degen-text-muted text-[10px] uppercase">Boxes</p>
                            </div>
                            <div className="text-center p-2 bg-degen-white border border-degen-black">
                                <p className="text-degen-black text-lg font-medium">{stats.winsCount || 0}</p>
                                <p className="text-degen-text-muted text-[10px] uppercase">Wins</p>
                            </div>
                            <div className={`text-center p-2 border border-degen-black ${stats.jackpotCount > 0 ? 'bg-degen-yellow' : 'bg-degen-white'}`}>
                                <p className="text-degen-black text-lg font-medium">{stats.jackpotCount || 0}</p>
                                <p className="text-degen-text-muted text-[10px] uppercase">Jackpots</p>
                            </div>
                            <div className="text-center p-2 bg-degen-white border border-degen-black">
                                <p className="text-degen-black text-lg font-medium">{stats.projectsCreated || 0}</p>
                                <p className="text-degen-text-muted text-[10px] uppercase">Projects</p>
                            </div>
                        </div>
                    </DegenCard>
                )}

                {/* Badges Preview - DISABLED: Badge system temporarily disabled */}
                {/* {badges && badges.length > 0 && (
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
                )} */}
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
                        {/*<DegenTabsTrigger value="support">
                            Support
                        </DegenTabsTrigger>*/}
                    </DegenTabsList>

                    {/* Trophies Tab */}
                    <DegenTabsContent value="trophies">
                        <TrophyCabinet walletAddress={walletAddress} username={profile?.username} />
                    </DegenTabsContent>

                    {/* Stats Tab */}
                    <DegenTabsContent value="stats">
                        <ProfileStats stats={stats} />
                        {/* DISABLED: Badge system temporarily disabled */}
                        {/* <ProfileBadges badges={badges} username={profile?.username} className="mt-4" /> */}
                    </DegenTabsContent>

                    {/* Settings Tab */}
                    <DegenTabsContent value="settings">
                        <DegenCard variant="white" padding="lg">
                            <h2 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-6">
                                Profile Settings
                            </h2>

                            {/* Avatar Upload */}
                            <AvatarUploadSection
                                walletAddress={walletAddress}
                                currentAvatar={avatarUrl}
                                onAvatarChange={setAvatarUrl}
                            />

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
                    {/*<DegenTabsContent value="support">
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
                    </DegenTabsContent>*/}
                </DegenTabs>
            </div>
        </div>
    );
}

function MyBoxesTab({ walletAddress, autoOpenBoxId = null, onAutoOpenComplete = null }) {
    const router = useRouter();
    const [boxesData, setBoxesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isPending, startTransition] = useTransition();

    // Check if we're entering from a page transition (e.g., from "Hold & Grow Luck")
    const shouldAnimateEntrance = useRef(false);
    useEffect(() => {
        // Check once on mount if we came from a transition
        if (typeof window !== 'undefined') {
            const marker = sessionStorage.getItem('dashboard-entrance');
            if (marker) {
                sessionStorage.removeItem('dashboard-entrance');
                shouldAnimateEntrance.current = true;
            }
        }
    }, []);

    // Clear the URL parameter when we have an autoOpenBoxId so refresh doesn't re-trigger
    useEffect(() => {
        if (autoOpenBoxId) {
            // Remove the openBox param from URL without triggering navigation
            const url = new URL(window.location.href);
            url.searchParams.delete('openBox');
            window.history.replaceState({}, '', url.toString());
        }
    }, [autoOpenBoxId]);

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

    // Show toast when coming from "Open Now" flow
    const { toast } = useToast();
    useEffect(() => {
        if (autoOpenBoxId && boxesData && !loading) {
            toast.info(`Box #${autoOpenBoxId} is ready! Click "Open Box" to start.`, {
                title: 'Ready to Open',
                duration: 8000,
            });
            // Clear the auto-open state
            if (onAutoOpenComplete) onAutoOpenComplete();
        }
    }, [autoOpenBoxId, boxesData, loading, onAutoOpenComplete, toast]);

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
                description="You haven't purchased any boxes yet"
            />
        );
    }

    return (
        <div className={`space-y-3 transition-opacity duration-150 ${isPending ? 'opacity-70' : 'opacity-100'}`}>
            {/* Summary */}
            <DegenCard variant="default" padding="sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        {/* Boxes stat */}
                        <div className="flex flex-col items-center">
                            <PaddedNumber value={boxesData.totalBoxes} />
                            <span className="text-degen-text-muted text-[10px] uppercase tracking-wider mt-1">boxes</span>
                        </div>
                        {/* Projects stat */}
                        <div className="flex flex-col items-center">
                            <PaddedNumber value={boxesData.projectCount} />
                            <span className="text-degen-text-muted text-[10px] uppercase tracking-wider mt-1">projects</span>
                        </div>
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

            {/* Inline transaction status (degen mode) */}
            <InlineTransactionStatus />

            {/* Projects with Boxes */}
            {boxesData.projectsWithBoxes.map((projectGroup, index) => (
                <ProjectBoxesGroup
                    key={projectGroup.project.id}
                    projectGroup={projectGroup}
                    onRefresh={refreshBoxes}
                    animateEntrance={shouldAnimateEntrance.current}
                    entranceDelay={index * 0.1}
                />
            ))}
        </div>
    );
}

// Filter definitions for box states
const BOX_FILTERS = {
    all: { label: 'All', filter: () => true },
    unopened: {
        label: 'Unopened',
        filter: (b) => b.box_result === 0 && !b.randomness_committed,
    },
    wins: {
        label: 'Wins',
        filter: (b) => b.box_result >= 2 && b.box_result <= 5,
    },
    lost: {
        label: 'Lost',
        filter: (b) => b.box_result === 1,
    },
    unclaimed: {
        label: 'Unclaimed',
        // Unclaimed wins (has payout but not settled) or unclaimed refunds (refund eligible but not yet refunded)
        filter: (b) => (b.box_result >= 2 && b.box_result <= 5 && !b.settled_at) || (b.refund_eligible && b.box_result !== 6),
    },
    refund: {
        label: 'Refund',
        // All refund-related boxes: eligible for refund OR already refunded
        filter: (b) => b.refund_eligible || b.box_result === 6,
    },
    expired: {
        label: 'Expired',
        // Committed but not revealed (stuck in opening state)
        filter: (b) => b.randomness_committed && b.box_result === 0,
    },
};

function ProjectBoxesGroup({ projectGroup, onRefresh, animateEntrance = false, entranceDelay = 0 }) {
    const { project, boxes } = projectGroup;
    const projectUrl = getProjectUrl(project.subdomain);
    const [activeFilter, setActiveFilter] = useState('all');
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Count boxes for each filter category
    const filterCounts = useMemo(() => {
        const counts = {};
        Object.keys(BOX_FILTERS).forEach(key => {
            counts[key] = boxes.filter(BOX_FILTERS[key].filter).length;
        });
        return counts;
    }, [boxes]);

    // Filter and sort boxes
    const filteredAndSortedBoxes = useMemo(() => {
        const filtered = boxes.filter(BOX_FILTERS[activeFilter].filter);
        return [...filtered].sort((a, b) => b.box_number - a.box_number);
    }, [boxes, activeFilter]);

    // Count box states for header display
    const pendingBoxes = filterCounts.unopened + filterCounts.expired;
    const revealedBoxes = filterCounts.wins + filterCounts.lost + filterCounts.refund;

    return (
        <DegenCard
            variant="default"
            padding="none"
            className={animateEntrance ? 'animate-entrance' : ''}
            style={animateEntrance ? { animationDelay: `${entranceDelay}s` } : undefined}
        >
            {/* Project Header */}
            <div className="p-3 border-b border-degen-black flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Project image */}
                    <div className="w-12 h-12 bg-degen-black flex items-center justify-center text-xl text-degen-white flex-shrink-0 overflow-hidden rounded-lg">
                        {(project.logo_url || project.image_url || project.project_logo || project.projectLogo) ? (
                            <img
                                src={project.logo_url || project.image_url || project.project_logo || project.projectLogo}
                                alt={project.project_name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            project.project_name?.[0] || '?'
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-degen-black text-lg font-extrabold uppercase tracking-wider">{project.project_name}</h3>
                            <span className="text-degen-green text-xs font-medium">${project.payment_token_symbol || 'SOL'}</span>
                        </div>
                        <a
                            href={projectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-degen-blue hover:underline text-sm hidden md:block"
                        >
                            {project.subdomain}.degenbox.fun
                        </a>

                        <a
                            href={projectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-degen-blue hover:underline text-sm block md:hidden"
                        >
                            Go to project
                        </a>
                    </div>
                </div>
                {/* Stats and collapse on right */}
                <div className="flex items-center gap-4">
                    {/* Stats - boxes and revealed */}
                    <div className="hidden md:flex items-center gap-4">
                        <div className="flex flex-col items-center">
                            <PaddedNumber value={boxes.length} />
                            <span className="text-degen-text-muted text-[10px] uppercase tracking-wider mt-1">boxes</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <PaddedNumber value={revealedBoxes} />
                            <span className="text-degen-text-muted text-[10px] uppercase tracking-wider mt-1">revealed</span>
                        </div>
                    </div>
                    {/* Collapse toggle */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="p-1 hover:bg-degen-container rounded transition-colors cursor-pointer group"
                    >
                        <ChevronDownIcon className={`w-5 h-5 text-degen-text-muted group-hover:text-black transition-all duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Collapsible content */}
            {!isCollapsed && (
                <>
                    {/* Filter - Dropdown on mobile, Tabs on desktop */}
                    <div className="px-3 pt-3 pb-2 border-b border-degen-border">
                        <div className="flex items-center gap-3">
                            {/* Filter Icon - Triangle of dots */}
                            <FilterIcon className="w-4 h-4 text-degen-text-muted flex-shrink-0" />

                            {/* Mobile Dropdown */}
                            <div className="sm:hidden flex-1">
                                <DegenDropdown
                                    options={Object.entries(BOX_FILTERS).map(([key, { label }]) => ({
                                        value: key,
                                        label,
                                        count: filterCounts[key],
                                    }))}
                                    value={activeFilter}
                                    onChange={setActiveFilter}
                                    showCounts={true}
                                />
                            </div>

                            {/* Desktop Tabs */}
                            <div className="hidden sm:flex gap-1 overflow-x-auto flex-1">
                                {Object.entries(BOX_FILTERS).map(([key, { label }]) => {
                                    const count = filterCounts[key];
                                    const isActive = activeFilter === key;
                                    // Hide filters with 0 count (except 'all')
                                    if (count === 0 && key !== 'all') return null;

                                    return (
                                        <button
                                            key={key}
                                            onClick={() => setActiveFilter(key)}
                                            className={`
                                                px-3 py-1.5 text-xs font-medium uppercase tracking-wider
                                                border transition-colors duration-100 cursor-pointer
                                                flex items-center gap-1.5
                                                ${isActive
                                                    ? 'bg-degen-black text-white border-degen-black'
                                                    : 'bg-white text-degen-black border-degen-black hover:bg-degen-black hover:text-white'
                                                }
                                            `}
                                        >
                                            {label}
                                            <span className={`
                                                text-[10px] px-1.5 py-0.5 rounded-sm
                                                ${isActive
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-degen-container text-degen-text-muted'
                                                }
                                            `}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Boxes Grid/List */}
                    <BoxList boxes={filteredAndSortedBoxes} project={project} onRefresh={onRefresh} animateEntrance={animateEntrance} />
                </>
            )}
        </DegenCard>
    );
}

// Box list component - always uses row layout
function BoxList({ boxes, project, onRefresh, animateEntrance = false }) {
    if (boxes.length === 0) {
        return (
            <div className="p-3">
                <div className="text-center py-8 text-degen-text-muted">
                    No boxes match this filter
                </div>
            </div>
        );
    }

    return (
        <div className="p-3">
            <div className="space-y-2">
                {boxes.map((box, index) => (
                    <div
                        key={box.id}
                        className={animateEntrance ? 'animate-entrance' : ''}
                        style={animateEntrance ? { animationDelay: `${0.15 + index * 0.05}s` } : undefined}
                    >
                        <BoxCardRow
                            box={box}
                            project={project}
                            onRefresh={onRefresh}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

// Luck icon component
function LuckIcon({ className = '' }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" stroke="none" className={className}>
            <path d="M17.28 9.05a5.5 5.5 0 1 0-10.56 0A5.5 5.5 0 1 0 12 17.66a5.5 5.5 0 1 0 5.28-8.6Z"/>
            <path d="M11 17.66h2v5h-2z"/>
        </svg>
    );
}

// Flame icon component for "hot" display
function FlameIcon({ className = '' }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>
        </svg>
    );
}

// Chevron down icon for collapsible sections
function ChevronDownIcon({ className = '' }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="m6 9 6 6 6-6"/>
        </svg>
    );
}

// Display number in large font
function PaddedNumber({ value }) {
    return (
        <span className="text-lg font-mono font-medium">
            {value}
        </span>
    );
}

// State indicator colors for row layout
function getStateColor(box, isExpired, isRefundEligible) {
    const isRevealed = box.box_result > 0;
    const isCommitted = box.randomness_committed && !isRevealed;
    const isPending = box.box_result === 0 && !box.randomness_committed;
    const hasReward = box.payout_amount > 0;
    const isJackpot = box.box_result === 5;
    const isRefunded = box.box_result === 6;

    if (isPending) return 'bg-degen-yellow';
    if (isCommitted && !isExpired && !isRefundEligible) return 'bg-degen-yellow';
    if (isRefundEligible) return 'bg-degen-text-muted';
    if (isRefunded) return 'bg-degen-text-muted';
    if (isExpired && !isRefundEligible) return 'bg-degen-error';
    if (isJackpot) return 'bg-degen-yellow';
    if (hasReward && !isJackpot && !isRefunded) return 'bg-degen-green';
    if (isRevealed && !hasReward && !isRefunded && !isRefundEligible) return 'bg-degen-text-muted';
    return 'bg-degen-container';
}

// Custom filter icon - triangle of dots pointing down
function FilterIcon({ className = '' }) {
    return (
        <svg
            viewBox="0 0 16 14"
            fill="currentColor"
            className={className}
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Top row - 3 dots */}
            <circle cx="2" cy="2" r="2" />
            <circle cx="8" cy="2" r="2" />
            <circle cx="14" cy="2" r="2" />
            {/* Middle row - 2 dots */}
            <circle cx="5" cy="7" r="2" />
            <circle cx="11" cy="7" r="2" />
            {/* Bottom row - 1 dot */}
            <circle cx="8" cy="12" r="2" />
        </svg>
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
                    {/* Background circle - transparent (elapsed/empty time) */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        className="stroke-current opacity-30"
                        strokeWidth="1"
                    />
                    {/* Remaining time pie slice - uses currentColor, shrinks clockwise as time passes */}
                    <path
                        d={getRemainingArcPath()}
                        fill="currentColor"
                        className="opacity-60"
                    />
                    {/* Border circle */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        className="opacity-60"
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

// Row-based BoxCard for degen mode
function BoxCardRow({ box, project, onRefresh }) {
    const { publicKey, signTransaction, sendTransaction } = useWallet();
    const { connection } = useConnection();
    const { config } = useNetworkStore();
    const { toast } = useToast();
    const { startTransaction, addLog, endTransaction, startCountdown } = useTransaction();

    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState(null);
    const [showWinModal, setShowWinModal] = useState(false);
    const [winData, setWinData] = useState(null);
    const [currentLuck, setCurrentLuck] = useState(null); // null = loading
    const [commitCooldown, setCommitCooldown] = useState(null);
    const [revealCountdown, setRevealCountdown] = useState(null);
    const [expiryCountdown, setExpiryCountdown] = useState(null);
    const [refundCooldown, setRefundCooldown] = useState(null);
    const [, startBoxTransition] = useTransition();
    const [optimisticBox, setOptimisticBox] = useOptimistic(box, (currentBox, update) => ({ ...currentBox, ...update }));

    // Unified open flow state (commit → wait → reveal → settle in one go)
    const [unifiedFlowActive, setUnifiedFlowActive] = useState(false);
    const [unifiedFlowStep, setUnifiedFlowStep] = useState(null); // 'committing' | 'waiting' | 'revealing' | 'complete'
    const [unifiedFlowCountdown, setUnifiedFlowCountdown] = useState(0);
    const [unifiedFlowLog, setUnifiedFlowLog] = useState('');
    const [unifiedFlowError, setUnifiedFlowError] = useState(null);

    const displayBox = optimisticBox;
    const network = config?.network || 'devnet';
    const walletAddress = publicKey?.toString();

    // Initialize nowMs with useState to avoid Date.now() during render
    const [nowMs] = useState(() => Date.now());

    // Parse timestamps as UTC
    const purchasedAtUTC = parseAsUTC(displayBox.purchased_at);
    const committedAtUTC = parseAsUTC(displayBox.committed_at);

    // Derived states
    const isRevealed = displayBox.box_result > 0;
    const isCommitted = displayBox.randomness_committed && !isRevealed;
    const isPending = displayBox.box_result === 0 && !displayBox.randomness_committed;
    const hasReward = displayBox.payout_amount > 0;
    const isJackpot = displayBox.box_result === 5;
    const isSettled = !!displayBox.settled_at;
    const isRefunded = displayBox.box_result === 6;
    const isRefundEligible = displayBox.refund_eligible && !isRefunded;
    const isExpired = isCommitted && committedAtUTC && (nowMs - committedAtUTC > REVEAL_WINDOW_SECONDS * 1000);

    // Format payout
    const payoutFormatted = hasReward
        ? (displayBox.payout_amount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)
        : '0';

    // Get state color for the indicator
    const stateColor = getStateColor(displayBox, isExpired, isRefundEligible);

    // Status text
    const getStatusText = () => {
        // Show unified flow step if active
        if (unifiedFlowActive) {
            if (unifiedFlowStep === 'committing') return 'Opening...';
            if (unifiedFlowStep === 'waiting') return unifiedFlowCountdown > 0 ? `Waiting ${unifiedFlowCountdown}s` : 'Ready!';
            if (unifiedFlowStep === 'revealing') return 'Revealing & Claiming...';
            return 'Processing...';
        }
        if (isRefunded) return 'Refunded';
        if (isRefundEligible) return 'Refund Available';
        if (isExpired) return 'Expired';
        if (isJackpot) return 'JACKPOT!';
        if (hasReward && isSettled) return 'Won';
        if (hasReward && !isSettled) return 'Unclaimed Win';
        if (isRevealed && !hasReward) return 'No Win';
        if (isCommitted) return 'Opening...';
        return 'Unopened';
    };

    // Get tier name from result
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
        const folder = tierFolders[tier];
        if (!folder) return null;
        return `https://degenbox.fra1.cdn.digitaloceanspaces.com/badges/${folder}/${badgeImageId}.png`;
    };

    // Helper: Get payout multiplier string from reward amount and box price
    const getPayoutMultiplier = (payoutAmount, boxPrice) => {
        if (!boxPrice || boxPrice === 0) return '0x';
        const multiplier = payoutAmount / boxPrice;
        if (multiplier === 0) return '0x';
        if (Number.isInteger(multiplier)) return `${multiplier}x`;
        return `${multiplier.toFixed(1)}x`;
    };

    // Get project URL
    const getProjectUrl = (subdomain) => {
        if (typeof window === 'undefined') return '/';
        const hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return `http://localhost:3000/p/${subdomain}`;
        }
        return `https://${subdomain}.degenbox.fun`;
    };

    // Calculate current luck
    const calculateCurrentLuck = useCallback(() => {
        // Try purchased_at first, then created_at as fallback
        const createdTime = purchasedAtUTC || parseAsUTC(displayBox.created_at);
        if (!createdTime || !config) return config?.baseLuck || 5;

        const holdTimeSeconds = Math.floor((Date.now() - createdTime) / 1000);
        const luckInterval = project?.luck_interval_seconds || config?.luckIntervalSeconds || 3600;
        const baseLuck = config?.baseLuck || 5;
        const maxLuck = config?.maxLuck || 60;

        const bonusLuck = Math.floor(holdTimeSeconds / luckInterval);
        return Math.min(baseLuck + bonusLuck, maxLuck);
    }, [purchasedAtUTC, displayBox.created_at, config, project?.luck_interval_seconds]);

    // Update luck display every second for real-time counting
    // Stop counting when box is being processed (opened)
    useEffect(() => {
        if (!isPending || isProcessing) return;
        // Update every second for real-time display (first tick happens immediately)
        const interval = setInterval(() => {
            setCurrentLuck(calculateCurrentLuck());
        }, 1000);
        return () => clearInterval(interval);
    }, [isPending, isProcessing, calculateCurrentLuck]);

    // Cooldown timer for pending boxes (must wait 30s after purchase before opening)
    useEffect(() => {
        if (!isPending || !box.created_at) return;

        const createdTime = parseAsUTC(box.created_at);
        if (!createdTime) return;

        // Use openBoxCooldown from config (default 30 seconds)
        const openBoxCooldownMs = (config?.openBoxCooldown || 30) * 1000;

        const updateCooldown = () => {
            const now = Date.now();
            const timeSincePurchase = now - createdTime;

            if (timeSincePurchase < openBoxCooldownMs) {
                setCommitCooldown(Math.ceil((openBoxCooldownMs - timeSincePurchase) / 1000));
            } else {
                setCommitCooldown(0);
            }
        };

        updateCooldown();
        const interval = setInterval(updateCooldown, 1000);
        return () => clearInterval(interval);
    }, [isPending, box.created_at, config?.openBoxCooldown]);

    // Countdown timers for committed boxes (reveal countdown + expiry countdown)
    useEffect(() => {
        if (!isCommitted || !box.committed_at) return;

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

    // Refund grace period countdown - must wait before refund is allowed
    useEffect(() => {
        if (!isRefundEligible || !box.committed_at) {
            setRefundCooldown(null);
            return;
        }

        const committedTime = parseAsUTC(box.committed_at);
        if (!committedTime) {
            setRefundCooldown(null);
            return;
        }

        const GRACE_PERIOD = REFUND_GRACE_PERIOD_SECONDS * 1000;

        const updateRefundCooldown = () => {
            const now = Date.now();
            const timeSinceCommit = now - committedTime;
            const timeUntilRefundAllowed = GRACE_PERIOD - timeSinceCommit;

            if (timeUntilRefundAllowed > 0) {
                setRefundCooldown(Math.ceil(timeUntilRefundAllowed / 1000));
            } else {
                setRefundCooldown(0);
            }
        };

        updateRefundCooldown();
        const interval = setInterval(updateRefundCooldown, 1000);
        return () => clearInterval(interval);
    }, [isRefundEligible, box.committed_at]);

    // Format expiry countdown as MM:SS
    const formatExpiryTime = (seconds) => {
        if (seconds <= 0) return 'Expired';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle commit box (Open Box - step 1)
    const handleCommit = async () => {
        if (!publicKey || !signTransaction) return;

        setIsProcessing(true);
        setProcessingStep('commit');
        startTransaction(`Opening Box #${box.box_number}...`);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            // Optimistic update: immediately show as "committed" state (wrapped in transition)
            startBoxTransition(() => {
                setOptimisticBox({ randomness_committed: true, committed_at: new Date().toISOString() });
            });

            // Step 1: Generate randomness keypair CLIENT-SIDE (prevents Phantom security warning)
            addLog('Generating randomness keypair...');
            const { Keypair } = await import('@solana/web3.js');
            const randomnessKeypair = Keypair.generate();
            const randomnessPublicKey = randomnessKeypair.publicKey.toString();

            // Step 2: Build commit transaction with client-generated public key
            addLog('Building transaction...');
            const buildResponse = await fetch(`${backendUrl}/api/program/build-commit-box-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    ownerWallet: walletAddress,
                    randomnessPublicKey,
                }),
            });

            const buildResult = await buildResponse.json();
            if (!buildResult.success) {
                throw new Error(buildResult.details || buildResult.error);
            }
            addLog('Transaction built');

            // Step 3: Deserialize transaction
            const { Transaction } = await import('@solana/web3.js');
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));

            // Step 4: Sign in the correct order to avoid Phantom's Lighthouse security warnings
            addLog('Requesting wallet signature...');

            // 4a: Phantom wallet signs first
            const walletSignedTx = await signTransaction(transaction);

            // 4b: Additional signers (randomness keypair) sign afterward
            walletSignedTx.partialSign(randomnessKeypair);

            // 4c: Send the fully signed transaction
            const signature = await connection.sendRawTransaction(walletSignedTx.serialize(), {
                skipPreflight: true,
                preflightCommitment: 'confirmed',
            });
            addLog(`TX: ${signature.slice(0, 8)}...`);

            // Step 5: Wait for confirmation
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

            // Clean up error messages for common user-caused errors
            const errorLower = (err.message || '').toLowerCase();
            if (errorLower.includes('user rejected') || errorLower.includes('rejected the request')) {
                errorMessage = 'Transaction cancelled. You can try opening the box again.';
            } else if (errorLower.includes('insufficient')) {
                errorMessage = 'Insufficient SOL for transaction fees. Please add SOL and try again.';
            }

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
            toast.error(`Please wait ${revealCountdown} seconds for oracle...`);
            return;
        }

        setIsProcessing(true);
        setProcessingStep('reveal');
        startTransaction(`Revealing Box #${box.box_number}...`);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

            // Start 16-second countdown - this is the oracle timeout duration
            addLog('Waiting for oracle randomness...');
            startCountdown(16);
            // Use combined endpoint that does reveal + settle in one transaction
            const buildResponse = await fetch(`${backendUrl}/api/program/build-reveal-and-settle-tx`, {
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
                const errorCode = buildResult.errorCode;
                console.log('Reveal failed:', { errorCode, refundEligible: buildResult.refundEligible, error: buildResult.error });

                // If backend marked as refund-eligible, update UI immediately
                if (buildResult.refundEligible === true) {
                    console.log('Box marked as refund-eligible by backend - updating UI immediately');
                    startBoxTransition(() => {
                        setOptimisticBox({
                            refund_eligible: true,
                            randomness_committed: false
                        });
                    });
                    endTransaction(false, 'Refund available');
                    if (onRefresh) onRefresh();
                    return;
                }

                // Check if expired - box becomes a Dud
                if (buildResult.expired || errorCode === 'REVEAL_EXPIRED') {
                    startBoxTransition(() => {
                        setOptimisticBox({
                            box_result: 1,
                            payout_amount: 0,
                            randomness_committed: false,
                        });
                    });
                    endTransaction(false, 'Reveal window expired - box is now a Dud');
                    if (onRefresh) onRefresh();
                    return;
                }

                // Handle oracle unavailability
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
                    toast.error(buildResult.error + timeMsg + retryMsg);
                    endTransaction(false, 'Oracle temporarily unavailable');
                    return;
                }

                // Handle insufficient funds
                if (errorCode === 'INSUFFICIENT_FUNDS') {
                    toast.error(buildResult.error);
                    endTransaction(false, 'Insufficient SOL for fees');
                    return;
                }

                throw new Error(buildResult.details || buildResult.error);
            }

            // Check if result was recovered from on-chain (already revealed)
            if (buildResult.alreadyRevealed && buildResult.reward) {
                addLog('Result recovered from on-chain!');
                startBoxTransition(() => {
                    setOptimisticBox({
                        box_result: buildResult.reward.tier,
                        payout_amount: buildResult.reward.payoutAmount,
                        randomness_committed: false
                    });
                });

                const tierName = getTierName(buildResult.reward.tier);
                const payout = buildResult.reward.payoutAmount
                    ? (buildResult.reward.payoutAmount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)
                    : '0';
                endTransaction(true, `Recovered: ${tierName}! Payout: ${payout} ${project.payment_token_symbol}`);

                // Show win popup for winning results (tier > 1)
                if (buildResult.reward.tier > 1) {
                    setWinData({
                        tier: buildResult.reward.tier,
                        amount: payout,
                        tokenSymbol: project.payment_token_symbol,
                        multiplier: getPayoutMultiplier(buildResult.reward.payoutAmount, project.box_price),
                        projectUrl: getProjectUrl(project.subdomain),
                        badgeUrl: getBadgeUrl(buildResult.reward.tier, buildResult.reward.badgeImageId),
                    });
                    setShowWinModal(true);
                }

                if (onRefresh) onRefresh();
                return;
            }

            addLog('Reveal transaction built');

            // Deserialize transaction
            const { Transaction } = await import('@solana/web3.js');
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;

            // Send transaction using wallet adapter
            addLog('Requesting wallet signature...');
            const signature = await sendTransaction(transaction, connection, {
                skipPreflight: true,
            });
            addLog(`TX: ${signature.slice(0, 8)}...`);

            // Wait for confirmation
            addLog('Waiting for confirmation...');
            await connection.confirmTransaction(signature, 'confirmed');

            // Confirm with backend to read on-chain reward
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
                startBoxTransition(() => {
                    setOptimisticBox({
                        box_result: confirmResult.reward?.tier || 1,
                        payout_amount: confirmResult.reward?.payoutAmount || 0,
                        randomness_committed: false,
                        settled_at: new Date().toISOString(),
                        settle_tx_signature: signature,
                    });
                });

                const tierName = getTierName(confirmResult.reward?.tier);
                const payout = confirmResult.reward?.payoutAmount
                    ? (confirmResult.reward.payoutAmount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)
                    : '0';

                // Settlement already happened in combined transaction - just confirm with backend
                if (confirmResult.reward?.tier > 1 && confirmResult.reward?.payoutAmount > 0) {
                    addLog(`Result: ${tierName}! Claiming ${payout} ${project.payment_token_symbol}...`);

                    // Confirm settle with backend (settlement already done in combined tx)
                    await fetch(`${backendUrl}/api/program/confirm-settle`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            projectId: project.project_numeric_id,
                            boxId: box.box_number,
                            signature,
                        }),
                    });

                    endTransaction(true, `${tierName}! Claimed ${payout} ${project.payment_token_symbol}!`);
                    toast.success(`${tierName}! Claimed ${payout} ${project.payment_token_symbol}!`);

                    // Show win popup for winning results
                    setWinData({
                        tier: confirmResult.reward.tier,
                        amount: payout,
                        tokenSymbol: project.payment_token_symbol,
                        multiplier: getPayoutMultiplier(confirmResult.reward.payoutAmount, project.box_price),
                        projectUrl: getProjectUrl(project.subdomain),
                        badgeUrl: getBadgeUrl(confirmResult.reward.tier, confirmResult.reward.badgeImageId),
                    });
                    setShowWinModal(true);
                } else {
                    // No reward or dud - just end the reveal transaction
                    endTransaction(true, `Result: ${tierName}!`);
                }
            } else {
                endTransaction(true, 'Revealed!');
            }

            // Refresh boxes list
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error('Error revealing box:', err);

            // Check if this is "already processed" error - retry to trigger recovery flow
            if (err.message?.includes('already been processed') || err.message?.includes('AlreadyProcessed')) {
                console.log('Transaction already processed - retrying to trigger recovery flow...');
                addLog('Recovering result...');

                try {
                    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
                    // Use combined endpoint for recovery as well
                    const retryResponse = await fetch(`${backendUrl}/api/program/build-reveal-and-settle-tx`, {
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
                        startBoxTransition(() => {
                            setOptimisticBox({
                                box_result: retryResult.reward.tier,
                                payout_amount: retryResult.reward.payoutAmount,
                                randomness_committed: false
                            });
                        });

                        const tierName = getTierName(retryResult.reward.tier);
                        const payout = retryResult.reward.payoutAmount
                            ? (retryResult.reward.payoutAmount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)
                            : '0';
                        endTransaction(true, `Recovered: ${tierName}! Payout: ${payout} ${project.payment_token_symbol}`);

                        if (retryResult.reward.tier > 1) {
                            setWinData({
                                tier: retryResult.reward.tier,
                                amount: payout,
                                tokenSymbol: project.payment_token_symbol,
                                multiplier: getPayoutMultiplier(retryResult.reward.payoutAmount, project.box_price),
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

            // Detect user-initiated errors
            const errorLower = (err.message || '').toLowerCase();
            const isUserCausedError =
                errorLower.includes('user rejected') ||
                errorLower.includes('rejected the request') ||
                errorLower.includes('user denied') ||
                errorLower.includes('user cancelled') ||
                errorLower.includes('user canceled') ||
                errorLower.includes('transaction was rejected') ||
                errorLower.includes('insufficient funds') ||
                errorLower.includes('insufficient lamports') ||
                errorLower.includes('insufficient sol') ||
                errorLower.includes('not enough sol') ||
                errorLower.includes('expired') ||
                errorLower.includes('wallet disconnected') ||
                errorLower.includes('wallet not connected') ||
                errorLower.includes('no wallet');

            if (isUserCausedError) {
                if (errorLower.includes('user rejected') || errorLower.includes('rejected the request')) {
                    errorMessage = 'Transaction cancelled. You can try revealing again.';
                } else if (errorLower.includes('insufficient')) {
                    errorMessage = 'Insufficient SOL for transaction fees. Please add SOL and try again.';
                } else if (errorLower.includes('expired')) {
                    errorMessage = 'Reveal window expired. Box is now a Dud.';
                }
                console.log('User-caused error during reveal (not marking refund-eligible):', err.message);
            } else {
                errorMessage = 'System error during reveal. Please try again. If the issue persists and time runs out, a refund will be available.';

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
                        startBoxTransition(() => {
                            setOptimisticBox({
                                refund_eligible: true,
                                randomness_committed: false
                            });
                        });
                        errorMessage = null;
                    }
                } catch (markErr) {
                    console.error('Failed to mark box as refund-eligible:', markErr);
                }
            }

            if (errorMessage) {
                toast.error(errorMessage);
            }
            endTransaction(false, errorMessage || 'Reveal failed');
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
        startTransaction(`Claiming reward from Box #${box.box_number}...`);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

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

            const { Transaction } = await import('@solana/web3.js');
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;

            addLog('Requesting wallet signature...');
            const signature = await sendTransaction(transaction, connection, {
                skipPreflight: true,
            });
            addLog(`TX: ${signature.slice(0, 8)}...`);

            addLog('Waiting for confirmation...');
            await connection.confirmTransaction(signature, 'confirmed');

            startBoxTransition(() => {
                setOptimisticBox({
                    settled_at: new Date().toISOString(),
                    settle_tx_signature: signature,
                });
            });

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

            endTransaction(true, `Claimed ${payoutFormatted} ${project.payment_token_symbol}!`);
            toast.success(`Successfully claimed ${payoutFormatted} ${project.payment_token_symbol}!`);
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error('Error claiming reward:', err);
            let errorMessage = err.message;
            const errorLower = (err.message || '').toLowerCase();
            if (errorLower.includes('user rejected') || errorLower.includes('rejected the request')) {
                errorMessage = 'Transaction cancelled. You can try claiming again.';
            } else if (errorLower.includes('insufficient')) {
                errorMessage = 'Insufficient SOL for transaction fees. Please add SOL and try again.';
            }
            toast.error(errorMessage);
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
        startTransaction(`Refunding Box #${box.box_number}...`);

        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

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

            const { Transaction } = await import('@solana/web3.js');
            const transaction = Transaction.from(Buffer.from(buildResult.transaction, 'base64'));
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.lastValidBlockHeight = lastValidBlockHeight;

            addLog('Requesting wallet signature...');
            const signature = await sendTransaction(transaction, connection, {
                skipPreflight: true,
            });
            addLog(`TX: ${signature.slice(0, 8)}...`);

            addLog('Waiting for confirmation...');
            await connection.confirmTransaction(signature, 'confirmed');

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
                throw new Error(confirmResult.error || 'Refund verification failed');
            }

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
            const errorLower = (err.message || '').toLowerCase();
            if (errorLower.includes('user rejected') || errorLower.includes('rejected the request')) {
                errorMessage = 'Transaction cancelled. You can try claiming the refund again.';
            } else if (errorLower.includes('insufficient')) {
                errorMessage = 'Insufficient SOL for transaction fees. Please add SOL and try again.';
            }
            toast.error(errorMessage);
            endTransaction(false, errorMessage);
        } finally {
            setIsProcessing(false);
            setProcessingStep(null);
        }
    };

    // Unified Open Flow - opens box with commit → wait → reveal → settle in one go
    const handleUnifiedOpen = async () => {
        if (!publicKey || !signTransaction || !sendTransaction) {
            toast.error('Wallet not connected properly');
            return;
        }

        setUnifiedFlowActive(true);
        setUnifiedFlowStep('committing');
        setUnifiedFlowLog('');
        setUnifiedFlowError(null);
        setIsProcessing(true);
        setProcessingStep('unified');

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
        // Get reveal cooldown from config (default 10s)
        const revealCooldown = config?.revealBoxCooldown || 10;

        try {
            // ============================================
            // STEP 1: COMMIT (Create VRF request, freeze luck)
            // ============================================
            setUnifiedFlowLog('Generating randomness');

            const { Keypair, Transaction } = await import('@solana/web3.js');
            const randomnessKeypair = Keypair.generate();
            const randomnessPublicKey = randomnessKeypair.publicKey.toString();

            setUnifiedFlowLog('Building transaction');
            const commitBuildResponse = await fetch(`${backendUrl}/api/program/build-commit-box-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    ownerWallet: walletAddress,
                    randomnessPublicKey,
                }),
            });

            const commitBuildResult = await commitBuildResponse.json();
            if (!commitBuildResult.success) {
                throw new Error(commitBuildResult.details || commitBuildResult.error);
            }

            const commitTx = Transaction.from(Buffer.from(commitBuildResult.transaction, 'base64'));

            setUnifiedFlowLog('Waiting for wallet approval');
            const walletSignedTx = await signTransaction(commitTx);
            walletSignedTx.partialSign(randomnessKeypair);

            setUnifiedFlowLog('Sending transaction');
            const commitSignature = await connection.sendRawTransaction(walletSignedTx.serialize(), {
                skipPreflight: true,
                preflightCommitment: 'confirmed',
            });

            setUnifiedFlowLog('Confirming on-chain');
            await connection.confirmTransaction(commitSignature, 'confirmed');

            // Confirm with backend (silent)
            await fetch(`${backendUrl}/api/program/confirm-commit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    signature: commitSignature,
                    randomnessAccount: commitBuildResult.randomnessAccount,
                }),
            });

            // ============================================
            // STEP 2: WAIT FOR ORACLE
            // ============================================
            setUnifiedFlowStep('waiting');

            // Use cooldown from config + 2s buffer
            const waitTime = revealCooldown + 2;
            for (let i = waitTime; i >= 0; i--) {
                setUnifiedFlowCountdown(i);
                setUnifiedFlowLog(i > 0 ? 'Oracle generating randomness' : 'Ready to reveal!');
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // ============================================
            // STEP 3: REVEAL + SETTLE (Combined in one transaction)
            // ============================================
            setUnifiedFlowStep('revealing');
            setUnifiedFlowLog('Building reveal transaction');

            const revealBuildResponse = await fetch(`${backendUrl}/api/program/build-reveal-and-settle-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    ownerWallet: walletAddress,
                }),
            });

            const revealBuildResult = await revealBuildResponse.json();

            if (!revealBuildResult.success) {
                if (revealBuildResult.refundEligible) {
                    // Mark as refund-eligible in UI
                    startBoxTransition(() => {
                        setOptimisticBox({ refund_eligible: true });
                    });
                    setUnifiedFlowError('Oracle unavailable - refund available');
                    if (onRefresh) onRefresh();
                    return;
                }
                throw new Error(revealBuildResult.details || revealBuildResult.error);
            }

            // Check if already revealed (edge case)
            if (revealBuildResult.alreadyRevealed && revealBuildResult.reward) {
                const reward = revealBuildResult.reward;
                const multiplier = getPayoutMultiplier(reward.payoutAmount, project.box_price);
                const payoutFmt = (reward.payoutAmount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2);
                setWinData({ tier: reward.tier, amount: payoutFmt, tokenSymbol: project.payment_token_symbol, multiplier });
                setShowWinModal(true);
                setUnifiedFlowActive(false);
                setUnifiedFlowStep(null);
                if (onRefresh) onRefresh();
                return;
            }

            const revealTx = Transaction.from(Buffer.from(revealBuildResult.transaction, 'base64'));
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
            revealTx.recentBlockhash = blockhash;
            revealTx.lastValidBlockHeight = lastValidBlockHeight;

            setUnifiedFlowLog('Waiting for wallet approval');
            const revealSignature = await sendTransaction(revealTx, connection, { skipPreflight: true });

            setUnifiedFlowLog('Confirming transaction');
            await connection.confirmTransaction(revealSignature, 'confirmed');

            // Get reward result from backend (reveal is done, settle is done)
            const confirmRevealResponse = await fetch(`${backendUrl}/api/program/confirm-reveal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: project.project_numeric_id,
                    boxId: box.box_number,
                    ownerWallet: walletAddress,
                    signature: revealSignature,
                }),
            });

            const confirmRevealResult = await confirmRevealResponse.json();
            if (!confirmRevealResult.success || !confirmRevealResult.reward) {
                throw new Error('Failed to read reveal result');
            }

            const reward = confirmRevealResult.reward;
            const multiplier = getPayoutMultiplier(reward.payoutAmount, project.box_price);
            const payoutFmt = (reward.payoutAmount / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2);

            // Confirm settle with backend (silent) - settlement already happened in combined tx
            if (reward.tier > 1 && reward.payoutAmount > 0) {
                await fetch(`${backendUrl}/api/program/confirm-settle`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        projectId: project.project_numeric_id,
                        boxId: box.box_number,
                        signature: revealSignature,
                    }),
                });
            }

            // Update optimistic state and show win modal
            startBoxTransition(() => {
                setOptimisticBox({
                    box_result: reward.tier,
                    payout_amount: reward.payoutAmount,
                    settled_at: new Date().toISOString(),
                });
            });

            if (reward.tier > 1) {
                setWinData({ tier: reward.tier, amount: payoutFmt, tokenSymbol: project.payment_token_symbol, multiplier, claimed: true });
            } else {
                setWinData({ tier: reward.tier, amount: '0', tokenSymbol: project.payment_token_symbol, multiplier: '0x', claimed: true });
            }
            setShowWinModal(true);

            // Refresh box list
            if (onRefresh) onRefresh();

        } catch (err) {
            console.error('Unified open flow error:', err);

            const errorLower = (err.message || '').toLowerCase();
            let errorMessage = err.message;

            if (errorLower.includes('user rejected') || errorLower.includes('rejected the request')) {
                errorMessage = 'Transaction cancelled';
            } else if (errorLower.includes('insufficient')) {
                errorMessage = 'Insufficient SOL for transaction fees';
            }

            setUnifiedFlowError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsProcessing(false);
            setProcessingStep(null);
            setUnifiedFlowActive(false);
            setUnifiedFlowStep(null);
            setUnifiedFlowLog('');
        }
    };

    // Solscan URL helpers
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

    // Build menu items for on-chain proof (transaction links, not actions)
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

    const menuItems = getMenuItems();

    // Calculate progress for loading bars (0-100)
    const openBoxCooldown = config?.openBoxCooldown || 30;
    const commitProgress = commitCooldown !== null && commitCooldown > 0
        ? ((openBoxCooldown - commitCooldown) / openBoxCooldown) * 100
        : 100;
    const revealProgress = revealCountdown !== null && revealCountdown > 0
        ? ((10 - revealCountdown) / 10) * 100
        : 100;

    // Simplified action button - use min-width to prevent layout shifts
    const getActionButton = () => {
        // Show detailed progress during unified open flow
        if (unifiedFlowActive) {
            let buttonText = 'Opening...';
            if (unifiedFlowStep === 'committing') buttonText = 'Opening...';
            else if (unifiedFlowStep === 'waiting') buttonText = unifiedFlowCountdown > 0 ? `Wait ${unifiedFlowCountdown}s` : 'Ready!';
            else if (unifiedFlowStep === 'revealing') buttonText = 'Revealing...';

            return (
                <span className="min-w-[100px] text-center px-6 py-1.5 text-xs font-medium uppercase tracking-wider bg-degen-black text-degen-white border border-degen-black animate-pulse">
                    {buttonText}
                </span>
            );
        }

        if (isProcessing) {
            return (
                <span className="min-w-[100px] text-center px-6 py-1.5 text-xs font-medium uppercase tracking-wider bg-degen-container text-degen-text-muted border border-degen-black">
                    Processing...
                </span>
            );
        }

        if (isPending) {
            const disabled = commitCooldown !== null && commitCooldown > 0;
            return (
                <button
                    onClick={handleUnifiedOpen}
                    disabled={disabled || unifiedFlowActive}
                    className={`min-w-[100px] text-center px-6 py-1.5 text-xs font-medium uppercase tracking-wider border border-degen-black transition-colors ${disabled || unifiedFlowActive ? 'bg-degen-container text-degen-text-muted cursor-not-allowed' : 'bg-degen-green text-black hover:opacity-80 cursor-pointer'}`}
                >
                    {disabled ? `Open in ${commitCooldown}s` : 'Open'}
                </button>
            );
        }

        if (isCommitted && !isExpired && !isRefundEligible) {
            const disabled = revealCountdown !== null && revealCountdown > 0;
            return (
                <button
                    onClick={handleReveal}
                    disabled={disabled}
                    className={`min-w-[100px] text-center px-6 py-1.5 text-xs font-medium uppercase tracking-wider border border-degen-black transition-colors ${disabled ? 'bg-degen-container text-degen-text-muted cursor-not-allowed' : 'bg-degen-green text-black hover:opacity-80 cursor-pointer'}`}
                >
                    {disabled ? `Reveal in ${revealCountdown}s` : 'Reveal'}
                </button>
            );
        }

        if (hasReward && !isSettled && !isRefunded) {
            return (
                <button
                    onClick={handleClaim}
                    className="min-w-[100px] text-center px-6 py-1.5 text-xs font-medium uppercase tracking-wider bg-degen-green text-black border border-degen-black hover:opacity-80 cursor-pointer transition-colors"
                >
                    Claim
                </button>
            );
        }

        if (isRefundEligible) {
            const disabled = refundCooldown !== null && refundCooldown > 0;
            return (
                <button
                    onClick={handleRefund}
                    disabled={disabled}
                    className={`min-w-[100px] text-center px-6 py-1.5 text-xs font-medium uppercase tracking-wider border border-degen-black transition-colors ${disabled ? 'bg-degen-container text-degen-text-muted cursor-not-allowed' : 'bg-degen-green text-black hover:opacity-80 cursor-pointer'}`}
                >
                    {disabled ? `Refund in ${refundCooldown}s` : 'Claim Refund'}
                </button>
            );
        }

        if (isExpired) {
            return <span className="text-degen-text-muted text-xs">Expired</span>;
        }

        return <span className="text-degen-text-muted text-xs">-</span>;
    };

    // Determine if we should show a loading bar
    const showCommitLoadingBar = isPending && commitCooldown !== null && commitCooldown > 0;
    const showRevealLoadingBar = isCommitted && !isExpired && !isRefundEligible && revealCountdown !== null && revealCountdown > 0;
    const showRefundLoadingBar = isRefundEligible && refundCooldown !== null && refundCooldown > 0;

    // Calculate refund progress (0-100)
    const refundProgress = refundCooldown !== null && refundCooldown > 0
        ? ((REFUND_GRACE_PERIOD_SECONDS - refundCooldown) / REFUND_GRACE_PERIOD_SECONDS) * 100
        : 100;

    return (
        <div className="relative bg-degen-container border border-degen-black/20 degen-row-hover transition-colors duration-150">
            {/* Main row content */}
            <div className="flex items-center gap-3 p-3">
                {/* State indicator square */}
                <div className={`w-8 h-8 flex-shrink-0 ${stateColor}`} />

                {/* Box info */}
                <div className="flex-1 min-w-0">
                    <p className="text-degen-black font-medium text-sm">
                        Box #{box.box_number}
                    </p>
                    <p className="text-degen-text-muted text-xs">
                        {getStatusText()}
                        {hasReward && !isRefunded && ` • ${payoutFormatted} ${project.payment_token_symbol}`}
                    </p>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Pie clock for committed boxes (expiry timer) - hide if refund-eligible */}
                {isCommitted && !isExpired && !isRefundEligible && expiryCountdown !== null && expiryCountdown > 0 && (
                    <div className="flex-shrink-0 text-degen-text-muted">
                        <ExpiryPieClock expiryCountdown={expiryCountdown} formatExpiryTime={formatExpiryTime} />
                    </div>
                )}

                {/* Action button */}
                <div className="flex-shrink-0">
                    {getActionButton()}
                </div>

                {/* Luck score (for pending and committed boxes) - hide if refund-eligible */}
                {(isPending || isCommitted) && !isRefundEligible && (
                    <DegenTooltip content={`${currentLuck !== null ? currentLuck : '-'}/${config?.maxLuck || 60}`} position="top">
                        <div className="flex items-center gap-1 text-degen-text-muted flex-shrink-0 cursor-help">
                            <LuckIcon className="w-3 h-3" />
                            <span className="text-xs font-medium w-5 text-center">{currentLuck !== null ? currentLuck : '-'}</span>
                        </div>
                    </DegenTooltip>
                )}

                {/* Menu dropdown - show whenever there are menu items */}
                {menuItems.length > 0 && (
                    <div className="flex-shrink-0">
                        <CardDropdown items={menuItems} />
                    </div>
                )}
            </div>

            {/* Bottom loading bar for cooldowns */}
            {(showCommitLoadingBar || showRevealLoadingBar || showRefundLoadingBar) && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-degen-black/10">
                    <div
                        className="h-full bg-degen-green transition-all duration-1000 ease-linear"
                        style={{ width: `${showCommitLoadingBar ? commitProgress : showRevealLoadingBar ? revealProgress : refundProgress}%` }}
                    />
                </div>
            )}

            {/* Win Modal */}
            <WinModal
                isOpen={showWinModal}
                onClose={() => setShowWinModal(false)}
                tier={winData?.tier}
                amount={winData?.amount}
                tokenSymbol={winData?.tokenSymbol}
                multiplier={winData?.multiplier}
                badgeUrl={winData?.badgeUrl}
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
            {/* Header: Logo + Title + Badges */}
            <div className="flex items-center gap-3 mb-4">
                {/* Project Logo */}
                {project.logo_url ? (
                    <div className="w-12 h-12 rounded-full border border-degen-black flex-shrink-0 overflow-hidden">
                        <Image
                            src={project.logo_url}
                            alt={project.project_name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-12 h-12 rounded-full bg-degen-black flex items-center justify-center flex-shrink-0">
                        <span className="text-degen-white text-lg font-bold">
                            {project.project_name?.charAt(0) || '?'}
                        </span>
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="text-degen-black text-lg font-medium uppercase tracking-wider truncate">{project.project_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        {isDevnet && (
                            <DegenBadge variant="warning" size="sm">
                                DEVNET
                            </DegenBadge>
                        )}
                        {project.closed_at ? (
                            <DegenBadge variant="default" size="sm" dot>
                                Closed
                            </DegenBadge>
                        ) : !project.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium uppercase tracking-wider bg-red-500 text-white rounded">
                                Paused
                            </span>
                        ) : (
                            <DegenBadge variant="success" size="sm" dot>
                                Active
                            </DegenBadge>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center bg-degen-bg p-2 border border-degen-black">
                    <p className="text-degen-black text-lg font-medium">{project.total_boxes_created || 0}</p>
                    <p className="text-degen-text-muted text-[10px] uppercase">Boxes</p>
                </div>
                <div className="text-center bg-degen-bg p-2 border border-degen-black">
                    <p className="text-degen-black text-lg font-medium">{project.total_boxes_settled || 0}</p>
                    <p className="text-degen-text-muted text-[10px] uppercase">Settled</p>
                </div>
                <div className="text-center bg-degen-bg p-2 border border-degen-black">
                    <p className="text-degen-black text-lg font-medium">
                        {balanceLoading
                            ? '...'
                            : `${(vaultBalance / Math.pow(10, project.payment_token_decimals || 9)).toFixed(2)}`}
                    </p>
                    <p className="text-degen-text-muted text-[10px] uppercase">Vault ({project.payment_token_symbol || 'tokens'})</p>
                </div>
            </div>

            {/* Site URL */}
            <div className="mb-4 p-3 bg-degen-bg border border-degen-black">
                <p className="text-degen-text-muted text-xs uppercase mb-1">Your Site URL</p>
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
