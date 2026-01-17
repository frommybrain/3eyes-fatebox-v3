#!/usr/bin/env node
/**
 * Close Platform Config PDA
 *
 * This script closes the platform config PDA to allow reinitialization.
 * Use this when migrating to a new program version with changed account structure.
 *
 * WARNING: This will delete all platform config data!
 *
 * Usage:
 *   node scripts/close-platform-config.js
 */

import 'dotenv/config';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import BN from 'bn.js';
import { derivePlatformConfigPDA } from '../lib/pdaHelpers.js';
import { getAnchorProgram } from '../lib/anchorClient.js';
import { getNetworkConfig } from '../lib/getNetworkConfig.js';

async function main() {
    console.log('\n========================================');
    console.log('  Close Platform Config');
    console.log('========================================');
    console.log('\nWARNING: This will delete the platform config PDA!');
    console.log('Make sure you want to do this before proceeding.\n');

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
    console.log(`Network: ${config.network}`);
    console.log(`Program ID: ${config.programId.toString()}`);

    // Get Anchor program
    const { program, connection, programId } = await getAnchorProgram();

    // Derive platform config PDA
    const [platformConfigPDA, bump] = derivePlatformConfigPDA(programId);
    console.log(`\nPlatform Config PDA: ${platformConfigPDA.toString()}`);

    // Check if platform config exists
    const existingAccount = await connection.getAccountInfo(platformConfigPDA);
    if (!existingAccount) {
        console.log('\nPlatform config does not exist. Nothing to close.');
        process.exit(0);
    }

    // Read current admin from the account
    const data = existingAccount.data;
    const currentAdmin = new PublicKey(data.subarray(8, 40)); // Skip 8-byte discriminator
    console.log(`Current admin in config: ${currentAdmin.toString()}`);

    // Check if our wallet matches the admin
    if (!currentAdmin.equals(adminKeypair.publicKey)) {
        console.error('\nERROR: Your wallet is not the current admin of the platform config!');
        console.error(`  Current admin: ${currentAdmin.toString()}`);
        console.error(`  Your wallet:   ${adminKeypair.publicKey.toString()}`);
        console.error('\nYou cannot close the platform config with this wallet.');
        process.exit(1);
    }

    console.log('\nClosing platform config...');

    try {
        const tx = await program.methods
            .closePlatformConfig()
            .accounts({
                admin: adminKeypair.publicKey,
                platformConfig: platformConfigPDA,
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
        console.log('Sending transaction...');
        const signature = await connection.sendRawTransaction(tx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });

        console.log(`Transaction sent: ${signature}`);
        console.log(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=${config.network}`);

        // Wait for confirmation
        console.log('Waiting for confirmation...');
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
        console.log('  Platform Config Closed!');
        console.log('========================================');
        console.log(`\nRent has been returned to: ${adminKeypair.publicKey.toString()}`);
        console.log('\nYou can now run init-platform-config.js to reinitialize.');

    } catch (error) {
        console.error('\nERROR: Failed to close platform config');
        console.error(error.message);

        if (error.logs) {
            console.error('\nProgram logs:');
            error.logs.forEach(log => console.error('  ' + log));
        }

        process.exit(1);
    }
}

main().catch(console.error);
