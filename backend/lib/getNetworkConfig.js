// lib/getNetworkConfig.js
// Fetch network configuration from database

import { PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

/**
 * Get network configuration from database
 * This is the single source of truth for network settings
 *
 * @returns {Promise<Object>} Network configuration object
 * @throws {Error} If config cannot be loaded
 */
export async function getNetworkConfig() {
    try {
        const { data, error } = await supabase
            .from('super_admin_config')
            .select('*')
            .eq('id', 1)
            .single();

        if (error) throw error;
        if (!data) throw new Error('Network configuration not found in database');

        // Parse and return config
        return {
            // Network settings
            network: data.network,
            rpcUrl: data.rpc_url,
            isProduction: data.network === 'mainnet',

            // Program addresses
            programId: new PublicKey(data.lootbox_program_id),
            threeEyesMint: new PublicKey(data.three_eyes_mint),
            adminWallet: new PublicKey(data.admin_wallet),
            platformFeeAccount: new PublicKey(data.platform_fee_account),

            // Fee configuration
            launchFeeAmount: BigInt(data.launch_fee_amount),
            withdrawalFeePercentage: parseFloat(data.withdrawal_fee_percentage),

            // Platform status
            platformActive: data.platform_active,
            maintenanceMode: data.maintenance_mode,

            // Game settings
            luckIntervalSeconds: data.luck_interval_seconds ?? 3, // Default 3 seconds for dev

            // Project creation settings
            vaultFundAmount: BigInt(data.vault_fund_amount || '50000000000000000'), // Required vault funding for project creation (default 50M with 9 decimals)

            // Raw data (for backward compatibility)
            raw: data,
        };
    } catch (error) {
        console.error('Failed to load network configuration:', error);
        throw new Error(`Failed to load network configuration: ${error.message}`);
    }
}

/**
 * Verify environment matches network configuration
 * Fails fast if production config is used in development environment
 */
export async function verifyEnvironment() {
    const config = await getNetworkConfig();

    if (config.network === 'mainnet' && process.env.NODE_ENV !== 'production') {
        console.error('⚠️  CRITICAL: Network is mainnet but NODE_ENV is not production!');
        console.error('   This could result in mainnet transactions from a dev environment.');
        console.error('   Update database to use devnet, or set NODE_ENV=production');
        process.exit(1);
    }

    console.log(`✅ Environment verified: ${config.network} (${process.env.NODE_ENV || 'development'})`);
}
