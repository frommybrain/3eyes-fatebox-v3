// routes/users.js
// API routes for user profiles, stats, and badges

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Badge definitions
const BADGE_DEFINITIONS = {
    jackpot: {
        name: 'Jackpot Winner',
        description: 'Hit a jackpot on DegenBox',
        icon: '/images/badge-jackpot.png'
    },
    creator: {
        name: 'Project Creator',
        description: 'Created a lootbox project',
        icon: '/images/badge-creator.png'
    },
    boxes_10: {
        name: '10 Boxes Club',
        description: 'Purchased 10 lootboxes',
        icon: '/images/badge-10boxes.png'
    },
    boxes_25: {
        name: '25 Boxes Club',
        description: 'Purchased 25 lootboxes',
        icon: '/images/badge-25boxes.png'
    },
    boxes_50: {
        name: '50 Boxes Club',
        description: 'Purchased 50 lootboxes',
        icon: '/images/badge-50boxes.png'
    },
    boxes_100: {
        name: 'Century Club',
        description: 'Purchased 100 lootboxes',
        icon: '/images/badge-100boxes.png'
    }
};

/**
 * Compute user stats from boxes table
 */
async function computeUserStats(walletAddress) {
    // Get all boxes for this wallet
    const { data: boxes, error: boxesError } = await supabase
        .from('boxes')
        .select(`
            id,
            box_result,
            payout_amount,
            created_at,
            opened_at,
            settled_at,
            project_id,
            projects!inner(
                payment_token_symbol,
                payment_token_decimals,
                box_price
            )
        `)
        .eq('owner_wallet', walletAddress);

    if (boxesError) {
        console.error('Error fetching boxes for stats:', boxesError);
        throw boxesError;
    }

    // Get projects created by this wallet
    const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_wallet', walletAddress);

    if (projectsError) {
        console.error('Error fetching projects for stats:', projectsError);
        throw projectsError;
    }

    // Compute stats
    const totalBoxes = boxes?.length || 0;
    const openedBoxes = boxes?.filter(b => b.box_result > 0).length || 0;
    const pendingBoxes = boxes?.filter(b => b.box_result === 0).length || 0;

    // Count by tier (DB values: 1=dud, 2=rebate, 3=breakeven, 4=profit, 5=jackpot, 6=refunded)
    const dudCount = boxes?.filter(b => b.box_result === 1).length || 0;
    const rebateCount = boxes?.filter(b => b.box_result === 2).length || 0;
    const breakevenCount = boxes?.filter(b => b.box_result === 3).length || 0;
    const profitCount = boxes?.filter(b => b.box_result === 4).length || 0;
    const jackpotCount = boxes?.filter(b => b.box_result === 5).length || 0;
    const refundedCount = boxes?.filter(b => b.box_result === 6).length || 0;

    // Wins = anything that pays out (rebate, breakeven, profit, jackpot)
    const winsCount = rebateCount + breakevenCount + profitCount + jackpotCount;

    // Calculate earnings by token
    const earningsByToken = {};
    const spentByToken = {};

    boxes?.forEach(box => {
        const symbol = box.projects?.payment_token_symbol || 'UNKNOWN';
        const decimals = box.projects?.payment_token_decimals || 9;
        const boxPrice = box.projects?.box_price || 0;

        // Initialize if needed
        if (!earningsByToken[symbol]) {
            earningsByToken[symbol] = { amount: 0, decimals };
        }
        if (!spentByToken[symbol]) {
            spentByToken[symbol] = { amount: 0, decimals };
        }

        // Add payout to earnings
        if (box.payout_amount > 0) {
            earningsByToken[symbol].amount += Number(box.payout_amount);
        }

        // Add box price to spent
        spentByToken[symbol].amount += Number(boxPrice);
    });

    // Calculate total earnings formatted
    const totalEarnings = Object.entries(earningsByToken).map(([symbol, data]) => ({
        symbol,
        amount: data.amount,
        formatted: (data.amount / Math.pow(10, data.decimals)).toFixed(2)
    }));

    // Calculate total spent formatted
    const totalSpent = Object.entries(spentByToken).map(([symbol, data]) => ({
        symbol,
        amount: data.amount,
        formatted: (data.amount / Math.pow(10, data.decimals)).toFixed(2)
    }));

    // Win rate (exclude pending and refunded)
    const eligibleForWinRate = openedBoxes - refundedCount;
    const winRate = eligibleForWinRate > 0
        ? ((winsCount / eligibleForWinRate) * 100).toFixed(1)
        : 0;

    return {
        totalBoxes,
        openedBoxes,
        pendingBoxes,
        winsCount,
        dudCount,
        rebateCount,
        breakevenCount,
        profitCount,
        jackpotCount,
        refundedCount,
        winRate: parseFloat(winRate),
        totalEarnings,
        totalSpent,
        projectsCreated: projects?.length || 0
    };
}

/**
 * Check and award badges based on stats
 */
async function checkAndAwardBadges(walletAddress, stats) {
    // Get existing badges
    const { data: existingBadges, error: badgesError } = await supabase
        .from('user_badges')
        .select('badge_type')
        .eq('wallet_address', walletAddress);

    if (badgesError) {
        console.error('Error fetching existing badges:', badgesError);
        throw badgesError;
    }

    const existingTypes = new Set(existingBadges?.map(b => b.badge_type) || []);
    const newBadges = [];

    // Ensure user profile exists (required for foreign key)
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('wallet_address')
        .eq('wallet_address', walletAddress)
        .single();

    if (!profile) {
        // Create profile first
        await supabase
            .from('user_profiles')
            .insert({ wallet_address: walletAddress });
    }

    // Check jackpot badge
    if (stats.jackpotCount >= 1 && !existingTypes.has('jackpot')) {
        const { error } = await supabase
            .from('user_badges')
            .insert({ wallet_address: walletAddress, badge_type: 'jackpot' });
        if (!error) newBadges.push('jackpot');
    }

    // Check creator badge
    if (stats.projectsCreated >= 1 && !existingTypes.has('creator')) {
        const { error } = await supabase
            .from('user_badges')
            .insert({ wallet_address: walletAddress, badge_type: 'creator' });
        if (!error) newBadges.push('creator');
    }

    // Check box milestone badges
    const milestones = [10, 25, 50, 100];
    for (const milestone of milestones) {
        const badgeType = `boxes_${milestone}`;
        if (stats.totalBoxes >= milestone && !existingTypes.has(badgeType)) {
            const { error } = await supabase
                .from('user_badges')
                .insert({ wallet_address: walletAddress, badge_type: badgeType });
            if (!error) newBadges.push(badgeType);
        }
    }

    return newBadges;
}

/**
 * GET /api/users/check-username/:username
 * Check if a username is available
 */
router.get('/check-username/:username', async (req, res) => {
    try {
        const { username } = req.params;

        // Validate format
        if (!username || !/^[a-z0-9_]{3,20}$/.test(username)) {
            return res.json({
                success: true,
                available: false,
                reason: 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only'
            });
        }

        // Check if taken
        const { data: existing } = await supabase
            .from('user_profiles')
            .select('wallet_address')
            .eq('username', username)
            .single();

        res.json({
            success: true,
            available: !existing,
            reason: existing ? 'Username is already taken' : null
        });

    } catch (error) {
        console.error('Error checking username:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check username availability'
        });
    }
});

/**
 * GET /api/users/by-username/:username
 * Lookup user by username (for profile pages)
 */
router.get('/by-username/:username', async (req, res) => {
    try {
        const { username } = req.params;

        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('username', username)
            .single();

        if (error || !profile) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Get stats
        const stats = await computeUserStats(profile.wallet_address);

        // Get badges
        const { data: badges } = await supabase
            .from('user_badges')
            .select('badge_type, earned_at')
            .eq('wallet_address', profile.wallet_address);

        // Enrich badges with definitions
        const enrichedBadges = (badges || []).map(b => ({
            ...b,
            ...BADGE_DEFINITIONS[b.badge_type]
        }));

        res.json({
            success: true,
            profile: {
                walletAddress: profile.wallet_address,
                username: profile.username,
                xHandle: profile.x_handle,
                createdAt: profile.created_at
            },
            stats,
            badges: enrichedBadges
        });

    } catch (error) {
        console.error('Error fetching user by username:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user profile'
        });
    }
});

/**
 * GET /api/users/:wallet
 * Get user profile, stats, and badges
 */
router.get('/:wallet', async (req, res) => {
    try {
        const { wallet } = req.params;

        // Get profile (may not exist yet)
        const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('wallet_address', wallet)
            .single();

        // Get stats
        const stats = await computeUserStats(wallet);

        // Get badges
        const { data: badges } = await supabase
            .from('user_badges')
            .select('badge_type, earned_at')
            .eq('wallet_address', wallet);

        // Enrich badges with definitions
        const enrichedBadges = (badges || []).map(b => ({
            ...b,
            ...BADGE_DEFINITIONS[b.badge_type]
        }));

        res.json({
            success: true,
            profile: profile ? {
                walletAddress: profile.wallet_address,
                username: profile.username,
                xHandle: profile.x_handle,
                createdAt: profile.created_at
            } : null,
            stats,
            badges: enrichedBadges
        });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user data'
        });
    }
});

/**
 * PUT /api/users/:wallet
 * Create or update user profile
 */
router.put('/:wallet', async (req, res) => {
    try {
        const { wallet } = req.params;
        const { username, xHandle } = req.body;

        // Validate username format if provided
        if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
            return res.status(400).json({
                success: false,
                error: 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only'
            });
        }

        // Validate x_handle format if provided
        if (xHandle && !/^[a-zA-Z0-9_]{1,15}$/.test(xHandle)) {
            return res.status(400).json({
                success: false,
                error: 'X handle must be 1-15 characters, letters, numbers, and underscores only'
            });
        }

        // Check if username is taken by someone else
        if (username) {
            const { data: existing } = await supabase
                .from('user_profiles')
                .select('wallet_address')
                .eq('username', username)
                .neq('wallet_address', wallet)
                .single();

            if (existing) {
                return res.status(409).json({
                    success: false,
                    error: 'Username is already taken'
                });
            }
        }

        // Upsert profile
        const { data: profile, error } = await supabase
            .from('user_profiles')
            .upsert({
                wallet_address: wallet,
                username: username || null,
                x_handle: xHandle || null,
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'wallet_address'
            })
            .select()
            .single();

        if (error) {
            console.error('Error updating profile:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update profile',
                details: error.message
            });
        }

        res.json({
            success: true,
            profile: {
                walletAddress: profile.wallet_address,
                username: profile.username,
                xHandle: profile.x_handle,
                createdAt: profile.created_at,
                updatedAt: profile.updated_at
            }
        });

    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update user profile'
        });
    }
});

/**
 * GET /api/users/:wallet/badges
 * Get user badges, optionally check and award new ones
 */
router.get('/:wallet/badges', async (req, res) => {
    try {
        const { wallet } = req.params;
        const checkForNew = req.query.check === 'true';

        let newBadges = [];

        if (checkForNew) {
            // Compute stats and check for new badges
            const stats = await computeUserStats(wallet);
            newBadges = await checkAndAwardBadges(wallet, stats);
        }

        // Get all badges
        const { data: badges, error } = await supabase
            .from('user_badges')
            .select('badge_type, earned_at')
            .eq('wallet_address', wallet)
            .order('earned_at', { ascending: false });

        if (error) {
            console.error('Error fetching badges:', error);
            throw error;
        }

        // Enrich badges with definitions
        const enrichedBadges = (badges || []).map(b => ({
            ...b,
            ...BADGE_DEFINITIONS[b.badge_type]
        }));

        // Enrich new badges with definitions
        const enrichedNewBadges = newBadges.map(type => ({
            badge_type: type,
            ...BADGE_DEFINITIONS[type],
            earned_at: new Date().toISOString()
        }));

        res.json({
            success: true,
            badges: enrichedBadges,
            newBadges: enrichedNewBadges
        });

    } catch (error) {
        console.error('Error fetching badges:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch badges'
        });
    }
});

/**
 * GET /api/users/:wallet/stats
 * Get computed user stats
 */
router.get('/:wallet/stats', async (req, res) => {
    try {
        const { wallet } = req.params;
        const stats = await computeUserStats(wallet);

        res.json({
            success: true,
            stats
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user stats'
        });
    }
});

export default router;
