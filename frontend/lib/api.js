// lib/api.js
// Centralized API utilities for frontend

/**
 * Get the backend API base URL
 * @returns {string} - Backend API URL (e.g., "http://localhost:3333" or "https://api.degenbox.fun")
 */
export function getBackendUrl() {
    return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';
}

/**
 * Get the Solscan explorer base URL
 * @param {string} network - Network name (devnet, mainnet-beta)
 * @returns {string} - Solscan base URL
 */
export function getSolscanBaseUrl(network = 'devnet') {
    if (network === 'mainnet-beta' || network === 'mainnet') {
        return 'https://solscan.io';
    }
    return 'https://solscan.io';
}

/**
 * Get a Solscan transaction URL
 * @param {string} signature - Transaction signature
 * @param {string} network - Network name
 * @returns {string} - Full Solscan URL
 */
export function getSolscanTxUrl(signature, network = 'devnet') {
    const base = getSolscanBaseUrl(network);
    const cluster = network === 'mainnet-beta' || network === 'mainnet' ? '' : `?cluster=${network}`;
    return `${base}/tx/${signature}${cluster}`;
}

/**
 * Get a Solscan account URL
 * @param {string} address - Account address
 * @param {string} network - Network name
 * @returns {string} - Full Solscan URL
 */
export function getSolscanAccountUrl(address, network = 'devnet') {
    const base = getSolscanBaseUrl(network);
    const cluster = network === 'mainnet-beta' || network === 'mainnet' ? '' : `?cluster=${network}`;
    return `${base}/account/${address}${cluster}`;
}

/**
 * Make an API request to the backend
 * @param {string} endpoint - API endpoint (e.g., "/api/projects")
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Response data
 */
export async function apiRequest(endpoint, options = {}) {
    const baseUrl = getBackendUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    // Add wallet address header if available
    if (options.walletAddress) {
        defaultHeaders['X-Wallet-Address'] = options.walletAddress;
        delete options.walletAddress;
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    });

    const data = await response.json();

    if (!response.ok) {
        const error = new Error(data.error || 'Request failed');
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

/**
 * GET request to backend API
 * @param {string} endpoint - API endpoint
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Response data
 */
export async function apiGet(endpoint, options = {}) {
    return apiRequest(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request to backend API
 * @param {string} endpoint - API endpoint
 * @param {Object} body - Request body
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Response data
 */
export async function apiPost(endpoint, body, options = {}) {
    return apiRequest(endpoint, {
        ...options,
        method: 'POST',
        body: JSON.stringify(body),
    });
}

/**
 * Format a token amount for display
 * @param {string|number|bigint} amount - Raw amount
 * @param {number} decimals - Token decimals
 * @param {number} displayDecimals - Decimals to show (default: 2)
 * @returns {string} - Formatted amount
 */
export function formatTokenAmount(amount, decimals, displayDecimals = 2) {
    const value = Number(amount) / Math.pow(10, decimals);
    return value.toFixed(displayDecimals);
}

/**
 * Format a token amount with symbol
 * @param {string|number|bigint} amount - Raw amount
 * @param {number} decimals - Token decimals
 * @param {string} symbol - Token symbol
 * @param {number} displayDecimals - Decimals to show
 * @returns {string} - Formatted amount with symbol (e.g., "1.50 SOL")
 */
export function formatTokenWithSymbol(amount, decimals, symbol, displayDecimals = 2) {
    return `${formatTokenAmount(amount, decimals, displayDecimals)} ${symbol}`;
}

export default {
    getBackendUrl,
    getSolscanBaseUrl,
    getSolscanTxUrl,
    getSolscanAccountUrl,
    apiRequest,
    apiGet,
    apiPost,
    formatTokenAmount,
    formatTokenWithSymbol,
};
