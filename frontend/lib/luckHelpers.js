/**
 * Luck calculation helpers for the Fatebox platform
 * These are used to display time-to-max-luck projections
 *
 * IMPORTANT: These functions should receive baseLuck and maxLuck from the
 * on-chain platform config, NOT use hardcoded values. The constants below
 * are fallback defaults only.
 */

// Fallback defaults (used when config not available)
// These should match the on-chain defaults but actual values come from PlatformConfig
export const LUCK_CONSTANTS = {
    BASE_LUCK: 5,      // Fallback - actual value from onChainConfig.baseLuck
    MAX_LUCK: 60,      // Fallback - actual value from onChainConfig.maxLuck
    // Default intervals
    DEFAULT_DEVNET_INTERVAL: 3,      // 3 seconds for development
    DEFAULT_MAINNET_INTERVAL: 10800, // 3 hours for production
};

/**
 * Format a duration in seconds to a human-readable string
 * @param {number} totalSeconds - Total duration in seconds
 * @returns {string} Formatted time string
 */
export function formatDuration(totalSeconds) {
    if (totalSeconds <= 0) return '0 seconds';

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (seconds > 0 && days === 0 && hours === 0) {
        parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
    }

    return parts.join(', ') || '0 seconds';
}

/**
 * Calculate time needed to reach max luck
 * @param {number} intervalSeconds - Seconds per +1 luck
 * @param {number} baseLuck - Base luck value (from on-chain config)
 * @param {number} maxLuck - Max luck value (from on-chain config)
 * @returns {number} Total seconds to reach max luck from base luck
 */
export function calculateTimeToMaxLuck(intervalSeconds, baseLuck = LUCK_CONSTANTS.BASE_LUCK, maxLuck = LUCK_CONSTANTS.MAX_LUCK) {
    // Number of bonus luck points needed: max_luck - base_luck
    const bonusLuckNeeded = maxLuck - baseLuck;
    return bonusLuckNeeded * intervalSeconds;
}

/**
 * Format time to reach max luck as a human-readable string
 * @param {number} intervalSeconds - Seconds per +1 luck
 * @param {number} baseLuck - Base luck value (from on-chain config)
 * @param {number} maxLuck - Max luck value (from on-chain config)
 * @returns {string} Formatted time string
 */
export function formatTimeToMaxLuck(intervalSeconds, baseLuck = LUCK_CONSTANTS.BASE_LUCK, maxLuck = LUCK_CONSTANTS.MAX_LUCK) {
    if (!intervalSeconds || intervalSeconds <= 0) {
        return 'Instant';
    }

    const totalSeconds = calculateTimeToMaxLuck(intervalSeconds, baseLuck, maxLuck);
    return formatDuration(totalSeconds);
}

/**
 * Get luck tier thresholds and times
 * @param {number} intervalSeconds - Seconds per +1 luck
 * @returns {Object} Object with tier information
 */
export function getLuckTierTimes(intervalSeconds) {
    // Tier thresholds (from on-chain config)
    // Tier 1: Luck 0-5 (worst odds)
    // Tier 2: Luck 6-13
    // Tier 3: Luck 14-60 (best odds)
    return {
        tier1: {
            name: 'Tier 1 (Worst)',
            luckRange: '0-5',
            timeNeeded: 0,
            formattedTime: 'Instant',
        },
        tier2: {
            name: 'Tier 2 (Medium)',
            luckRange: '6-13',
            timeNeeded: 1 * intervalSeconds, // Need 1 bonus luck to reach 6
            formattedTime: formatDuration(1 * intervalSeconds),
        },
        tier3: {
            name: 'Tier 3 (Best)',
            luckRange: '14-60',
            timeNeeded: 9 * intervalSeconds, // Need 9 bonus luck to reach 14
            formattedTime: formatDuration(9 * intervalSeconds),
        },
        max: {
            name: 'Max Luck',
            luckRange: '60',
            timeNeeded: 55 * intervalSeconds, // Need 55 bonus luck to reach 60
            formattedTime: formatDuration(55 * intervalSeconds),
        },
    };
}

/**
 * Preset luck intervals for quick selection (excluding Platform Default which needs dynamic label)
 */
export const LUCK_INTERVAL_PRESETS = [
    { label: '1 minute', value: 60, description: '~55 min to max luck' },
    { label: '5 minutes', value: 300, description: '~4.5 hours to max luck' },
    { label: '30 minutes', value: 1800, description: '~27.5 hours to max luck' },
    { label: '1 hour', value: 3600, description: '~2.3 days to max luck' },
    { label: '3 hours', value: 10800, description: '~6.9 days to max luck' },
    { label: '6 hours', value: 21600, description: '~13.8 days to max luck' },
    { label: '12 hours', value: 43200, description: '~27.5 days to max luck' },
    { label: '1 day', value: 86400, description: '~55 days to max luck' },
];

/**
 * Get the Platform Default preset with dynamic label based on actual platform config
 * @param {number} platformDefaultInterval - The platform's default luck interval in seconds
 * @param {number} baseLuck - Base luck value (from on-chain config)
 * @param {number} maxLuck - Max luck value (from on-chain config)
 * @returns {Object} Preset object for Platform Default
 */
export function getPlatformDefaultPreset(platformDefaultInterval, baseLuck = LUCK_CONSTANTS.BASE_LUCK, maxLuck = LUCK_CONSTANTS.MAX_LUCK) {
    return {
        label: `Platform Default (${formatDuration(platformDefaultInterval)})`,
        value: 0,
        description: `Uses platform setting: ${formatTimeToMaxLuck(platformDefaultInterval, baseLuck, maxLuck)} to max luck`,
    };
}

/**
 * Get the current luck for a box based on hold time
 * @param {number} holdTimeSeconds - How long the box has been held
 * @param {number} intervalSeconds - Seconds per +1 luck
 * @param {number} baseLuck - Base luck value (from on-chain config)
 * @param {number} maxLuck - Max luck value (from on-chain config)
 * @returns {number} Current luck value (clamped to max)
 */
export function calculateCurrentLuck(holdTimeSeconds, intervalSeconds, baseLuck = LUCK_CONSTANTS.BASE_LUCK, maxLuck = LUCK_CONSTANTS.MAX_LUCK) {
    if (!intervalSeconds || intervalSeconds <= 0) return maxLuck;

    const bonusLuck = Math.floor(holdTimeSeconds / intervalSeconds);
    return Math.min(baseLuck + bonusLuck, maxLuck);
}

/**
 * Get the tier for a given luck value
 * @param {number} luck - Current luck value
 * @returns {string} Tier name
 */
export function getLuckTier(luck) {
    if (luck <= 5) return 'tier1';
    if (luck <= 13) return 'tier2';
    return 'tier3';
}
