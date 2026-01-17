// lib/getNetworkConfig.js
// Network-agnostic configuration loader
// Fetches from backend API which reads on-chain config as source of truth
// Falls back to Supabase database for network settings

import { supabase } from './supabase';
import { PublicKey } from '@solana/web3.js';

// Cache configuration to avoid repeated API calls
let configCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Get current network configuration
 * Fetches from backend API which reads on-chain config as source of truth
 *
 * @returns {Promise<NetworkConfig>}
 */
export async function getNetworkConfig(forceRefresh = false) {
    // Return cached config if fresh
    if (!forceRefresh && configCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_TTL)) {
        return configCache;
    }

    try {
        // Fetch from backend API (which reads on-chain + database)
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
        const response = await fetch(`${backendUrl}/api/config`);

        if (!response.ok) {
            throw new Error(`Failed to fetch config from backend: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success || !result.config) {
            throw new Error(result.error || 'Invalid config response from backend');
        }

        const data = result.config;

        // Helper function to safely create PublicKey
        const safePublicKey = (value, fieldName) => {
            if (!value) return null;
            try {
                return new PublicKey(value);
            } catch (error) {
                console.warn(`Invalid PublicKey for ${fieldName}: ${value}. Using placeholder.`);
                return new PublicKey('11111111111111111111111111111111');
            }
        };

        // Parse and construct config object
        const config = {
            // Network info
            network: data.network,
            isProduction: data.network === 'mainnet' || data.network === 'mainnet-beta',

            // Program ID
            programId: safePublicKey(data.programId, 'programId'),
            lootboxProgramId: safePublicKey(data.programId, 'programId'), // Alias for compatibility

            // Platform status
            paused: data.paused,
            maintenanceMode: data.maintenanceMode,

            // Luck settings (from on-chain)
            baseLuck: data.baseLuck,
            maxLuck: data.maxLuck,
            luckIntervalSeconds: data.luckIntervalSeconds,

            // Payout multipliers (from on-chain)
            payoutMultipliers: data.payoutMultipliers,

            // Tier probabilities (from on-chain)
            tierProbabilities: data.tierProbabilities,

            // Platform commission (from on-chain)
            platformCommissionBps: data.platformCommissionBps,
            platformCommissionPercent: data.platformCommissionPercent,

            // Admin wallet (from on-chain or database via backend)
            adminWallet: safePublicKey(data.adminWallet, 'adminWallet'),

            // Metadata
            source: data.source, // 'on-chain' or 'database-fallback'

            // For components that still need these (will fetch from database as fallback)
            _needsDatabaseFallback: true,
        };

        // Fetch additional fields from database (RPC URL, mints, etc. not in on-chain config)
        try {
            const { data: dbData } = await supabase
                .from('super_admin_config')
                .select('rpc_url, three_eyes_mint, platform_fee_account, admin_wallet, launch_fee_amount')
                .single();

            if (dbData) {
                config.rpcUrl = dbData.rpc_url;
                config.threeEyesMint = safePublicKey(dbData.three_eyes_mint, 'three_eyes_mint');
                config.platformFeeAccount = safePublicKey(dbData.platform_fee_account, 'platform_fee_account');
                // Only use database adminWallet if not already set from API
                if (!config.adminWallet) {
                    config.adminWallet = safePublicKey(dbData.admin_wallet, 'admin_wallet');
                }
                config.launchFeeAmount = dbData.launch_fee_amount;
            }
        } catch (dbError) {
            console.warn('Could not fetch additional config from database:', dbError.message);
        }

        // Update cache
        configCache = config;
        cacheTimestamp = Date.now();

        return config;

    } catch (error) {
        console.error('Error fetching network config:', error);

        // If we have a cached config, return it even if expired
        if (configCache) {
            console.warn('Using expired config cache due to fetch error');
            return configCache;
        }

        // Last resort: try to fetch directly from database
        console.warn('Falling back to direct database fetch...');
        return fetchConfigFromDatabase();
    }
}

/**
 * Fallback function to fetch config directly from database
 * Used when backend API is unavailable
 */
async function fetchConfigFromDatabase() {
    const { data, error } = await supabase
        .from('super_admin_config')
        .select('*')
        .single();

    if (error) {
        throw new Error(`Failed to fetch network config: ${error.message}`);
    }

    if (!data) {
        throw new Error('No network configuration found in database');
    }

    const safePublicKey = (value) => {
        if (!value) return null;
        try {
            return new PublicKey(value);
        } catch {
            return new PublicKey('11111111111111111111111111111111');
        }
    };

    const config = {
        network: data.network,
        rpcUrl: data.rpc_url,
        isProduction: data.network === 'mainnet' || data.network === 'mainnet-beta',
        programId: safePublicKey(data.lootbox_program_id, 'lootbox_program_id'),
        lootboxProgramId: safePublicKey(data.lootbox_program_id, 'lootbox_program_id'),
        threeEyesMint: safePublicKey(data.three_eyes_mint, 'three_eyes_mint'),
        platformFeeAccount: safePublicKey(data.platform_fee_account, 'platform_fee_account'),
        launchFeeAmount: data.launch_fee_amount,
        luckIntervalSeconds: data.luck_interval_seconds ?? 3,
        adminWallet: safePublicKey(data.admin_wallet, 'admin_wallet'),
        platformCommissionBps: data.platform_commission_bps ?? 500,
        platformCommissionPercent: (data.platform_commission_bps ?? 500) / 100,
        source: 'database-fallback',
    };

    configCache = config;
    cacheTimestamp = Date.now();

    return config;
}

/**
 * Get network config synchronously (must be called after initial load)
 * @returns {NetworkConfig | null}
 */
export function getNetworkConfigSync() {
    if (!configCache) {
        console.warn('Network config not loaded yet. Call getNetworkConfig() first.');
        return null;
    }
    return configCache;
}

/**
 * Clear config cache (useful for immediate refresh)
 */
export function clearNetworkConfigCache() {
    configCache = null;
    cacheTimestamp = null;
}

/**
 * Get network display name
 * @param {string} network - 'devnet' or 'mainnet-beta'
 * @returns {string}
 */
export function getNetworkDisplayName(network) {
    switch (network) {
        case 'devnet':
            return 'Devnet (Testing)';
        case 'mainnet-beta':
            return 'Mainnet';
        default:
            return network;
    }
}

/**
 * Get network badge color
 * @param {string} network
 * @returns {string} - Tailwind color class
 */
export function getNetworkBadgeColor(network) {
    return network === 'devnet' ? 'bg-yellow-500' : 'bg-green-500';
}

/**
 * Generate subdomain with network prefix (for devnet)
 * @param {string} requestedSubdomain - User's requested subdomain
 * @param {string} network - 'devnet' or 'mainnet-beta'
 * @returns {string}
 */
export function generateSubdomain(requestedSubdomain, network) {
    if (network === 'devnet') {
        return `devnet-${requestedSubdomain}`;
    }
    return requestedSubdomain;
}

/**
 * Get the full URL for a project page
 * Uses NEXT_PUBLIC_PLATFORM_URL if set, otherwise detects localhost vs production
 * @param {string} subdomain - Project subdomain (e.g., 'devnet-myproject')
 * @returns {string} - Full project URL
 */
export function getProjectUrl(subdomain) {
    // Check for explicit platform URL in env
    const platformUrl = process.env.NEXT_PUBLIC_PLATFORM_URL;
    if (platformUrl) {
        return `${platformUrl}/project/${subdomain}`;
    }

    // Detect localhost in browser
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        return `http://localhost:3000/project/${subdomain}`;
    }

    // Production default
    return `https://${subdomain}.degenbox.fun`;
}

/**
 * Check if subdomain is reserved
 * @param {string} subdomain
 * @returns {Promise<boolean>}
 */
export async function isSubdomainReserved(subdomain) {
    const { data, error } = await supabase
        .from('reserved_subdomains')
        .select('subdomain')
        .eq('subdomain', subdomain.toLowerCase())
        .maybeSingle();

    // PGRST205 = table doesn't exist (skip check if table not created yet)
    if (error) {
        if (error.code === 'PGRST205') {
            // Table doesn't exist yet, skip reserved check
            return false;
        }
        console.error('Error checking reserved subdomain:', error);
        return false;
    }

    return !!data;
}

/**
 * Check if subdomain is available (not taken and not reserved)
 * @param {string} subdomain - WITHOUT network prefix
 * @param {string} network
 * @returns {Promise<{available: boolean, reason?: string}>}
 */
export async function checkSubdomainAvailability(subdomain, network) {
    const normalizedSubdomain = subdomain.toLowerCase().trim();

    // Validate format
    const subdomainRegex = /^[a-z0-9-]{3,63}$/;
    if (!subdomainRegex.test(normalizedSubdomain)) {
        return {
            available: false,
            reason: 'Subdomain must be 3-63 characters, lowercase letters, numbers, and hyphens only'
        };
    }

    // Check if reserved
    const isReserved = await isSubdomainReserved(normalizedSubdomain);
    if (isReserved) {
        return {
            available: false,
            reason: 'This subdomain is reserved for platform use'
        };
    }

    // Generate full subdomain with network prefix
    const fullSubdomain = generateSubdomain(normalizedSubdomain, network);

    // Check if already taken (use maybeSingle to avoid 406 errors)
    const { data, error } = await supabase
        .from('projects')
        .select('subdomain')
        .eq('subdomain', fullSubdomain)
        .maybeSingle();

    if (error) {
        console.error('Error checking subdomain availability:', error);
        return {
            available: false,
            reason: 'Error checking availability. Please try again.'
        };
    }

    if (data) {
        return {
            available: false,
            reason: 'This subdomain is already taken'
        };
    }

    return { available: true };
}

/**
 * Subscribe to network config changes (realtime)
 * @param {Function} callback - Called when config changes
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToNetworkConfig(callback) {
    const channel = supabase
        .channel('network-config-changes')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'super_admin_config'
            },
            async (payload) => {
                console.log('Network config changed:', payload);
                // Clear cache and fetch new config
                clearNetworkConfigCache();
                const newConfig = await getNetworkConfig(true);
                callback(newConfig);
            }
        )
        .subscribe();

    // Return unsubscribe function
    return () => {
        supabase.removeChannel(channel);
    };
}

// Export type for TypeScript (if needed later)
/**
 * @typedef {Object} NetworkConfig
 * @property {string} network - 'devnet' or 'mainnet-beta'
 * @property {string} rpcUrl - RPC endpoint URL
 * @property {boolean} isProduction - Production mode flag
 * @property {boolean} mainnetEnabled - Mainnet enabled flag
 * @property {PublicKey} programId - DegenBox program ID
 * @property {PublicKey} threeEyesMint - $3EYES token mint
 * @property {PublicKey} platformFeeAccount - Platform fee collection account
 * @property {bigint} launchFeeAmount - Launch fee in token units
 * @property {number} withdrawalFeePercentage - Withdrawal fee percentage (0-100)
 * @property {bigint} minBoxPrice - Minimum box price
 * @property {number} maxProjectsPerWallet - Max projects per creator
 * @property {PublicKey} adminWallet - Super admin wallet
 */
