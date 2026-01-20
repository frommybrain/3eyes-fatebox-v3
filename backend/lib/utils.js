// lib/utils.js
// Common utility functions for the backend

/**
 * Format a raw token amount with decimals for display
 * @param {string|number|bigint} amountRaw - Amount in smallest units (lamports, etc.)
 * @param {number} decimals - Number of decimal places for the token
 * @returns {number} - Formatted amount as a number
 */
export function formatTokenAmount(amountRaw, decimals) {
    const amount = typeof amountRaw === 'bigint' ? Number(amountRaw) : Number(amountRaw);
    return amount / Math.pow(10, decimals);
}

/**
 * Format a token amount for display with proper decimals
 * @param {string|number|bigint} amountRaw - Amount in smallest units
 * @param {number} decimals - Number of decimal places for the token
 * @param {number} displayDecimals - Number of decimal places to show (default: 2)
 * @returns {string} - Formatted string
 */
export function formatTokenDisplay(amountRaw, decimals, displayDecimals = 2) {
    const amount = formatTokenAmount(amountRaw, decimals);
    return amount.toFixed(displayDecimals);
}

/**
 * Convert a human-readable amount to raw token units
 * @param {number|string} amount - Human readable amount (e.g., 1.5)
 * @param {number} decimals - Number of decimal places for the token
 * @returns {bigint} - Amount in smallest units
 */
export function toRawTokenAmount(amount, decimals) {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return BigInt(Math.floor(numAmount * Math.pow(10, decimals)));
}

/**
 * Get the API base URL for internal API calls
 * Handles both localhost development and production environments
 * @returns {string} - Base URL (e.g., "http://localhost:3333" or "https://api.degenbox.fun")
 */
export function getApiBaseUrl() {
    // Use explicit API_BASE_URL if set (for production)
    if (process.env.API_BASE_URL) {
        return process.env.API_BASE_URL;
    }
    // Fallback to localhost with PORT
    const port = process.env.PORT || 3333;
    return `http://localhost:${port}`;
}

/**
 * Validate a Solana public key string
 * @param {string} address - The address to validate
 * @returns {boolean} - True if valid
 */
export function isValidSolanaAddress(address) {
    if (!address || typeof address !== 'string') {
        return false;
    }
    // Base58 check: must be 32-44 characters, alphanumeric (no 0, O, I, l)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return base58Regex.test(address);
}

/**
 * Sanitize an error message for client response
 * Removes sensitive information like file paths, stack traces, etc.
 * @param {string} message - Original error message
 * @returns {string} - Sanitized message
 */
export function sanitizeErrorMessage(message) {
    if (!message) return 'An error occurred';

    // Remove file paths
    let sanitized = message.replace(/\/[^\s:]+\.(js|ts|json)/g, '[file]');

    // Remove stack traces
    sanitized = sanitized.replace(/at\s+.+\(.+\)/g, '');

    // Remove IP addresses
    sanitized = sanitized.replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[ip]');

    // Truncate long messages
    if (sanitized.length > 200) {
        sanitized = sanitized.substring(0, 200) + '...';
    }

    return sanitized.trim();
}

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} baseDelayMs - Base delay in ms (default: 1000)
 * @returns {Promise<any>} - Result of the function
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelayMs = 1000) {
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries) {
                const delay = baseDelayMs * Math.pow(2, attempt);
                await sleep(delay);
            }
        }
    }
    throw lastError;
}

/**
 * Parse pagination parameters from request query
 * @param {Object} query - Express request query object
 * @param {Object} defaults - Default values
 * @returns {Object} - { page, limit, offset }
 */
export function parsePagination(query, defaults = { page: 1, limit: 50, maxLimit: 100 }) {
    const page = Math.max(1, parseInt(query.page) || defaults.page);
    const limit = Math.min(
        Math.max(1, parseInt(query.limit) || defaults.limit),
        defaults.maxLimit
    );
    const offset = (page - 1) * limit;

    return { page, limit, offset };
}

/**
 * Verify a Solana transaction signature on-chain
 * Checks that the transaction exists and was successful
 *
 * @param {Connection} connection - Solana connection
 * @param {string} signature - Transaction signature to verify
 * @param {Object} options - Verification options
 * @param {number} options.maxRetries - Max retries for confirmation (default: 3)
 * @param {number} options.retryDelayMs - Delay between retries (default: 1000)
 * @param {boolean} options.requireSuccess - Require transaction to be successful (default: true)
 * @returns {Promise<Object>} - { verified: boolean, transaction: Object|null, error: string|null }
 */
export async function verifyTransaction(connection, signature, options = {}) {
    const {
        maxRetries = 3,
        retryDelayMs = 1000,
        requireSuccess = true,
    } = options;

    try {
        // First check if the signature format is valid
        if (!signature || typeof signature !== 'string' || signature.length < 32) {
            return {
                verified: false,
                transaction: null,
                error: 'Invalid signature format',
            };
        }

        // Try to get the transaction with retries
        let transaction = null;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                // Get the transaction details
                transaction = await connection.getTransaction(signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0,
                });

                if (transaction) break;

                // If not found, wait and retry (might still be confirming)
                if (attempt < maxRetries) {
                    await sleep(retryDelayMs);
                }
            } catch (err) {
                console.error(`Transaction fetch attempt ${attempt + 1} failed:`, err.message);
                if (attempt < maxRetries) {
                    await sleep(retryDelayMs);
                }
            }
        }

        if (!transaction) {
            return {
                verified: false,
                transaction: null,
                error: 'Transaction not found on-chain',
            };
        }

        // Check if transaction was successful
        if (requireSuccess && transaction.meta?.err) {
            return {
                verified: false,
                transaction,
                error: `Transaction failed: ${JSON.stringify(transaction.meta.err)}`,
            };
        }

        return {
            verified: true,
            transaction,
            error: null,
        };
    } catch (error) {
        console.error('Transaction verification error:', error.message);
        return {
            verified: false,
            transaction: null,
            error: `Verification failed: ${error.message}`,
        };
    }
}

/**
 * Verify that a transaction interacted with a specific program
 *
 * @param {Object} transaction - Transaction object from getTransaction
 * @param {string} programId - Expected program ID
 * @returns {boolean} - True if program was invoked
 */
export function transactionInvokedProgram(transaction, programId) {
    if (!transaction?.transaction?.message) {
        return false;
    }

    const message = transaction.transaction.message;

    // Get account keys (handles both legacy and versioned transactions)
    let accountKeys;
    if (message.staticAccountKeys) {
        // Versioned transaction
        accountKeys = message.staticAccountKeys.map(k => k.toString());
    } else if (message.accountKeys) {
        // Legacy transaction
        accountKeys = message.accountKeys.map(k => k.toString());
    } else {
        return false;
    }

    return accountKeys.includes(programId);
}

/**
 * Extract log messages from a transaction that match a pattern
 *
 * @param {Object} transaction - Transaction object from getTransaction
 * @param {RegExp|string} pattern - Pattern to match in logs
 * @returns {string[]} - Matching log messages
 */
export function extractTransactionLogs(transaction, pattern) {
    const logs = transaction?.meta?.logMessages || [];
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    return logs.filter(log => regex.test(log));
}

export default {
    formatTokenAmount,
    formatTokenDisplay,
    toRawTokenAmount,
    getApiBaseUrl,
    isValidSolanaAddress,
    sanitizeErrorMessage,
    sleep,
    retryWithBackoff,
    parsePagination,
    verifyTransaction,
    transactionInvokedProgram,
    extractTransactionLogs,
};
