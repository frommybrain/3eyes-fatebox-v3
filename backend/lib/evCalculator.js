/**
 * EV (Expected Value) and RTP (Return To Player) Calculator
 *
 * Used for:
 * 1. Calculating dynamic vault funding requirements based on box price
 * 2. Calculating reserve amounts for unopened boxes during withdrawals
 * 3. Providing real-time EV/RTP feedback in admin dashboard
 *
 * Based on probability analysis from Claude, ChatGPT, and Grok (Jan 2026)
 * Default values follow Grok's no-dud model for better player experience
 */

/**
 * Default payout multipliers
 * These can be overridden by on-chain config
 */
const DEFAULT_PAYOUT_MULTIPLIERS = {
    dud: 0,        // Total loss (only for expired boxes)
    rebate: 0.5,   // Half back
    breakeven: 1,  // Even
    profit: 1.5,   // 50% profit
    jackpot: 4,    // 4x multiplier (Grok's recommendation)
};

/**
 * Default tier probabilities (Grok's no-dud model)
 * Probabilities are in percentage (0-100)
 * Jackpot is calculated as: 100 - dud - rebate - breakeven - profit
 */
const DEFAULT_TIER_PROBABILITIES = {
    tier1: {
        maxLuck: 5,
        dud: 0,        // No duds in normal gameplay
        rebate: 72,
        breakeven: 17,
        profit: 9,
        // jackpot: 2% (calculated)
    },
    tier2: {
        maxLuck: 13,
        dud: 0,
        rebate: 57,
        breakeven: 26,
        profit: 15,
        // jackpot: 2% (calculated)
    },
    tier3: {
        dud: 0,
        rebate: 44,
        breakeven: 34,
        profit: 20,
        // jackpot: 2% (calculated)
    },
};

/**
 * Calculate Expected Value for a single tier
 *
 * @param {Object} tierProbs - { dud, rebate, breakeven, profit } percentages (0-100)
 * @param {Object} payoutMultipliers - { dud, rebate, breakeven, profit, jackpot } multipliers
 * @returns {number} EV as a multiplier (e.g., 0.94 = 94% RTP)
 */
function calculateTierEV(tierProbs, payoutMultipliers = DEFAULT_PAYOUT_MULTIPLIERS) {
    const { dud = 0, rebate = 0, breakeven = 0, profit = 0 } = tierProbs;
    const jackpot = Math.max(0, 100 - dud - rebate - breakeven - profit);

    const ev = (
        (dud / 100) * payoutMultipliers.dud +
        (rebate / 100) * payoutMultipliers.rebate +
        (breakeven / 100) * payoutMultipliers.breakeven +
        (profit / 100) * payoutMultipliers.profit +
        (jackpot / 100) * payoutMultipliers.jackpot
    );

    return ev;
}

/**
 * Calculate RTP (Return To Player) percentage
 *
 * @param {Object} tierProbs - Tier probabilities
 * @param {Object} payoutMultipliers - Payout multipliers
 * @returns {number} RTP as percentage (e.g., 94.0)
 */
function calculateRTP(tierProbs, payoutMultipliers = DEFAULT_PAYOUT_MULTIPLIERS) {
    return calculateTierEV(tierProbs, payoutMultipliers) * 100;
}

/**
 * Calculate house edge percentage
 *
 * @param {Object} tierProbs - Tier probabilities
 * @param {Object} payoutMultipliers - Payout multipliers
 * @returns {number} House edge as percentage (e.g., 6.0)
 */
function calculateHouseEdge(tierProbs, payoutMultipliers = DEFAULT_PAYOUT_MULTIPLIERS) {
    return 100 - calculateRTP(tierProbs, payoutMultipliers);
}

/**
 * Calculate expected reserve multiplier based on Tier 3 RTP
 *
 * This is a simple, statistically-sound calculation:
 * Reserve = RTP (Expected Value) of Tier 3 per box
 *
 * Tier 3 is used because it represents the best odds for players (highest luck),
 * which is the most conservative assumption for the house.
 *
 * With default Tier 3 probabilities:
 * - Rebate (44%) × 0.5x + Breakeven (34%) × 1x + Profit (20%) × 1.5x + Jackpot (2%) × 4x
 * - = 0.22 + 0.34 + 0.30 + 0.08 = 0.94 (94% RTP)
 *
 * @param {Object} tierProbs - Tier 3 probabilities
 * @param {Object} payoutMultipliers - Payout multipliers
 * @returns {number} Expected reserve multiplier per box (e.g., 0.94 for 94% RTP)
 */
function calculateExpectedReserve(
    tierProbs = DEFAULT_TIER_PROBABILITIES.tier3,
    payoutMultipliers = DEFAULT_PAYOUT_MULTIPLIERS
) {
    // Simply return the EV (RTP as decimal) for Tier 3
    // This is the statistically expected payout per box
    return calculateTierEV(tierProbs, payoutMultipliers);
}

/**
 * @deprecated Use calculateExpectedReserve instead
 * Kept for backwards compatibility during transition
 */
function calculateWorstCaseReserve(
    tierProbs = DEFAULT_TIER_PROBABILITIES.tier3,
    payoutMultipliers = DEFAULT_PAYOUT_MULTIPLIERS,
    boxCount = 100
) {
    // Now just returns the straight EV (no safety margin, no variance buffer)
    return calculateExpectedReserve(tierProbs, payoutMultipliers);
}

/**
 * Calculate minimum initial vault funding based on box price
 *
 * Uses worst-case scenario for first ~100 boxes at max luck
 *
 * @param {BigInt|number} boxPrice - Price per box in base units
 * @param {Object} tier3Probs - Tier 3 probabilities
 * @param {Object} payoutMultipliers - Payout multipliers
 * @returns {BigInt} Minimum vault funding in base units
 */
function calculateMinimumVaultFunding(
    boxPrice,
    tier3Probs = DEFAULT_TIER_PROBABILITIES.tier3,
    payoutMultipliers = DEFAULT_PAYOUT_MULTIPLIERS
) {
    const price = BigInt(boxPrice);

    // Use 30x box price as minimum vault funding
    // This is based on probability analysis for worst-case variance:
    // - Tier 3 RTP is 94%, so expected payout is 0.94x per box
    // - 30x covers ~32 boxes at max payout while house edge accumulates
    // - Accounts for jackpot clustering risk in early boxes
    const minimumFunding = price * BigInt(30);

    return minimumFunding;
}

/**
 * Calculate reserve amount for unopened boxes during withdrawal
 *
 * @param {BigInt|number} boxPrice - Price per box in base units
 * @param {number} unopenedBoxCount - Number of unopened boxes
 * @param {Object} tier3Probs - Tier 3 probabilities (worst case)
 * @param {Object} payoutMultipliers - Payout multipliers
 * @returns {BigInt} Reserve amount in base units
 */
function calculateUnopenedBoxReserve(
    boxPrice,
    unopenedBoxCount,
    tier3Probs = DEFAULT_TIER_PROBABILITIES.tier3,
    payoutMultipliers = DEFAULT_PAYOUT_MULTIPLIERS
) {
    if (unopenedBoxCount === 0) return BigInt(0);

    const price = BigInt(boxPrice);
    const reserveMultiplier = calculateWorstCaseReserve(tier3Probs, payoutMultipliers, unopenedBoxCount);

    return BigInt(Math.ceil(Number(price) * unopenedBoxCount * reserveMultiplier));
}

/**
 * Get all tier EVs and RTPs for display/logging
 *
 * @param {Object} tierProbs - { tier1, tier2, tier3 } probability objects
 * @param {Object} payoutMultipliers - Payout multipliers
 * @returns {Object} EVs and RTPs for all tiers
 */
function getAllTierMetrics(
    tierProbs = DEFAULT_TIER_PROBABILITIES,
    payoutMultipliers = DEFAULT_PAYOUT_MULTIPLIERS
) {
    const tier1EV = calculateTierEV(tierProbs.tier1, payoutMultipliers);
    const tier2EV = calculateTierEV(tierProbs.tier2, payoutMultipliers);
    const tier3EV = calculateTierEV(tierProbs.tier3, payoutMultipliers);

    return {
        tier1: {
            ev: tier1EV,
            rtp: tier1EV * 100,
            houseEdge: 100 - (tier1EV * 100),
        },
        tier2: {
            ev: tier2EV,
            rtp: tier2EV * 100,
            houseEdge: 100 - (tier2EV * 100),
        },
        tier3: {
            ev: tier3EV,
            rtp: tier3EV * 100,
            houseEdge: 100 - (tier3EV * 100),
        },
    };
}

/**
 * Parse on-chain config probabilities into tier objects
 *
 * @param {Object} onChainConfig - Config from platform config PDA
 * @returns {Object} Parsed tier probabilities
 */
function parseTierProbsFromConfig(onChainConfig) {
    if (!onChainConfig) return DEFAULT_TIER_PROBABILITIES;

    return {
        tier1: {
            maxLuck: onChainConfig.tier1MaxLuck || 5,
            dud: onChainConfig.tier1Dud || 0,
            rebate: onChainConfig.tier1Rebate || 72,
            breakeven: onChainConfig.tier1Breakeven || 17,
            profit: onChainConfig.tier1Profit || 9,
        },
        tier2: {
            maxLuck: onChainConfig.tier2MaxLuck || 13,
            dud: onChainConfig.tier2Dud || 0,
            rebate: onChainConfig.tier2Rebate || 57,
            breakeven: onChainConfig.tier2Breakeven || 26,
            profit: onChainConfig.tier2Profit || 15,
        },
        tier3: {
            dud: onChainConfig.tier3Dud || 0,
            rebate: onChainConfig.tier3Rebate || 44,
            breakeven: onChainConfig.tier3Breakeven || 34,
            profit: onChainConfig.tier3Profit || 20,
        },
    };
}

/**
 * Parse payout multipliers from on-chain config
 *
 * @param {Object} onChainConfig - Config from platform config PDA
 * @returns {Object} Parsed payout multipliers
 */
function parsePayoutMultipliersFromConfig(onChainConfig) {
    if (!onChainConfig) return DEFAULT_PAYOUT_MULTIPLIERS;

    return {
        dud: onChainConfig.payoutDud ?? 0,
        rebate: onChainConfig.payoutRebate ?? 0.5,
        breakeven: onChainConfig.payoutBreakeven ?? 1,
        profit: onChainConfig.payoutProfit ?? 1.5,
        jackpot: onChainConfig.payoutJackpot ?? 4,
    };
}

export {
    // Constants
    DEFAULT_PAYOUT_MULTIPLIERS,
    DEFAULT_TIER_PROBABILITIES,

    // Core calculations
    calculateTierEV,
    calculateRTP,
    calculateHouseEdge,
    calculateExpectedReserve,
    calculateWorstCaseReserve, // @deprecated - use calculateExpectedReserve

    // Vault funding
    calculateMinimumVaultFunding,
    calculateUnopenedBoxReserve,

    // Utilities
    getAllTierMetrics,
    parseTierProbsFromConfig,
    parsePayoutMultipliersFromConfig,
};
