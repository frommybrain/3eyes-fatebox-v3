#!/usr/bin/env node
/**
 * Mark committed boxes that failed to reveal as refund-eligible
 *
 * This script finds boxes that:
 * - Are committed (randomness_committed = true)
 * - Are NOT revealed (box_result = 0)
 * - Have passed the 1-hour reveal window
 * - Are NOT already marked as refund_eligible
 *
 * Usage: node scripts/markFailedBoxesRefundable.js [--project <id>] [--dry-run]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

// ===== TESTING CONFIG =====
// Set to 30 for quick testing, 3600 for production (1 hour)
const REVEAL_WINDOW_SECONDS = 3600;
// ===========================

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        projectId: null,
        dryRun: false,
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--project':
            case '-p':
                config.projectId = parseInt(args[++i], 10);
                break;
            case '--dry-run':
                config.dryRun = true;
                break;
            case '--help':
            case '-h':
                console.log(`
Mark Failed Boxes as Refund-Eligible

Usage: node scripts/markFailedBoxesRefundable.js [options]

Options:
  --project, -p <id>    Only process boxes for this project numeric ID
  --dry-run             Show what would be done without making changes
  --help, -h            Show this help message

Examples:
  node scripts/markFailedBoxesRefundable.js --dry-run
  node scripts/markFailedBoxesRefundable.js --project 111
`);
                process.exit(0);
        }
    }

    return config;
}

async function main() {
    const config = parseArgs();

    console.log('='.repeat(60));
    console.log('  MARK FAILED BOXES AS REFUND-ELIGIBLE');
    console.log('='.repeat(60));

    if (config.dryRun) {
        console.log('\n[DRY RUN MODE - No changes will be made]\n');
    }

    // Calculate the cutoff time (uses REVEAL_WINDOW_SECONDS config)
    const cutoffTime = new Date(Date.now() - REVEAL_WINDOW_SECONDS * 1000).toISOString();
    console.log(`Looking for boxes committed before: ${cutoffTime}`);

    // Build query
    let query = supabase
        .from('boxes')
        .select(`
            id,
            box_number,
            owner_wallet,
            created_at,
            committed_at,
            randomness_committed,
            box_result,
            refund_eligible,
            projects!inner(project_numeric_id, project_name)
        `)
        .eq('randomness_committed', true)
        .eq('box_result', 0)
        .or('refund_eligible.is.null,refund_eligible.eq.false')
        .lt('committed_at', cutoffTime);

    // Filter by project if specified
    if (config.projectId) {
        query = query.eq('projects.project_numeric_id', config.projectId);
        console.log(`Filtering by project ID: ${config.projectId}`);
    }

    const { data: failedBoxes, error } = await query;

    if (error) {
        console.error('Error querying boxes:', error);
        process.exit(1);
    }

    console.log(`\nFound ${failedBoxes.length} boxes that failed to reveal:\n`);

    if (failedBoxes.length === 0) {
        console.log('No boxes need to be marked as refund-eligible.');
        return;
    }

    // Group by project for reporting
    const byProject = {};
    for (const box of failedBoxes) {
        const projectName = box.projects?.project_name || 'Unknown';
        const projectId = box.projects?.project_numeric_id || 'N/A';
        const key = `${projectName} (ID: ${projectId})`;
        if (!byProject[key]) byProject[key] = [];
        byProject[key].push(box);
    }

    for (const [project, boxes] of Object.entries(byProject)) {
        console.log(`${project}:`);
        for (const box of boxes) {
            const committedAt = new Date(box.committed_at);
            const hoursAgo = ((Date.now() - committedAt.getTime()) / (1000 * 60 * 60)).toFixed(1);
            console.log(`  - Box #${box.box_number} (wallet: ${box.owner_wallet.slice(0, 8)}..., committed ${hoursAgo}h ago)`);
        }
        console.log('');
    }

    if (config.dryRun) {
        console.log(`Would mark ${failedBoxes.length} boxes as refund-eligible.`);
        console.log('Run without --dry-run to apply changes.');
        return;
    }

    // Update boxes
    console.log('Marking boxes as refund-eligible...');

    const boxIds = failedBoxes.map(b => b.id);
    const { error: updateError, count } = await supabase
        .from('boxes')
        .update({
            refund_eligible: true,
            reveal_failed_at: new Date().toISOString(),
            reveal_failure_reason: 'reveal_window_expired: Box was committed but reveal failed or was not attempted within the 1-hour window',
        })
        .in('id', boxIds);

    if (updateError) {
        console.error('Error updating boxes:', updateError);
        process.exit(1);
    }

    console.log(`\n✅ Successfully marked ${failedBoxes.length} boxes as refund-eligible!`);
    console.log('\nThese boxes will now show "Refund Available" in the UI.');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
