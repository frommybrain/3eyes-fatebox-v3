#!/usr/bin/env node
/**
 * Force Close Platform Config PDA
 *
 * This script closes the platform config PDA by transferring out all lamports.
 * Used when the account structure has changed and can't be deserialized.
 *
 * WARNING: This will delete all platform config data!
 *
 * Usage:
 *   node scripts/force-close-platform-config.js
 */

import 'dotenv/config';
import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { derivePlatformConfigPDA } from '../lib/pdaHelpers.js';
import { getNetworkConfig } from '../lib/getNetworkConfig.js';

async function main() {
    console.log('\n========================================');
    console.log('  Force Close Platform Config');
    console.log('========================================');
    console.log('\nWARNING: This will forcefully close the platform config PDA!');
    console.log('Use this when the account structure has changed.\n');

    // Load deploy wallet from env
    const deployWalletJson = process.env.DEPLOY_WALLET_JSON;
    if (!deployWalletJson) {
        console.error('ERROR: DEPLOY_WALLET_JSON not found in .env');
        process.exit(1);
    }

    let adminKeypair;
    try {
        const secretKey = Uint8Array.from(JSON.parse(deployWalletJson));
        adminKeypair = Keypair.fromSecretKey(secretKey);
        console.log(`Admin wallet: ${adminKeypair.publicKey.toString()}`);
    } catch (e) {
        console.error('ERROR: Failed to parse DEPLOY_WALLET_JSON');
        console.error(e.message);
        process.exit(1);
    }

    // Get network config
    const config = await getNetworkConfig();
    const connection = new Connection(config.rpcUrl, 'confirmed');
    console.log(`Network: ${config.network}`);
    console.log(`Program ID: ${config.programId.toString()}`);

    // Derive platform config PDA
    const [platformConfigPDA, bump] = derivePlatformConfigPDA(config.programId);
    console.log(`\nPlatform Config PDA: ${platformConfigPDA.toString()}`);

    // Check if platform config exists
    const existingAccount = await connection.getAccountInfo(platformConfigPDA);
    if (!existingAccount) {
        console.log('\nPlatform config does not exist. Nothing to close.');
        process.exit(0);
    }

    console.log(`Account size: ${existingAccount.data.length} bytes`);
    console.log(`Account lamports: ${existingAccount.lamports}`);
    console.log(`Account owner: ${existingAccount.owner.toString()}`);

    // Read current admin from the account (skip 8-byte discriminator)
    const currentAdmin = new PublicKey(existingAccount.data.subarray(8, 40));
    console.log(`Current admin in config: ${currentAdmin.toString()}`);

    // Check if our wallet matches the admin
    if (!currentAdmin.equals(adminKeypair.publicKey)) {
        console.error('\nERROR: Your wallet is not the current admin of the platform config!');
        console.error(`  Current admin: ${currentAdmin.toString()}`);
        console.error(`  Your wallet:   ${adminKeypair.publicKey.toString()}`);
        process.exit(1);
    }

    // The account is owned by the program, so we can't directly close it with SystemProgram.
    // We need to use the program's close instruction.
    // However, since deserialization fails, we have a problem.

    // Option: Check if the program has an authority that can close it
    // For Anchor PDAs, the program owns the account, so only the program can close it.

    // Since the close instruction fails due to deserialization, our options are:
    // 1. Deploy a migration version of the program that handles the old format
    // 2. Deploy to a new program ID (cleanest for devnet)

    console.log('\n⚠️  Cannot force close - account is owned by the program.');
    console.log('The program needs to close it, but deserialization fails due to struct changes.');
    console.log('\nOptions:');
    console.log('1. Deploy to a new program ID (recommended for devnet)');
    console.log('2. Create a migration program that can read the old format');

    // Let's check if we can at least see what the account data looks like
    console.log('\n--- Raw Account Data (first 100 bytes) ---');
    console.log(Buffer.from(existingAccount.data.subarray(0, 100)).toString('hex'));

    process.exit(1);
}

main().catch(console.error);
