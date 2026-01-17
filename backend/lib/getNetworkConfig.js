// lib/getNetworkConfig.js
// DEPRECATED: Use platformConfig.js instead
// This file is kept for backward compatibility - it re-exports from platformConfig.js

import {
    getNetworkConfig as _getNetworkConfig,
    getPlatformConfig,
    verifyEnvironment as _verifyEnvironment,
    clearConfigCache,
} from './platformConfig.js';

/**
 * Get network configuration
 * @deprecated Use getPlatformConfig() from platformConfig.js for full config
 * @returns {Promise<Object>} Network configuration object
 */
export async function getNetworkConfig() {
    return _getNetworkConfig();
}

/**
 * Verify environment matches network configuration
 */
export async function verifyEnvironment() {
    return _verifyEnvironment();
}

// Re-export new functions for gradual migration
export { getPlatformConfig, clearConfigCache };
