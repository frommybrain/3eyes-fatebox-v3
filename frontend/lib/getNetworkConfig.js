// lib/getNetworkConfig.js
// Network-agnostic configuration loader
// Reads from Supabase super_admin_config table
// This allows switching from devnet → mainnet without code changes

import { supabase } from './supabase';
import { PublicKey } from '@solana/web3.js';

// Cache configuration to avoid repeated database queries
let configCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Get current network configuration from database
 * This is the SINGLE SOURCE OF TRUTH for all network-specific values
 *
 * @returns {Promise<NetworkConfig>}
 */
export async function getNetworkConfig(forceRefresh = false) {
    // Return cached config if fresh
    if (!forceRefresh && configCache && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_TTL)) {
        return configCache;
    }

    try {
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

        // Validate required fields
        if (!data.network || !data.rpc_url || !data.lootbox_program_id) {
            throw new Error('Invalid network configuration: missing required fields');
        }

        // Helper function to safely create PublicKey
        const safePublicKey = (value, fieldName) => {
            if (!value) return null;
            try {
                return new PublicKey(value);
            } catch (error) {
                console.warn(`Invalid PublicKey for ${fieldName}: ${value}. Using placeholder.`);
                // Return a placeholder PublicKey (System Program ID)
                return new PublicKey('11111111111111111111111111111111');
            }
        };

        // Parse and construct config object
        const config = {
            // Network
            network: data.network,
            rpcUrl: data.rpc_url,
            isProduction: data.is_production,
            mainnetEnabled: data.mainnet_enabled,

            // Program & Tokens - with validation
            programId: safePublicKey(data.lootbox_program_id, 'lootbox_program_id'),
            lootboxProgramId: safePublicKey(data.lootbox_program_id, 'lootbox_program_id'), // Alias for compatibility
            threeEyesMint: safePublicKey(data.three_eyes_mint, 'three_eyes_mint'),
            platformFeeAccount: safePublicKey(data.platform_fee_account, 'platform_fee_account'),

            // Fees (raw values)
            launchFeeAmount: data.launch_fee_amount, // bigint
            withdrawalFeePercentage: parseFloat(data.withdrawal_fee_percentage),

            // Platform settings
            minBoxPrice: data.min_box_price,
            maxProjectsPerWallet: data.max_projects_per_wallet,

            // Game settings
            luckIntervalSeconds: data.luck_interval_seconds ?? 3, // Default 3 seconds for dev

            // Project creation settings
            vaultFundAmount: data.vault_fund_amount, // Required vault funding for project creation

            // Admin
            adminWallet: safePublicKey(data.admin_wallet, 'admin_wallet'),

            // Raw data (for debugging)
            _raw: data,
        };

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

        throw error;
    }
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
