// Badge configuration for trophy system
// Maps box result tiers to badge folders and counts

// Badge counts per tier (must match what's uploaded to Supabase Storage)
export const BADGE_COUNTS = {
    2: 570,   // Rebate (0.5x) - 570 badges
    3: 260,   // Break-even (1x) - 260 badges
    4: 150,   // Profit (1.5x) - 150 badges
    5: 20,    // Jackpot (4x) - 20 badges
};

// Tier to folder mapping (for constructing URLs)
export const TIER_FOLDERS = {
    2: '0.5x',    // Rebate
    3: '1x',      // Break-even
    4: '1.5x',    // Profit
    5: '4x',      // Jackpot
};

// Tier to filename prefix mapping
export const TIER_PREFIXES = {
    2: 'badge_0-5x_',   // Rebate
    3: 'badge_1x_',     // Break-even
    4: 'badge_1-5x_',   // Profit
    5: 'badge_4x_',     // Jackpot
};

/**
 * Get a random badge ID for a given tier
 * @param {number} tier - Box result tier (2-5 for winning tiers)
 * @returns {number|null} - Random badge ID (1 to max for tier), or null if tier doesn't get a badge
 */
export function getRandomBadgeId(tier) {
    const maxBadges = BADGE_COUNTS[tier];
    if (!maxBadges) return null; // Tier 1 (Dud) doesn't get a badge

    return Math.floor(Math.random() * maxBadges) + 1;
}

/**
 * Get the Supabase Storage URL for a badge
 * @param {number} tier - Box result tier (2-5)
 * @param {number} badgeId - Badge ID (1 to max for tier)
 * @param {string} supabaseUrl - Supabase project URL
 * @returns {string|null} - Full URL to badge image, or null if invalid
 */
export function getBadgeUrl(tier, badgeId, supabaseUrl) {
    const folder = TIER_FOLDERS[tier];
    const prefix = TIER_PREFIXES[tier];

    if (!folder || !prefix || !badgeId) return null;

    const paddedId = String(badgeId).padStart(3, '0');
    return `${supabaseUrl}/storage/v1/object/public/badges/${folder}/${prefix}${paddedId}.png`;
}

/**
 * Get tier display name
 * @param {number} tier - Box result tier
 * @returns {string} - Human-readable tier name
 */
export function getTierName(tier) {
    const names = {
        1: 'Dud',
        2: 'Rebate',
        3: 'Break-even',
        4: 'Profit',
        5: 'Jackpot',
    };
    return names[tier] || 'Unknown';
}
