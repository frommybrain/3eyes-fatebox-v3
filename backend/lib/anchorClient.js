// lib/anchorClient.js
// Anchor TypeScript client for interacting with the deployed lootbox_platform program

import * as anchor from '@coral-xyz/anchor';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getNetworkConfig } from './getNetworkConfig.js';

// Get current directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load program IDL
const idlPath = join(__dirname, '../program/target/idl/lootbox_platform.json');
const idl = JSON.parse(readFileSync(idlPath, 'utf8'));

/**
 * Get initialized Anchor program instance
 * @returns {Promise<{program: anchor.Program, provider: anchor.AnchorProvider, connection: Connection, programId: PublicKey}>}
 */
export async function getAnchorProgram() {
    try {
        // Get network config from database
        const config = await getNetworkConfig();

        // Create connection
        const connection = new Connection(config.rpcUrl, 'confirmed');

        // Load deploy wallet keypair from environment
        if (!process.env.DEPLOY_WALLET_JSON) {
            throw new Error('DEPLOY_WALLET_JSON not found in environment variables');
        }

        const deployWalletArray = JSON.parse(process.env.DEPLOY_WALLET_JSON);
        const deployWallet = Keypair.fromSecretKey(new Uint8Array(deployWalletArray));

        // Create Anchor provider
        const provider = new anchor.AnchorProvider(
            connection,
            new anchor.Wallet(deployWallet),
            {
                commitment: 'confirmed',
                preflightCommitment: 'confirmed'
            }
        );

        // Set as default provider (recommended by Anchor docs)
        anchor.setProvider(provider);

        // Create program using 2-parameter constructor (recommended approach)
        // The programId is embedded in the IDL's address field
        const program = new anchor.Program(idl, provider);

        console.log(`✅ Anchor program initialized: ${program.programId.toString()}`);
        console.log(`   Network: ${config.network}`);
        console.log(`   Deploy wallet: ${deployWallet.publicKey.toString()}`);

        return {
            program,
            provider,
            connection,
            programId: program.programId
        };

    } catch (error) {
        console.error('Failed to initialize Anchor program:', error);
        throw error;
    }
}
