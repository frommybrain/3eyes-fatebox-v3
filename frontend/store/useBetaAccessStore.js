// store/useBetaAccessStore.js
// Zustand store for beta access control

import { create } from 'zustand';

// ============================================
// BETA MODE CONFIGURATION
// Set to false to disable beta gate entirely
// ============================================
const BETA_MODE_ENABLED = true;

// Beta tester wallet addresses (add your testers here)
const BETA_WALLETS = [
    'Fop6HTZr57VAHw8t2S8MGwJvxJ9BGWHvLfLrRajKMv6',
    'DAuiBQ1guy3Djhidr15qpJYbRXk6mfSfMy9tWJfosWgN',
    'GrYR77SL36BTUMN3Sb6muAsY3KExGJ7hrWPcqMLCkawF',
    'EBTBZAMbacjommLBDKYhfNGwnKK7Fise5gvwmqDZFsGh',
    '5vnjoqgwjoosmCRLzNNKPHd5U8tYfTJxtaLytMzTm9Vn',
    '9QHdhNhawBFr6No6mktKReDDDMm8wTGjAZyrDPrRuN79',
    'HC2djD3qPYdYqt5zHEyqAf5cXMWhf144v6f9s9s1FY2A',
    'GDKA3WjyGQXc8TMZ5qySV1ESXtdMwFcGC4ApAxZaq8gv',
    '8iN8eRREfCA9LfPQNktL4n6vDxNv2toh3KxbUpvMxpmH'
];

// Simple store without persistence (avoids hydration issues)
const useBetaAccessStore = create((set, get) => ({
    // Whether user has been granted access this session
    hasAccess: false,

    // The wallet that was verified (for display purposes)
    verifiedWallet: null,

    // Beta mode enabled (read from constant)
    betaModeEnabled: BETA_MODE_ENABLED,

    /**
     * Check if a wallet address has beta access
     * @param {string} walletAddress - The wallet public key as string
     * @returns {boolean} - Whether the wallet has access
     */
    checkAccess: (walletAddress) => {
        // If beta mode is disabled, everyone has access
        if (!BETA_MODE_ENABLED) {
            return true;
        }

        // Check if wallet is in the allowlist
        return BETA_WALLETS.includes(walletAddress);
    },

    /**
     * Grant access to a wallet (call after successful verification)
     * @param {string} walletAddress - The verified wallet address
     */
    grantAccess: (walletAddress) => {
        set({
            hasAccess: true,
            verifiedWallet: walletAddress,
        });
    },

    /**
     * Revoke access (e.g., on logout or session clear)
     */
    revokeAccess: () => {
        set({
            hasAccess: false,
            verifiedWallet: null,
        });
    },

    /**
     * Get the list of allowed wallets (for admin display)
     */
    getAllowedWallets: () => BETA_WALLETS,
}));

export default useBetaAccessStore;

// Export the beta wallets list and mode for easy access
export { BETA_WALLETS, BETA_MODE_ENABLED };
