// lib/switchboard.js
// Switchboard VRF on-demand helpers for provable randomness

import { PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Queue, Randomness } from '@switchboard-xyz/on-demand';
import { getNetworkConfig } from './getNetworkConfig.js';

// Switchboard On-Demand Program IDs and Queues
// From: https://docs.switchboard.xyz/docs/switchboard/on-demand-randomness
const SWITCHBOARD_CONSTANTS = {
    devnet: {
        programId: new PublicKey('Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2'),
        queue: new PublicKey('EYiAmGSdsQTuCw413V5BzaruWuCCSDgTPtBGvLkXHbe7'),
    },
    mainnet: {
        programId: new PublicKey('SBondMDrcV3K4kxZR1HNVT7osZxAHVHgYXL5Ze1oMUv'),
        queue: new PublicKey('A43DyUGA7s8eXPxqEjJY6EBu1KKbNgfxF8h17VAHn13w'),
    }
};

/**
 * Get Switchboard constants for current network
 * @param {string} network - 'devnet' or 'mainnet'
 * @returns {Object} Switchboard program ID and queue
 */
export function getSwitchboardConstants(network = 'devnet') {
    const normalizedNetwork = network === 'mainnet-beta' ? 'mainnet' : network;
    const constants = SWITCHBOARD_CONSTANTS[normalizedNetwork] || SWITCHBOARD_CONSTANTS.devnet;

    console.log(`\n[Switchboard] Using ${normalizedNetwork} constants:`);
    console.log(`   Program ID: ${constants.programId.toString()}`);
    console.log(`   Queue: ${constants.queue.toString()}`);

    return {
        programId: constants.programId,
        queue: constants.queue,
    };
}

/**
 * Get Switchboard program instance
 * @param {Object} provider - Anchor provider
 * @param {string} network - Network name
 * @returns {Promise<Program>} Switchboard program
 */
export async function getSwitchboardProgram(provider, network = 'devnet') {
    const { programId } = getSwitchboardConstants(network);
    return await anchor.Program.at(programId, provider);
}

/**
 * Create a new Switchboard randomness account
 * Returns the keypair and instruction for creating the account
 *
 * @param {Object} provider - Anchor provider
 * @param {string} network - Network name
 * @param {PublicKey} payer - The payer for the randomness account creation (buyer's wallet)
 * @returns {Promise<Object>} { keypair, randomness, createInstruction }
 */
export async function createRandomnessAccount(provider, network = 'devnet', payer) {
    console.log(`\n[Switchboard] Creating randomness account...`);
    console.log(`   Payer: ${payer ? payer.toString() : 'provider wallet (default)'}`);

    const { queue } = getSwitchboardConstants(network);
    const sbProgram = await getSwitchboardProgram(provider, network);

    // Generate a new keypair for the randomness account
    const rngKeypair = Keypair.generate();

    // Create the randomness account and get the instruction
    // Pass payer as the 4th argument so buyer pays, not backend wallet
    const [randomness, createInstruction] = await Randomness.create(
        sbProgram,
        rngKeypair,
        queue,
        payer  // Buyer pays for account creation
    );

    console.log(`   Randomness account: ${randomness.pubkey.toString()}`);
    console.log(`   Queue: ${queue.toString()}`);

    return {
        keypair: rngKeypair,
        randomness,
        createInstruction,
        publicKey: randomness.pubkey,
    };
}

/**
 * Create a commit instruction for requesting randomness
 * Pass authority explicitly to avoid needing to fetch account data
 * (account may not exist yet if we're batching create + commit in one tx)
 *
 * @param {Object} randomness - Switchboard Randomness instance
 * @param {string} network - Network name
 * @param {PublicKey} authority - The authority (payer) for the randomness account
 * @returns {Promise<TransactionInstruction>} Commit instruction
 */
export async function createCommitInstruction(randomness, network = 'devnet', authority) {
    console.log(`[Switchboard] Creating commit instruction...`);
    console.log(`   Authority: ${authority.toString()}`);

    const { queue } = getSwitchboardConstants(network);

    // Pass authority explicitly to avoid loadData() call on non-existent account
    const commitIx = await randomness.commitIx(queue, authority);

    return commitIx;
}

/**
 * Create a reveal instruction for revealing randomness
 * This should be called after waiting 5-10 seconds for oracles to process
 * Uses SDK method which contacts the specific oracle that committed the randomness.
 *
 * NOTE: Devnet oracles can be unreliable (503 errors, timeouts). The function
 * includes retry logic with exponential backoff for transient failures.
 *
 * @param {Object} randomness - Switchboard Randomness instance
 * @param {PublicKey} payer - The payer for the reveal transaction (buyer's wallet)
 * @param {string} network - Network name ('devnet' or 'mainnet')
 * @param {number} maxRetries - Maximum number of retry attempts (default: 3)
 * @returns {Promise<TransactionInstruction>} Reveal instruction
 */
export async function createRevealInstruction(randomness, payer, network = 'devnet', maxRetries = 3) {
    console.log(`[Switchboard] Creating reveal instruction...`);
    console.log(`   Randomness pubkey: ${randomness.pubkey.toString()}`);
    console.log(`   Payer: ${payer ? payer.toString() : 'provider wallet (default)'}`);
    console.log(`   Network: ${network}`);

    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // IMPORTANT: Only use SDK method (revealIx) - DO NOT use crossbar fallback!
            // The crossbar fetches from a DIFFERENT oracle than the one that committed,
            // which causes InvalidSecpSignature errors (0x1780).
            // The SDK method uses the original oracle that committed the randomness.
            let revealIx;
            console.log(`   Attempt ${attempt}/${maxRetries}: Trying SDK revealIx...`);

            try {
                revealIx = await randomness.revealIx(payer);
                console.log(`   SDK revealIx succeeded!`);
            } catch (sdkError) {
                // Log the error but DON'T use crossbar - it will cause InvalidSecpSignature
                console.log(`   SDK failed: ${sdkError.message}`);

                // If it's a 503 or timeout, we should retry the SDK method with exponential backoff
                const isRetryable = sdkError.message?.includes('503') ||
                    sdkError.message?.includes('timeout') ||
                    sdkError.message?.includes('ETIMEDOUT') ||
                    sdkError.message?.includes('ECONNREFUSED') ||
                    sdkError.message?.includes('Service Unavailable') ||
                    sdkError.message?.includes('ENOTFOUND');

                if (isRetryable && attempt < maxRetries) {
                    // Delays for devnet: 3s, 6s, 9s
                    const delayMs = attempt * 3000;
                    console.log(`   Oracle unavailable. Waiting ${delayMs/1000}s before retry ${attempt + 1}/${maxRetries}...`);
                    await new Promise(resolve => setTimeout(resolve, delayMs));
                    continue; // Go to next attempt
                }

                throw sdkError;
            }

            // Replace any signer that matches the backend wallet with the buyer's wallet
            if (payer) {
                revealIx.keys = revealIx.keys.map(key => {
                    if (key.isSigner && key.isWritable &&
                        key.pubkey.toString() !== randomness.pubkey.toString()) {
                        console.log(`   Replacing payer ${key.pubkey.toString()} with buyer ${payer.toString()}`);
                        return {
                            ...key,
                            pubkey: payer,
                        };
                    }
                    return key;
                });
            }

            console.log(`   Reveal instruction created successfully`);
            console.log(`   Instruction program: ${revealIx.programId.toString()}`);
            console.log(`   Instruction keys: ${revealIx.keys.length} accounts`);

            const signers = revealIx.keys.filter(k => k.isSigner);
            console.log(`   Required signers: ${signers.map(s => s.pubkey.toString()).join(', ')}`);

            return revealIx;

        } catch (error) {
            lastError = error;
            const isNetworkError = error.code === 'ECONNREFUSED' ||
                error.code === 'ETIMEDOUT' ||
                error.code === 'ENOTFOUND' ||
                error.message?.includes('connect') ||
                error.message?.includes('timeout') ||
                error.message?.includes('503') ||
                error.message?.includes('Service Unavailable');

            if (isNetworkError && attempt < maxRetries) {
                const delayMs = attempt * 3000;
                console.log(`[Switchboard] Network error (attempt ${attempt}/${maxRetries}), retrying in ${delayMs/1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
                console.error(`[Switchboard] Error creating reveal instruction:`, error.message);
                if (attempt >= maxRetries) {
                    throw new Error(`Switchboard oracle unavailable after ${maxRetries} attempts. (${error.message})`);
                }
                throw error;
            }
        }
    }

    throw lastError;
}

/**
 * Load a Randomness instance from an existing account
 *
 * @param {Object} provider - Anchor provider
 * @param {PublicKey} randomnessAccountPubkey - Existing randomness account
 * @param {string} network - Network name
 * @returns {Promise<Randomness>} Randomness instance
 */
export async function loadRandomness(provider, randomnessAccountPubkey, network = 'devnet') {
    console.log(`[Switchboard] Loading existing randomness account: ${randomnessAccountPubkey.toString()}`);

    const sbProgram = await getSwitchboardProgram(provider, network);
    const randomness = new Randomness(sbProgram, randomnessAccountPubkey);

    return randomness;
}

/**
 * Read randomness value from a revealed Switchboard account
 *
 * Switchboard RandomnessAccountData structure (with 8-byte discriminator):
 * - 0-8: discriminator (8 bytes)
 * - 8-40: authority (32 bytes)
 * - 40-72: queue (32 bytes)
 * - 72-104: seed_slothash (32 bytes)
 * - 104-112: seed_slot (8 bytes)
 * - 112-144: oracle (32 bytes)
 * - 144-152: reveal_slot (8 bytes)
 * - 152-184: value (32 bytes) <- THIS IS THE ACTUAL RANDOMNESS
 *
 * @param {Connection} connection - Solana connection
 * @param {PublicKey} randomnessAccountPubkey - Randomness account
 * @returns {Promise<Object>} { randomBytes, randomU32, randomPercentage, revealSlot }
 */
export async function readRandomnessValue(connection, randomnessAccountPubkey) {
    console.log(`[Switchboard] Reading randomness value from: ${randomnessAccountPubkey.toString()}`);

    const accountInfo = await connection.getAccountInfo(randomnessAccountPubkey);

    if (!accountInfo) {
        throw new Error('Randomness account not found');
    }

    if (accountInfo.data.length < 184) {
        throw new Error('Randomness not ready - account data too short (need 184 bytes)');
    }

    // Check reveal_slot at offset 144-152 (8 bytes, u64 little-endian)
    const revealSlotBuffer = accountInfo.data.slice(144, 152);
    const revealSlot = revealSlotBuffer.readBigUInt64LE(0);

    if (revealSlot === 0n) {
        throw new Error('Randomness not revealed yet - reveal_slot is 0');
    }

    // Extract randomness value at offset 152-184 (32 bytes)
    const randomBytes = accountInfo.data.slice(152, 184);

    // Convert first 4 bytes to u32 for percentage calculation (matches on-chain logic)
    const randomU32 = Buffer.from(randomBytes.slice(0, 4)).readUInt32LE(0);

    // Convert to percentage (0.0 to 1.0)
    const randomPercentage = randomU32 / 0xFFFFFFFF;

    console.log(`   Reveal slot: ${revealSlot}`);
    console.log(`   Random bytes (first 8): ${randomBytes.slice(0, 8).toString('hex')}`);
    console.log(`   Random u32: ${randomU32}`);
    console.log(`   Random percentage: ${(randomPercentage * 100).toFixed(4)}%`);

    return {
        randomBytes,
        randomU32,
        randomPercentage,
        revealSlot: Number(revealSlot),
    };
}

/**
 * Wait for randomness to be revealed by Switchboard oracles
 * Polls the account until randomness data is available
 *
 * @param {Connection} connection - Solana connection
 * @param {PublicKey} randomnessAccountPubkey - Randomness account
 * @param {number} maxWaitMs - Maximum wait time in milliseconds
 * @param {number} pollIntervalMs - Poll interval in milliseconds
 * @returns {Promise<Object>} Randomness value
 */
export async function waitForRandomness(
    connection,
    randomnessAccountPubkey,
    maxWaitMs = 30000,
    pollIntervalMs = 2000
) {
    console.log(`[Switchboard] Waiting for randomness to be revealed (max ${maxWaitMs / 1000}s)...`);

    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
        try {
            const result = await readRandomnessValue(connection, randomnessAccountPubkey);

            // readRandomnessValue already checks reveal_slot > 0, so if we get here it's valid
            // Note: randomU32 could legitimately be 0 (though extremely rare: 1 in 4 billion)
            console.log(`[Switchboard] Randomness revealed after ${(Date.now() - startTime) / 1000}s`);
            return result;
        } catch (error) {
            // Continue polling if not ready
            console.log(`   Still waiting... (${Math.floor((Date.now() - startTime) / 1000)}s)`);
        }

        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Timeout waiting for randomness after ${maxWaitMs / 1000} seconds`);
}

/**
 * Serialize a keypair to base64 for frontend transmission
 *
 * @param {Keypair} keypair - Solana keypair
 * @returns {string} Base64 encoded secret key
 */
export function serializeKeypair(keypair) {
    return Buffer.from(keypair.secretKey).toString('base64');
}

/**
 * Deserialize a keypair from base64
 *
 * @param {string} base64SecretKey - Base64 encoded secret key
 * @returns {Keypair} Solana keypair
 */
export function deserializeKeypair(base64SecretKey) {
    const secretKey = Buffer.from(base64SecretKey, 'base64');
    return Keypair.fromSecretKey(secretKey);
}
