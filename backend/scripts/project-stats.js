#!/usr/bin/env node
/**
 * Project Stats
 * Query and display statistics for a specific project
 *
 * Usage: node scripts/project-stats.js <project-id>
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

const projectId = process.argv[2] || '3a78c02a-d838-4f0e-863f-6b34d63a4ebb';

async function run() {
    // Get project details
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

    if (projectError) {
        console.error('Project error:', projectError);
        return;
    }

    console.log('\n========================================');
    console.log('  PROJECT DETAILS');
    console.log('========================================');
    console.log('Name:', project.project_name);
    console.log('Subdomain:', project.subdomain);
    console.log('Numeric ID:', project.project_numeric_id);
    console.log('Token:', project.payment_token_symbol, '(' + project.payment_token_mint + ')');
    const decimals = project.payment_token_decimals || 6;
    const boxPrice = project.box_price / Math.pow(10, decimals);
    console.log('Box Price:', boxPrice, project.payment_token_symbol);
    console.log('Created:', project.created_at);
    console.log('Active:', project.is_active);
    console.log('Closed:', project.closed_at || 'No');

    // Get all boxes for this project
    const { data: boxes, error: boxesError } = await supabase
        .from('boxes')
        .select('*')
        .eq('project_id', projectId);

    if (boxesError) {
        console.error('Boxes error:', boxesError);
        return;
    }

    console.log('\n========================================');
    console.log('  BOX STATISTICS');
    console.log('========================================');
    console.log('Total boxes created:', boxes.length);

    // Derive status from box state
    const getStatus = (box) => {
        if (box.refunded_at) return 'refunded';
        if (box.settled_at) return 'settled';
        if (box.committed_at) return 'committed';
        return 'purchased';
    };

    const statusCounts = boxes.reduce((acc, box) => {
        const status = getStatus(box);
        acc[status] = (acc[status] || 0) + 1;
        return acc;
    }, {});
    console.log('\nBy Status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
        console.log('  ' + status + ':', count);
    });

    // Get settled boxes with outcome data
    const settledBoxes = boxes.filter(b => b.settled_at !== null);

    console.log('\n========================================');
    console.log('  OUTCOME BREAKDOWN');
    console.log('========================================');

    // Tier values based on backend/config/badges.js:
    // 1 = Dud (loss), 2 = Rebate (0.5x), 3 = Break-even (1x), 4 = Profit (1.5x), 5 = Jackpot (4x), 6 = Refunded
    const getTierName = (result) => {
        switch(result) {
            case 1: return 'Dud (Loss)';
            case 2: return 'Rebate (0.5x)';
            case 3: return 'Break Even (1x)';
            case 4: return 'Profit (1.5x)';
            case 5: return 'Jackpot (4x)';
            case 6: return 'Refunded';
            default: return `Unknown (${result})`;
        }
    };

    // Count by outcome tier
    const tierCounts = settledBoxes.reduce((acc, box) => {
        const tier = box.box_result;
        if (tier !== null && tier !== undefined) {
            acc[tier] = (acc[tier] || 0) + 1;
        }
        return acc;
    }, {});

    if (Object.keys(tierCounts).length > 0) {
        Object.entries(tierCounts).sort((a, b) => a[0] - b[0]).forEach(([tier, count]) => {
            const pct = ((count / settledBoxes.length) * 100).toFixed(1);
            console.log('  ' + getTierName(parseInt(tier)) + ':', count, '(' + pct + '%)');
        });
    } else {
        console.log('  No settled boxes with outcomes');
    }

    // Calculate financial stats
    const totalRevenue = boxes.length * boxPrice;
    const totalPaidOut = settledBoxes.reduce((sum, box) => {
        return sum + (box.payout_amount ? box.payout_amount / Math.pow(10, decimals) : 0);
    }, 0);

    console.log('\n========================================');
    console.log('  FINANCIAL SUMMARY');
    console.log('========================================');
    console.log('Box Price:', boxPrice, project.payment_token_symbol);
    console.log('Total Revenue (boxes sold):', totalRevenue.toLocaleString(), project.payment_token_symbol);
    console.log('Total Paid Out:', totalPaidOut.toLocaleString(), project.payment_token_symbol);
    console.log('Net Profit:', (totalRevenue - totalPaidOut).toLocaleString(), project.payment_token_symbol);
    if (totalRevenue > 0) {
        console.log('House Edge:', ((1 - totalPaidOut/totalRevenue) * 100).toFixed(2) + '%');
    }

    // Payout breakdown by tier
    console.log('\n========================================');
    console.log('  PAYOUTS BY TIER');
    console.log('========================================');

    const payoutsByTier = settledBoxes.reduce((acc, box) => {
        const tier = box.box_result;
        if (tier === null || tier === undefined) return acc;
        if (!acc[tier]) acc[tier] = { count: 0, total: 0 };
        acc[tier].count++;
        acc[tier].total += box.payout_amount ? box.payout_amount / Math.pow(10, decimals) : 0;
        return acc;
    }, {});

    if (Object.keys(payoutsByTier).length > 0) {
        Object.entries(payoutsByTier).sort((a, b) => a[0] - b[0]).forEach(([tier, data]) => {
            const avg = data.total / data.count;
            console.log('  ' + getTierName(parseInt(tier)) + ':');
            console.log('    Count:', data.count);
            console.log('    Total Paid:', data.total.toLocaleString(), project.payment_token_symbol);
            console.log('    Avg Payout:', avg.toFixed(2), project.payment_token_symbol);
        });
    } else {
        console.log('  No payout data available');
    }

    // Luck stats
    console.log('\n========================================');
    console.log('  LUCK STATISTICS');
    console.log('========================================');

    const luckValues = settledBoxes.map(b => b.luck_value).filter(l => l !== null && l !== undefined);
    if (luckValues.length > 0) {
        const avgLuck = luckValues.reduce((a, b) => a + b, 0) / luckValues.length;
        const minLuck = Math.min(...luckValues);
        const maxLuck = Math.max(...luckValues);
        console.log('Average luck at open:', avgLuck.toFixed(1));
        console.log('Min luck:', minLuck);
        console.log('Max luck:', maxLuck);
    } else {
        console.log('No luck data available');
    }

    // Unique buyers
    const uniqueBuyers = new Set(boxes.map(b => b.owner_wallet)).size;
    console.log('\n========================================');
    console.log('  USER STATISTICS');
    console.log('========================================');
    console.log('Unique buyers:', uniqueBuyers);
    console.log('Avg boxes per buyer:', (boxes.length / uniqueBuyers).toFixed(1));

    // Top buyers
    const buyerCounts = boxes.reduce((acc, box) => {
        acc[box.owner_wallet] = (acc[box.owner_wallet] || 0) + 1;
        return acc;
    }, {});
    const topBuyers = Object.entries(buyerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    console.log('\nTop 5 Buyers:');
    topBuyers.forEach(([wallet, count], i) => {
        const shortWallet = wallet.slice(0, 4) + '...' + wallet.slice(-4);
        console.log('  ' + (i + 1) + '. ' + shortWallet + ': ' + count + ' boxes');
    });

    // Time stats
    console.log('\n========================================');
    console.log('  TIMELINE');
    console.log('========================================');
    const sortedBoxes = [...boxes].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (sortedBoxes.length > 0) {
        console.log('First box:', sortedBoxes[0].created_at);
        console.log('Last box:', sortedBoxes[sortedBoxes.length - 1].created_at);

        const firstDate = new Date(sortedBoxes[0].created_at);
        const lastDate = new Date(sortedBoxes[sortedBoxes.length - 1].created_at);
        const durationMs = lastDate - firstDate;
        const durationHours = durationMs / (1000 * 60 * 60);
        const durationDays = durationHours / 24;

        if (durationDays >= 1) {
            console.log('Duration:', durationDays.toFixed(1), 'days');
        } else {
            console.log('Duration:', durationHours.toFixed(1), 'hours');
        }
    }

    // Platform commission calculation
    const platformCommissionBps = project.platform_commission_bps || 100; // default 1%
    const platformCommission = (totalRevenue * platformCommissionBps) / 10000;

    console.log('\n========================================');
    console.log('  PLATFORM COMMISSION');
    console.log('========================================');
    console.log('Commission Rate:', (platformCommissionBps / 100) + '%');
    console.log('Total Commission:', platformCommission.toLocaleString(), project.payment_token_symbol);
}

run().catch(console.error);
