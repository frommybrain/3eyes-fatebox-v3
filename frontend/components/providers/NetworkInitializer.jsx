// components/providers/NetworkInitializer.jsx
'use client';

import { useEffect } from 'react';
import useNetworkStore from '@/store/useNetworkStore';

export default function NetworkInitializer({ children }) {
    const { loadConfig, subscribe } = useNetworkStore();

    useEffect(() => {
        // Load network config on app mount
        loadConfig().catch(console.error);

        // Subscribe to realtime config changes
        const unsubscribe = subscribe();

        return () => {
            unsubscribe();
        };
    }, []);

    return <>{children}</>;
}
