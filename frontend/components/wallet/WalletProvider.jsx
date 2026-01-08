// components/wallet/WalletProvider.jsx
'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter, TorusWalletAdapter } from '@solana/wallet-adapter-wallets';
import useNetworkStore from '@/store/useNetworkStore';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

export default function WalletProvider({ children }) {
    // Get RPC URL from network config
    const { config } = useNetworkStore();

    // Use RPC from config, fallback to devnet
    const endpoint = useMemo(() => {
        if (config?.rpcUrl) {
            return config.rpcUrl;
        }
        // Default to devnet during initial load
        return 'https://api.devnet.solana.com';
    }, [config]);

    // Configure wallets
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new SolflareWalletAdapter(),
            new TorusWalletAdapter(),
        ],
        []
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <SolanaWalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </SolanaWalletProvider>
        </ConnectionProvider>
    );
}
