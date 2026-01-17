// lib/platformConfig.js
// Platform configuration fetcher - on-chain as source of truth, database as fallback/cache
//
// This module provides a unified way to fetch platform configuration.
// Priority: On-chain PlatformConfig PDA > Database super_admin_config (fallback)

import { Connection, PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import { derivePlatformConfigPDA } from './pdaHelpers.js';

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Cache for config to reduce RPC calls (5 minute TTL)
let configCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Parse on-chain PlatformConfig account data
 *
 * Account structure (from lib.rs):
 * - admin: Pubkey (32 bytes)
 * - initialized: bool (1 byte)
 * - paused: bool (1 byte)
 * - base_luck: u8 (1 byte)
 * - max_luck: u8 (1 byte)
 * - luck_time_interval: i64 (8 bytes)
 * - payout_dud: u32 (4 bytes) - basis points * 10000
 * - payout_rebate: u32 (4 bytes)
 * - payout_breakeven: u32 (4 bytes)
 * - payout_profit: u32 (4 bytes)
 * - payout_jackpot: u32 (4 bytes)
 * - tier1_max_luck: u8 (1 byte)
 * - tier1_dud: u16 (2 bytes) - basis points (100 = 1%)
 * - tier1_rebate: u16 (2 bytes)
 * - tier1_breakeven: u16 (2 bytes)
 * - tier1_profit: u16 (2 bytes)
 * - tier2_max_luck: u8 (1 byte)
 * - tier2_dud: u16 (2 bytes)
 * - tier2_rebate: u16 (2 bytes)
 * - tier2_breakeven: u16 (2 bytes)
 * - tier2_profit: u16 (2 bytes)
 * - tier3_dud: u16 (2 bytes)
 * - tier3_rebate: u16 (2 bytes)
 * - tier3_breakeven: u16 (2 bytes)
 * - tier3_profit: u16 (2 bytes)
 * - platform_commission_bps: u16 (2 bytes)
 * - treasury_bump: u8 (1 byte)
 * - updated_at: i64 (8 bytes)
 *
 * @param {Buffer} data - Raw account data (includes 8-byte discriminator)
 * @returns {Object} Parsed config object
 */
function parseOnChainConfig(data) {
    let offset = 8; // Skip 8-byte Anchor discriminator

    // Admin pubkey (32 bytes)
    const admin = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;

    // Boolean flags (1 byte each)
    const initialized = data[offset] === 1;
    offset += 1;
    const paused = data[offset] === 1;
    offset += 1;

    // Luck parameters
    const baseLuck = data[offset];
    offset += 1;
    const maxLuck = data[offset];
    offset += 1;
    const luckTimeInterval = data.readBigInt64LE(offset);
    offset += 8;

    // Payout multipliers (u32, stored as basis points * 10000)
    // e.g., 10000 = 1.0x, 5000 = 0.5x, 40000 = 4.0x
    const payoutDud = data.readUInt32LE(offset) / 10000;
    offset += 4;
    const payoutRebate = data.readUInt32LE(offset) / 10000;
    offset += 4;
    const payoutBreakeven = data.readUInt32LE(offset) / 10000;
    offset += 4;
    const payoutProfit = data.readUInt32LE(offset) / 10000;
    offset += 4;
    const payoutJackpot = data.readUInt32LE(offset) / 10000;
    offset += 4;

    // Tier 1 probabilities (u8 maxLuck + 4x u16 percentages as basis points)
    const tier1MaxLuck = data[offset];
    offset += 1;
    const tier1Dud = data.readUInt16LE(offset) / 100; // Convert basis points to percentage
    offset += 2;
    const tier1Rebate = data.readUInt16LE(offset) / 100;
    offset += 2;
    const tier1Breakeven = data.readUInt16LE(offset) / 100;
    offset += 2;
    const tier1Profit = data.readUInt16LE(offset) / 100;
    offset += 2;

    // Tier 2 probabilities
    const tier2MaxLuck = data[offset];
    offset += 1;
    const tier2Dud = data.readUInt16LE(offset) / 100;
    offset += 2;
    const tier2Rebate = data.readUInt16LE(offset) / 100;
    offset += 2;
    const tier2Breakeven = data.readUInt16LE(offset) / 100;
    offset += 2;
    const tier2Profit = data.readUInt16LE(offset) / 100;
    offset += 2;

    // Tier 3 probabilities (no maxLuck - it's implied as maxLuck)
    const tier3Dud = data.readUInt16LE(offset) / 100;
    offset += 2;
    const tier3Rebate = data.readUInt16LE(offset) / 100;
    offset += 2;
    const tier3Breakeven = data.readUInt16LE(offset) / 100;
    offset += 2;
    const tier3Profit = data.readUInt16LE(offset) / 100;
    offset += 2;

    // Platform commission and treasury
    const platformCommissionBps = data.readUInt16LE(offset);
    offset += 2;
    const treasuryBump = data[offset];
    offset += 1;

    // Updated at timestamp
    const updatedAt = data.readBigInt64LE(offset);

    return {
        // Core settings
        admin: admin.toString(),
        initialized,
        paused,

        // Luck settings
        baseLuck,
        maxLuck,
        luckTimeInterval: Number(luckTimeInterval),

        // Payout multipliers (as decimals, e.g., 0.5 for 50%)
        payoutMultipliers: {
            dud: payoutDud,
            rebate: payoutRebate,
            breakeven: payoutBreakeven,
            profit: payoutProfit,
            jackpot: payoutJackpot,
        },

        // Tier probabilities (as percentages, e.g., 44 for 44%)
        tierProbabilities: {
            tier1: {
                maxLuck: tier1MaxLuck,
                dud: tier1Dud,
                rebate: tier1Rebate,
                breakeven: tier1Breakeven,
                profit: tier1Profit,
                // Jackpot is calculated: 100 - dud - rebate - breakeven - profit
                jackpot: Math.max(0, 100 - tier1Dud - tier1Rebate - tier1Breakeven - tier1Profit),
            },
            tier2: {
                maxLuck: tier2MaxLuck,
                dud: tier2Dud,
                rebate: tier2Rebate,
                breakeven: tier2Breakeven,
                profit: tier2Profit,
                jackpot: Math.max(0, 100 - tier2Dud - tier2Rebate - tier2Breakeven - tier2Profit),
            },
            tier3: {
                dud: tier3Dud,
                rebate: tier3Rebate,
                breakeven: tier3Breakeven,
                profit: tier3Profit,
                jackpot: Math.max(0, 100 - tier3Dud - tier3Rebate - tier3Breakeven - tier3Profit),
            },
        },

        // Platform fees
        platformCommissionBps,
        platformCommissionPercent: platformCommissionBps / 100, // e.g., 500 bps = 5%
        treasuryBump,

        // Metadata
        updatedAt: Number(updatedAt),
        source: 'on-chain',
    };
}

/**
 * Fetch database config as fallback
 * @returns {Promise<Object|null>} Database config or null
 */
async function fetchDatabaseConfig() {
    try {
        const { data, error } = await supabase
            .from('super_admin_config')
            .select('*')
            .eq('id', 1)
            .single();

        if (error || !data) return null;

        return {
            // Network settings (only in database)
            network: data.network,
            rpcUrl: data.rpc_url,
            programId: data.lootbox_program_id,
            threeEyesMint: data.three_eyes_mint,
            adminWallet: data.admin_wallet,
            platformFeeAccount: data.platform_fee_account,

            // Fee configuration
            launchFeeAmount: BigInt(data.launch_fee_amount || 0),

            // Platform status
            platformActive: data.platform_active,
            maintenanceMode: data.maintenance_mode,

            // Luck settings (fallback)
            luckTimeInterval: data.luck_interval_seconds ?? 3,

            // Platform commission (fallback)
            platformCommissionBps: data.platform_commission_bps ?? 500,
            platformCommissionPercent: (data.platform_commission_bps ?? 500) / 100,

            // Dev wallet for treasury processing
            devCutBps: data.dev_cut_bps ?? 1000,
            devWallet: data.dev_wallet,
            treasuryPda: data.treasury_pda,

            source: 'database',
        };
    } catch (error) {
        console.error('Failed to fetch database config:', error.message);
        return null;
    }
}

/**
 * Fetch on-chain platform config
 * @param {string} rpcUrl - RPC URL
 * @param {string} programIdStr - Program ID as string
 * @returns {Promise<Object|null>} On-chain config or null
 */
async function fetchOnChainConfig(rpcUrl, programIdStr) {
    try {
        const connection = new Connection(rpcUrl, 'confirmed');
        const programId = new PublicKey(programIdStr);
        const [platformConfigPDA] = derivePlatformConfigPDA(programId);

        const accountInfo = await connection.getAccountInfo(platformConfigPDA);
        if (!accountInfo) {
            console.log('   PlatformConfig PDA not found on-chain');
            return null;
        }

        return parseOnChainConfig(accountInfo.data);
    } catch (error) {
        console.error('Failed to fetch on-chain config:', error.message);
        return null;
    }
}

/**
 * Get platform configuration
 * Priority: On-chain (source of truth) > Database (fallback/cache)
 *
 * This function merges on-chain config with database config:
 * - On-chain provides: luck settings, payout multipliers, tier probabilities, commission rates
 * - Database provides: network settings (RPC URL, program ID), launch fees, dev wallet
 *
 * @param {Object} options - Options
 * @param {boolean} options.forceRefresh - Force refresh from sources (bypass cache)
 * @returns {Promise<Object>} Merged platform configuration
 */
export async function getPlatformConfig({ forceRefresh = false } = {}) {
    // Check cache first (unless force refresh)
    const now = Date.now();
    if (!forceRefresh && configCache && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return configCache;
    }

    // Always need database config for network settings (RPC URL, program ID)
    const dbConfig = await fetchDatabaseConfig();
    if (!dbConfig) {
        throw new Error('Database configuration not found - cannot determine network settings');
    }

    // Fetch on-chain config using database's RPC URL and program ID
    const onChainConfig = await fetchOnChainConfig(dbConfig.rpcUrl, dbConfig.programId);

    // Merge configs: on-chain takes priority for game settings
    const mergedConfig = {
        // Network settings (database only)
        network: dbConfig.network,
        rpcUrl: dbConfig.rpcUrl,
        isProduction: dbConfig.network === 'mainnet',
        programId: dbConfig.programId,
        threeEyesMint: dbConfig.threeEyesMint,
        adminWallet: onChainConfig?.admin || dbConfig.adminWallet,
        platformFeeAccount: dbConfig.platformFeeAccount,

        // Platform status
        platformActive: dbConfig.platformActive,
        maintenanceMode: dbConfig.maintenanceMode,
        paused: onChainConfig?.paused ?? false,

        // Launch fee (database only - not on-chain)
        launchFeeAmount: dbConfig.launchFeeAmount,

        // Dev wallet for treasury processing (database only)
        devCutBps: dbConfig.devCutBps,
        devWallet: dbConfig.devWallet,
        treasuryPda: dbConfig.treasuryPda,

        // Luck settings (on-chain preferred)
        baseLuck: onChainConfig?.baseLuck ?? 5,
        maxLuck: onChainConfig?.maxLuck ?? 60,
        luckTimeInterval: onChainConfig?.luckTimeInterval ?? dbConfig.luckTimeInterval ?? 3,

        // Payout multipliers (on-chain only - these define the game economics)
        payoutMultipliers: onChainConfig?.payoutMultipliers ?? {
            dud: 0,
            rebate: 0.5,
            breakeven: 1,
            profit: 1.5,
            jackpot: 4,
        },

        // Tier probabilities (on-chain only - these define the game economics)
        tierProbabilities: onChainConfig?.tierProbabilities ?? {
            tier1: { maxLuck: 5, dud: 0, rebate: 72, breakeven: 17, profit: 9, jackpot: 2 },
            tier2: { maxLuck: 13, dud: 0, rebate: 57, breakeven: 26, profit: 15, jackpot: 2 },
            tier3: { dud: 0, rebate: 44, breakeven: 34, profit: 20, jackpot: 2 },
        },

        // Platform commission (on-chain preferred)
        platformCommissionBps: onChainConfig?.platformCommissionBps ?? dbConfig.platformCommissionBps ?? 500,
        platformCommissionPercent: onChainConfig?.platformCommissionPercent ?? dbConfig.platformCommissionPercent ?? 5,
        treasuryBump: onChainConfig?.treasuryBump ?? 0,

        // Metadata
        onChainUpdatedAt: onChainConfig?.updatedAt ?? null,
        source: onChainConfig ? 'on-chain' : 'database-fallback',
        fetchedAt: now,
    };

    // Update cache
    configCache = mergedConfig;
    cacheTimestamp = now;

    return mergedConfig;
}

/**
 * Clear the config cache (useful for admin updates)
 */
export function clearConfigCache() {
    configCache = null;
    cacheTimestamp = 0;
}

/**
 * Get just the network config (for backward compatibility with getNetworkConfig)
 * This is a lighter version that prioritizes database for network settings
 *
 * @returns {Promise<Object>} Network configuration
 */
export async function getNetworkConfig() {
    const config = await getPlatformConfig();

    // Return in the format expected by existing code
    return {
        network: config.network,
        rpcUrl: config.rpcUrl,
        isProduction: config.isProduction,
        programId: new PublicKey(config.programId),
        threeEyesMint: new PublicKey(config.threeEyesMint),
        adminWallet: new PublicKey(config.adminWallet),
        platformFeeAccount: new PublicKey(config.platformFeeAccount),
        launchFeeAmount: config.launchFeeAmount,
        platformActive: config.platformActive,
        maintenanceMode: config.maintenanceMode,
        luckIntervalSeconds: config.luckTimeInterval,
        platformCommissionBps: config.platformCommissionBps,

        // Include game settings for convenience
        baseLuck: config.baseLuck,
        maxLuck: config.maxLuck,
        payoutMultipliers: config.payoutMultipliers,
        tierProbabilities: config.tierProbabilities,

        // Metadata
        source: config.source,
    };
}

/**
 * Verify environment matches network configuration
 * Fails fast if production config is used in development environment
 */
export async function verifyEnvironment() {
    const config = await getPlatformConfig();

    if (config.network === 'mainnet' && process.env.NODE_ENV !== 'production') {
        console.error('⚠️  CRITICAL: Network is mainnet but NODE_ENV is not production!');
        console.error('   This could result in mainnet transactions from a dev environment.');
        console.error('   Update database to use devnet, or set NODE_ENV=production');
        process.exit(1);
    }

    console.log(`✅ Environment verified: ${config.network} (${process.env.NODE_ENV || 'development'})`);
    console.log(`   Config source: ${config.source}`);
    if (config.source === 'on-chain') {
        console.log(`   Luck interval: ${config.luckTimeInterval}s`);
        console.log(`   Commission: ${config.platformCommissionPercent}%`);
    }
}

export default {
    getPlatformConfig,
    getNetworkConfig,
    clearConfigCache,
    verifyEnvironment,
};
