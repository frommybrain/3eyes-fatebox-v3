// store/useNetworkStore.js
// Zustand store for network configuration and global state

import { create } from 'zustand';
import { getNetworkConfig, subscribeToNetworkConfig } from '@/lib/getNetworkConfig';

const useNetworkStore = create((set, get) => ({
    // Network config
    config: null,
    configLoading: true,
    configError: null,

    // Unsubscribe function for realtime updates
    unsubscribe: null,

    /**
     * Load network configuration from database
     */
    loadConfig: async () => {
        set({ configLoading: true, configError: null });

        try {
            const config = await getNetworkConfig();
            set({ config, configLoading: false });
            return config;
        } catch (error) {
            console.error('Failed to load network config:', error);
            set({
                configError: error.message,
                configLoading: false,
            });
            throw error;
        }
    },

    /**
     * Refresh config (bypass cache)
     */
    refreshConfig: async () => {
        try {
            const config = await getNetworkConfig(true);
            set({ config });
            return config;
        } catch (error) {
            console.error('Failed to refresh network config:', error);
            set({ configError: error.message });
            throw error;
        }
    },

    /**
     * Subscribe to realtime config changes
     */
    subscribe: () => {
        const unsubscribe = subscribeToNetworkConfig((newConfig) => {
            console.log('Network config updated via realtime:', newConfig);
            set({ config: newConfig });
        });

        set({ unsubscribe });
    },

    /**
     * Unsubscribe from realtime updates
     */
    unsubscribeFromUpdates: () => {
        const { unsubscribe } = get();
        if (unsubscribe) {
            unsubscribe();
            set({ unsubscribe: null });
        }
    },

    /**
     * Helper getters
     */
    isDevnet: () => {
        const { config } = get();
        return config?.network === 'devnet';
    },

    isMainnet: () => {
        const { config } = get();
        return config?.network === 'mainnet-beta';
    },

    isProduction: () => {
        const { config } = get();
        return config?.isProduction === true;
    },
}));

export default useNetworkStore;
