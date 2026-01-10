// lib/switchboard.js
// Switchboard VRF on-demand helpers for provable randomness

import { PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Queue, Randomness, State } from '@switchboard-xyz/on-demand';
import { CrossbarClient, CrossbarNetwork, Gateway } from '@switchboard-xyz/common';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import bs58 from 'bs58';
import { getNetworkConfig } from './getNetworkConfig.js';

// SPL Token constants
const SOL_NATIVE_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const SPL_TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');
const SPL_SYSVAR_SLOT_HASHES_ID = new PublicKey('SysvarS1otHashes111111111111111111111111111');

// Switchboard On-Demand Program IDs and Queues
// Updated from: https://docs.switchboard.xyz/docs/switchboard/on-demand-randomness
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

    return constants;
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
 * Uses crossbar service as fallback when oracle's gateway is unavailable
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
            // Try the standard SDK method first
            let revealIx;
            try {
                console.log(`   Attempt ${attempt}: Trying standard revealIx...`);
                revealIx = await randomness.revealIx(payer);
            } catch (sdkError) {
                // If the SDK method fails due to gateway issues, use crossbar fallback
                const isGatewayError = sdkError.code === 'ECONNREFUSED' ||
                    sdkError.code === 'ETIMEDOUT' ||
                    sdkError.code === 'ENOTFOUND' ||
                    sdkError.message?.includes('connect') ||
                    sdkError.message?.includes('timeout') ||
                    sdkError.message?.includes('fetchRandomnessReveal');

                if (isGatewayError) {
                    console.log(`   Standard SDK failed (${sdkError.message}), trying crossbar fallback...`);
                    revealIx = await createRevealInstructionWithCrossbar(randomness, payer, network);
                } else {
                    throw sdkError;
                }
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
                error.message?.includes('timeout');

            if (isNetworkError && attempt < maxRetries) {
                const delayMs = attempt * 2000;
                console.log(`[Switchboard] Network error (attempt ${attempt}/${maxRetries}), retrying in ${delayMs/1000}s...`);
                console.log(`   Error: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
                console.error(`[Switchboard] Error creating reveal instruction (attempt ${attempt}):`, error.message);
                if (attempt >= maxRetries) {
                    throw new Error(`Switchboard reveal failed after ${maxRetries} attempts. (${error.message})`);
                }
                throw error;
            }
        }
    }

    throw lastError;
}

/**
 * Create reveal instruction using crossbar service as gateway
 * This is a fallback when the oracle's direct gateway is unavailable
 *
 * @param {Object} randomness - Switchboard Randomness instance
 * @param {PublicKey} payer - The payer for the transaction
 * @param {string} network - Network name
 * @returns {Promise<TransactionInstruction>} Reveal instruction
 */
async function createRevealInstructionWithCrossbar(randomness, payer, network = 'devnet') {
    console.log(`[Switchboard] Using crossbar fallback for reveal...`);

    // Get crossbar gateway
    const crossbar = CrossbarClient.default();
    const crossbarNetwork = network === 'mainnet' || network === 'mainnet-beta'
        ? CrossbarNetwork.SolanaMainnet
        : CrossbarNetwork.SolanaDevnet;
    crossbar.setNetwork(crossbarNetwork);

    console.log(`   Fetching gateway from crossbar for ${crossbarNetwork}...`);
    const gateway = await crossbar.fetchGateway();
    console.log(`   Using gateway: ${gateway.gatewayUrl}`);

    // Load randomness account data
    const data = await randomness.loadData();
    console.log(`   Randomness data loaded:`);
    console.log(`     - Oracle: ${data.oracle.toString()}`);
    console.log(`     - Queue: ${data.queue.toString()}`);
    console.log(`     - Seed slot: ${data.seedSlot.toNumber()}`);

    // Fetch reveal from crossbar gateway
    const rpcEndpoint = randomness.program.provider.connection.rpcEndpoint;
    console.log(`   Fetching reveal from gateway with RPC: ${rpcEndpoint}`);

    const gatewayRevealResponse = await gateway.fetchRandomnessReveal({
        randomnessAccount: randomness.pubkey,
        slothash: bs58.encode(data.seedSlothash),
        slot: data.seedSlot.toNumber(),
        rpc: rpcEndpoint,
    });

    console.log(`   Gateway reveal response received`);
    console.log(`     - Signature length: ${gatewayRevealResponse.signature?.length || 0}`);
    console.log(`     - Recovery ID: ${gatewayRevealResponse.recovery_id}`);

    // Build the reveal instruction manually
    const stats = PublicKey.findProgramAddressSync(
        [Buffer.from('OracleRandomnessStats'), data.oracle.toBuffer()],
        randomness.program.programId
    )[0];

    const revealIx = randomness.program.instruction.randomnessReveal(
        {
            signature: Buffer.from(gatewayRevealResponse.signature, 'base64'),
            recoveryId: gatewayRevealResponse.recovery_id,
            value: gatewayRevealResponse.value,
        },
        {
            accounts: {
                randomness: randomness.pubkey,
                oracle: data.oracle,
                queue: data.queue,
                stats,
                authority: data.authority,
                payer: payer || data.authority,
                recentSlothashes: SPL_SYSVAR_SLOT_HASHES_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
                rewardEscrow: getAssociatedTokenAddressSync(SOL_NATIVE_MINT, randomness.pubkey),
                tokenProgram: SPL_TOKEN_PROGRAM_ID,
                associatedTokenProgram: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
                wrappedSolMint: SOL_NATIVE_MINT,
                programState: State.keyFromSeed(randomness.program),
            },
        }
    );

    console.log(`   Crossbar reveal instruction built successfully`);
    return revealIx;
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
 * @param {Connection} connection - Solana connection
 * @param {PublicKey} randomnessAccountPubkey - Randomness account
 * @returns {Promise<Object>} { randomBytes, randomU32, randomPercentage }
 */
export async function readRandomnessValue(connection, randomnessAccountPubkey) {
    console.log(`[Switchboard] Reading randomness value from: ${randomnessAccountPubkey.toString()}`);

    const accountInfo = await connection.getAccountInfo(randomnessAccountPubkey);

    if (!accountInfo) {
        throw new Error('Randomness account not found');
    }

    if (accountInfo.data.length < 40) {
        throw new Error('Randomness not ready - account data too short');
    }

    // Extract randomness bytes (after 8-byte discriminator)
    const randomBytes = accountInfo.data.slice(8, 40); // 32 bytes of randomness

    // Convert first 4 bytes to u32 for percentage calculation
    const randomU32 = Buffer.from(randomBytes.slice(0, 4)).readUInt32LE(0);

    // Convert to percentage (0.0 to 1.0)
    const randomPercentage = randomU32 / 0xFFFFFFFF;

    console.log(`   Random u32: ${randomU32}`);
    console.log(`   Random percentage: ${(randomPercentage * 100).toFixed(4)}%`);

    return {
        randomBytes,
        randomU32,
        randomPercentage,
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

            // Check if the randomness is actually revealed (non-zero)
            if (result.randomU32 !== 0) {
                console.log(`[Switchboard] Randomness revealed after ${(Date.now() - startTime) / 1000}s`);
                return result;
            }
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
