// store/useBetaAccessStore.js
// Zustand store for beta access control

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Beta tester wallet addresses (add your testers here)
const BETA_WALLETS = [
    // Add wallet addresses that should have beta access
    // Example: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'
];

const useBetaAccessStore = create(
    persist(
        (set, get) => ({
            // Whether user has been granted access this session
            hasAccess: false,

            // The wallet that was verified (for display purposes)
            verifiedWallet: null,

            // Beta mode enabled (when false, everyone has access)
            betaModeEnabled: true,

            /**
             * Check if a wallet address has beta access
             * @param {string} walletAddress - The wallet public key as string
             * @returns {boolean} - Whether the wallet has access
             */
            checkAccess: (walletAddress) => {
                const { betaModeEnabled } = get();

                // If beta mode is disabled, everyone has access
                if (!betaModeEnabled) {
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
             * Toggle beta mode (admin function)
             * @param {boolean} enabled - Whether beta mode should be enabled
             */
            setBetaMode: (enabled) => {
                set({ betaModeEnabled: enabled });
            },

            /**
             * Get the list of allowed wallets (for admin display)
             */
            getAllowedWallets: () => BETA_WALLETS,
        }),
        {
            name: 'beta-access-storage',
            // Only persist hasAccess and verifiedWallet
            partialize: (state) => ({
                hasAccess: state.hasAccess,
                verifiedWallet: state.verifiedWallet,
            }),
        }
    )
);

export default useBetaAccessStore;

// Export the beta wallets list for easy modification
export { BETA_WALLETS };
