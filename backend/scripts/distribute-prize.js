#!/usr/bin/env node
/**
 * Distribute Prize
 *
 * Sends tokens from treasury to a winner's wallet.
 * Useful for competitions, giveaways, etc.
 *
 * Usage:
 *   node scripts/distribute-prize.js --to <wallet> --amount <amount>
 *   node scripts/distribute-prize.js --to <wallet> --percent <1-100>
 *
 * Options:
 *   --to <wallet>       Winner's wallet address (required)
 *   --amount <amount>   Specific amount to send (in base units)
 *   --percent <1-100>   Percentage of treasury balance to send
 *   --token <mint>      Token mint (defaults to $3EYES)
 *   --dry-run           Simulate without executing
 *
 * Examples:
 *   # Send 1000 $3EYES (with 6 decimals = 1000000000 base units)
 *   node scripts/distribute-prize.js --to ABC123... --amount 1000000000
 *
 *   # Send 50% of treasury $3EYES balance
 *   node scripts/distribute-prize.js --to ABC123... --percent 50
 *
 * Requirements:
 *   - DEPLOY_WALLET_JSON in .env
 *   - Backend server running (uses API endpoint)
 */

import 'dotenv/config';
import { getNetworkConfig } from '../lib/getNetworkConfig.js';

// Parse command line arguments
const args = process.argv.slice(2);

function getArg(name) {
    const index = args.indexOf(`--${name}`);
    return index !== -1 ? args[index + 1] : null;
}

const TO_WALLET = getArg('to');
const AMOUNT = getArg('amount');
const PERCENT = getArg('percent') ? parseInt(getArg('percent')) : null;
const TOKEN_MINT = getArg('token');
const DRY_RUN = args.includes('--dry-run');

async function main() {
    console.log('\n========================================');
    console.log('  Prize Distribution');
    console.log('========================================\n');

    // Validation
    if (!TO_WALLET) {
        console.error('ERROR: --to <wallet> is required');
        console.log('\nUsage:');
        console.log('  node scripts/distribute-prize.js --to <wallet> --amount <amount>');
        console.log('  node scripts/distribute-prize.js --to <wallet> --percent <1-100>');
        process.exit(1);
    }

    if (!AMOUNT && !PERCENT) {
        console.error('ERROR: Must provide --amount or --percent');
        process.exit(1);
    }

    if (AMOUNT && PERCENT) {
        console.error('ERROR: Provide either --amount OR --percent, not both');
        process.exit(1);
    }

    if (PERCENT && (PERCENT < 1 || PERCENT > 100)) {
        console.error('ERROR: --percent must be between 1 and 100');
        process.exit(1);
    }

    // Get network config for $3EYES mint
    const config = await getNetworkConfig();
    const tokenMint = TOKEN_MINT || config.threeEyesMint?.toString();

    if (!tokenMint) {
        console.error('ERROR: No token mint specified and $3EYES mint not configured');
        process.exit(1);
    }

    console.log(`Token: ${tokenMint === config.threeEyesMint?.toString() ? '$3EYES' : tokenMint}`);
    console.log(`To wallet: ${TO_WALLET}`);
    console.log(`Amount: ${AMOUNT || `${PERCENT}% of treasury`}`);

    if (DRY_RUN) {
        console.log('\n*** DRY RUN - No transaction will be executed ***\n');
    }

    // Get admin wallet for auth header
    const deployWalletJson = process.env.DEPLOY_WALLET_JSON;
    if (!deployWalletJson) {
        console.error('ERROR: DEPLOY_WALLET_JSON not found in .env');
        process.exit(1);
    }

    let adminPublicKey;
    try {
        const { Keypair } = await import('@solana/web3.js');
        const secretKey = Uint8Array.from(JSON.parse(deployWalletJson));
        const adminKeypair = Keypair.fromSecretKey(secretKey);
        adminPublicKey = adminKeypair.publicKey.toString();
        console.log(`Admin wallet: ${adminPublicKey}`);
    } catch (e) {
        console.error('ERROR: Failed to parse DEPLOY_WALLET_JSON');
        process.exit(1);
    }

    if (DRY_RUN) {
        console.log('\n[DRY RUN] Would call POST /api/admin/distribute-prize with:');
        console.log(JSON.stringify({
            tokenMint,
            toWallet: TO_WALLET,
            amount: AMOUNT || undefined,
            percent: PERCENT || undefined,
        }, null, 2));
        console.log('\n*** DRY RUN complete - no transaction executed ***');
        return;
    }

    // Call the API endpoint
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const endpoint = `${backendUrl}/api/admin/distribute-prize`;

    console.log(`\nCalling API: ${endpoint}`);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Wallet-Address': adminPublicKey,
            },
            body: JSON.stringify({
                tokenMint,
                toWallet: TO_WALLET,
                amount: AMOUNT || undefined,
                percent: PERCENT || undefined,
            }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            console.error('\nERROR: Prize distribution failed');
            console.error(result.error || result.details || 'Unknown error');
            process.exit(1);
        }

        console.log('\n========================================');
        console.log('  Prize Distribution Complete!');
        console.log('========================================');
        console.log(`Amount: ${result.amountFormatted} tokens`);
        console.log(`To: ${result.toWallet}`);
        console.log(`TX: ${result.signature}`);
        console.log(`Explorer: ${result.explorerUrl}`);

    } catch (error) {
        console.error('\nERROR: Failed to call API');
        console.error(error.message);
        console.log('\nMake sure the backend server is running.');
        process.exit(1);
    }
}

main().catch(console.error);
