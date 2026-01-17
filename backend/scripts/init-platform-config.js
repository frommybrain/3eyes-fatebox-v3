#!/usr/bin/env node
/**
 * Initialize Platform Config PDA
 *
 * This script initializes the platform config PDA with default values.
 * Run this once after deploying the program to devnet/mainnet.
 *
 * Usage:
 *   node scripts/init-platform-config.js
 *
 * Requirements:
 *   - DEPLOY_WALLET_KEYPAIR in .env (JSON array of secret key bytes)
 *   - Program must be deployed
 *   - Network config in super_admin_config table
 */

import 'dotenv/config';
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';
import { createClient } from '@supabase/supabase-js';
import { derivePlatformConfigPDA, deriveTreasuryPDA } from '../lib/pdaHelpers.js';
import { getAnchorProgram } from '../lib/anchorClient.js';
import { getNetworkConfig } from '../lib/getNetworkConfig.js';

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

async function main() {
    console.log('\n========================================');
    console.log('  Platform Config Initialization');
    console.log('========================================\n');

    // Load deploy wallet from env
    const deployWalletJson = process.env.DEPLOY_WALLET_JSON;
    if (!deployWalletJson) {
        console.error('ERROR: DEPLOY_WALLET_JSON not found in .env');
        console.error('Add your deploy wallet keypair as a JSON array of bytes.');
        process.exit(1);
    }

    let adminKeypair;
    try {
        const secretKey = Uint8Array.from(JSON.parse(deployWalletJson));
        adminKeypair = Keypair.fromSecretKey(secretKey);
        console.log(`Admin wallet: ${adminKeypair.publicKey.toString()}`);
    } catch (e) {
        console.error('ERROR: Failed to parse DEPLOY_WALLET_KEYPAIR');
        console.error(e.message);
        process.exit(1);
    }

    // Get network config from database
    const config = await getNetworkConfig();
    console.log(`Network: ${config.network}`);
    console.log(`Program ID: ${config.programId.toString()}`);

    // Get luck interval from database config
    const { data: adminConfig, error: configError } = await supabase
        .from('super_admin_config')
        .select('luck_interval_seconds')
        .eq('id', 1)
        .single();

    if (configError || !adminConfig) {
        console.error('ERROR: Failed to fetch super_admin_config');
        process.exit(1);
    }

    const luckTimeInterval = adminConfig.luck_interval_seconds || 10800; // Default 3 hours for production
    console.log(`Luck time interval: ${luckTimeInterval} seconds`);

    // Get Anchor program
    const { program, connection, programId } = await getAnchorProgram();

    // Derive platform config PDA
    const [platformConfigPDA, bump] = derivePlatformConfigPDA(programId);
    console.log(`\nPlatform Config PDA: ${platformConfigPDA.toString()}`);
    console.log(`Bump: ${bump}`);

    // Derive treasury PDA (for commission collection)
    const [treasuryPDA, treasuryBump] = deriveTreasuryPDA(programId);
    console.log(`Treasury PDA: ${treasuryPDA.toString()}`);
    console.log(`Treasury Bump: ${treasuryBump}`);

    // Check if already initialized
    const existingAccount = await connection.getAccountInfo(platformConfigPDA);
    if (existingAccount) {
        console.log('\n*** Platform config already initialized! ***');
        console.log('To update config, use the update_platform_config instruction.');

        // Try to read and display current values
        try {
            // Skip 8-byte discriminator
            const data = existingAccount.data;
            let offset = 8;

            const admin = new PublicKey(data.subarray(offset, offset + 32));
            offset += 32;

            const initialized = data[offset] === 1;
            offset += 1;

            const paused = data[offset] === 1;
            offset += 1;

            const baseLuck = data[offset];
            offset += 1;

            const maxLuck = data[offset];
            offset += 1;

            const storedLuckInterval = new BN(data.subarray(offset, offset + 8), 'le').toNumber();

            console.log('\nCurrent config values:');
            console.log(`  Admin: ${admin.toString()}`);
            console.log(`  Initialized: ${initialized}`);
            console.log(`  Paused: ${paused}`);
            console.log(`  Base luck: ${baseLuck}`);
            console.log(`  Max luck: ${maxLuck}`);
            console.log(`  Luck time interval: ${storedLuckInterval} seconds`);
        } catch (e) {
            console.log('(Could not parse existing config data)');
        }

        process.exit(0);
    }

    console.log('\nInitializing platform config with default values...');
    console.log('Default values:');
    console.log('  Base luck: 5');
    console.log('  Max luck: 60');
    console.log('  Luck time interval: ' + luckTimeInterval + ' seconds');
    console.log('  Payout multipliers: Dud=0x, Rebate=0.8x, Break-even=1x, Profit=2.5x, Jackpot=10x');
    console.log('  Tier 1 (luck 0-5): 55% dud, 30% rebate, 10% break-even, 4.5% profit, 0.5% jackpot');
    console.log('  Tier 2 (luck 6-13): 45% dud, 30% rebate, 15% break-even, 8.5% profit, 1.5% jackpot');
    console.log('  Tier 3 (luck 14-60): 30% dud, 25% rebate, 20% break-even, 20% profit, 5% jackpot');
    console.log('  Platform commission: 5% (500 basis points)');
    console.log(`  Treasury PDA: ${treasuryPDA.toString()}`);

    try {
        // Build initialize_platform_config transaction
        const luckTimeIntervalBN = new BN(luckTimeInterval);

        const tx = await program.methods
            .initializePlatformConfig(luckTimeIntervalBN)
            .accounts({
                admin: adminKeypair.publicKey,
                platformConfig: platformConfigPDA,
                treasury: treasuryPDA,
                systemProgram: SystemProgram.programId,
            })
            .transaction();

        // Get recent blockhash
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.lastValidBlockHeight = lastValidBlockHeight;
        tx.feePayer = adminKeypair.publicKey;

        // Sign with admin keypair
        tx.sign(adminKeypair);

        // Send transaction
        console.log('\nSending transaction...');
        const signature = await connection.sendRawTransaction(tx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });

        console.log(`Transaction sent: ${signature}`);
        console.log(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=${config.network}`);

        // Wait for confirmation
        console.log('\nWaiting for confirmation...');
        const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight,
        }, 'confirmed');

        if (confirmation.value.err) {
            console.error('ERROR: Transaction failed');
            console.error(confirmation.value.err);
            process.exit(1);
        }

        console.log('\n========================================');
        console.log('  Platform Config Initialized!');
        console.log('========================================');
        console.log(`\nPDA: ${platformConfigPDA.toString()}`);
        console.log(`Admin: ${adminKeypair.publicKey.toString()}`);
        console.log(`Transaction: ${signature}`);
        console.log('\nYou can now create projects and buy boxes.');

    } catch (error) {
        console.error('\nERROR: Failed to initialize platform config');
        console.error(error.message);

        if (error.logs) {
            console.error('\nProgram logs:');
            error.logs.forEach(log => console.error('  ' + log));
        }

        process.exit(1);
    }
}

main().catch(console.error);
