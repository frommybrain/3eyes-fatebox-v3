// lib/loadDeployWallet.js
// Load deploy wallet from environment variable
// Based on DEPLOY_WALLET_MANAGEMENT.md

import { Keypair } from '@solana/web3.js';

/**
 * Load deploy wallet from environment variable
 * Works in both local and production
 *
 * @returns {Keypair} The deploy wallet keypair
 * @throws {Error} If DEPLOY_WALLET_JSON is not set or invalid
 */
export function loadDeployWallet() {
    const keypairJson = process.env.DEPLOY_WALLET_JSON;

    if (!keypairJson) {
        throw new Error(
            'DEPLOY_WALLET_JSON environment variable not set. ' +
            'Generate a keypair and add it to your .env file.\n' +
            'See DEPLOY_WALLET_MANAGEMENT.md for instructions.'
        );
    }

    try {
        // Parse JSON array
        const keypairArray = JSON.parse(keypairJson);

        // Validate it's an array of numbers
        if (!Array.isArray(keypairArray) || keypairArray.length !== 64) {
            throw new Error('Invalid keypair format. Must be array of 64 numbers.');
        }

        // Create Keypair from array
        const keypair = Keypair.fromSecretKey(new Uint8Array(keypairArray));

        // Verify public key matches (if provided)
        if (process.env.DEPLOY_WALLET_PUBKEY) {
            const expectedPubkey = process.env.DEPLOY_WALLET_PUBKEY;
            const actualPubkey = keypair.publicKey.toString();

            if (expectedPubkey !== actualPubkey) {
                throw new Error(
                    `Deploy wallet public key mismatch!\n` +
                    `Expected: ${expectedPubkey}\n` +
                    `Actual: ${actualPubkey}`
                );
            }
        }

        console.log('✅ Deploy wallet loaded:', keypair.publicKey.toString());
        return keypair;

    } catch (error) {
        throw new Error(`Failed to load deploy wallet: ${error.message}`);
    }
}
