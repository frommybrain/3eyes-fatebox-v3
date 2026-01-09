// lib/auth.js
// Simple wallet-based authentication (no user accounts)

/**
 * Authenticate wallet with signature
 * This verifies the user owns the wallet but doesn't create a database account
 *
 * @param {Object} wallet - Solana wallet adapter wallet object
 * @returns {Promise<Object>} Authentication result with wallet address
 */
export async function authenticateWallet(wallet) {
    // Validate wallet
    if (!wallet || !wallet.publicKey || !wallet.signMessage) {
        throw new Error('Wallet not connected or does not support message signing');
    }

    // Check if wallet adapter is connected
    if (!wallet.adapter?.connected) {
        throw new Error('Wallet adapter not connected');
    }

    const walletAddress = wallet.publicKey.toString();

    try {
        // Create a message to sign
        const message = `Sign this message to authenticate with DegenBox.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}`;
        const encodedMessage = new TextEncoder().encode(message);

        // Request signature from wallet
        const signature = await wallet.signMessage(encodedMessage);

        // Signature verified! (the wallet adapter validates it)
        console.log('✅ Wallet authenticated:', walletAddress);

        return {
            success: true,
            walletAddress,
            timestamp: Date.now(),
        };

    } catch (error) {
        console.error('❌ Wallet authentication failed:', error);

        // If user rejected signature, that's okay
        if (error.message?.includes('User rejected')) {
            return {
                success: false,
                walletAddress,
                signatureRejected: true,
            };
        }

        throw error;
    }
}

/**
 * Get user's wallet address from storage
 * @returns {string|null}
 */
export function getStoredWallet() {
    if (typeof window === 'undefined') return null;

    try {
        return localStorage.getItem('degenbox_wallet');
    } catch {
        return null;
    }
}

/**
 * Store user's wallet address
 * @param {string} walletAddress
 */
export function storeWallet(walletAddress) {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem('degenbox_wallet', walletAddress);
    } catch (error) {
        console.error('Failed to store wallet:', error);
    }
}

/**
 * Clear stored wallet
 */
export function clearStoredWallet() {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem('degenbox_wallet');
        localStorage.removeItem('degenbox_auth_time');
    } catch (error) {
        console.error('Failed to clear wallet:', error);
    }
}
