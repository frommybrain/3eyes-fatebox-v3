'use client';

import { useEffect, useState } from 'react';
import {
    DegenCard,
    DegenBadge,
    DegenButton,
    DegenLoadingState,
    DegenEmptyState,
} from '@/components/ui';
import ProfileStats from './ProfileStats';
import ProfileBadges from './ProfileBadges';
import { getProfileShareHandler } from '@/lib/shareManager';

export default function ProfilePage({ username }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [profileData, setProfileData] = useState(null);

    useEffect(() => {
        async function fetchProfile() {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
                const response = await fetch(`${backendUrl}/api/users/by-username/${username}`);
                const data = await response.json();

                if (!data.success) {
                    setError(data.error || 'Failed to load profile');
                } else {
                    setProfileData(data);
                }
            } catch (err) {
                console.error('Error fetching profile:', err);
                setError('Failed to connect to server');
            } finally {
                setLoading(false);
            }
        }

        if (username) {
            fetchProfile();
        }
    }, [username]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-degen-bg">
                <DegenLoadingState text="Loading profile..." />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-6">
                <div className="max-w-4xl mx-auto">
                    <DegenEmptyState
                        title="Profile Not Found"
                        description={error === 'User not found' ? `No user found with username "${username}"` : error}
                    />
                </div>
            </div>
        );
    }

    const { profile, stats, badges } = profileData;

    // Truncate wallet for display
    const truncatedWallet = profile?.walletAddress
        ? `${profile.walletAddress.slice(0, 4)}...${profile.walletAddress.slice(-4)}`
        : '';

    const handleShare = getProfileShareHandler(stats, username);

    return (
        <div className="min-h-screen bg-degen-bg pt-24 pb-12 px-6">
            <div className="max-w-4xl mx-auto">
                {/* Profile Header */}
                <DegenCard variant="white" padding="lg" className="mb-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                        {/* Avatar */}
                        <div className="w-24 h-24 bg-degen-container border border-degen-black flex items-center justify-center text-4xl">
                            {username?.charAt(0).toUpperCase() || '?'}
                        </div>

                        {/* Info */}
                        <div className="flex-1 text-center sm:text-left">
                            <h1 className="text-degen-black text-3xl font-medium uppercase tracking-wider mb-2">
                                {username}
                            </h1>

                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mb-4">
                                {/* Wallet */}
                                <span className="text-degen-text-muted text-sm font-mono">
                                    {truncatedWallet}
                                </span>

                                {/* X Handle */}
                                {profile?.xHandle && (
                                    <a
                                        href={`https://x.com/${profile.xHandle}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-degen-blue hover:underline text-sm"
                                    >
                                        @{profile.xHandle}
                                    </a>
                                )}

                                {/* Member since */}
                                {profile?.createdAt && (
                                    <span className="text-degen-text-muted text-sm">
                                        Member since {new Date(profile.createdAt).toLocaleDateString()}
                                    </span>
                                )}
                            </div>

                            {/* Share button */}
                            <DegenButton
                                onClick={handleShare}
                                variant="secondary"
                                size="sm"
                            >
                                Share Profile
                            </DegenButton>
                        </div>
                    </div>
                </DegenCard>

                {/* Stats Grid */}
                <ProfileStats stats={stats} className="mb-6" />

                {/* Badges */}
                <ProfileBadges badges={badges} username={username} className="mb-6" />

                {/* Quick Stats Summary */}
                {stats.totalEarnings && stats.totalEarnings.length > 0 && (
                    <DegenCard variant="default" padding="md">
                        <h2 className="text-degen-black text-xl font-medium uppercase tracking-wider mb-4">
                            Earnings by Token
                        </h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {stats.totalEarnings.map((earning) => (
                                <div
                                    key={earning.symbol}
                                    className="text-center p-3 bg-degen-container border border-degen-black"
                                >
                                    <p className="text-degen-text-muted text-xs uppercase mb-1">
                                        {earning.symbol}
                                    </p>
                                    <p className="text-degen-black text-lg font-medium">
                                        {earning.formatted}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </DegenCard>
                )}
            </div>
        </div>
    );
}
