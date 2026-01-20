'use client';

// components/auth/BetaGate.jsx
// Protects routes during beta - requires wallet connection and allowlist verification

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import useBetaAccessStore, { BETA_MODE_ENABLED } from '@/store/useBetaAccessStore';
import WalletButton from '@/components/wallet/WalletButton';
import LoadingOverlay from '@/components/ui/LoadingOverlay';

/**
 * BetaGate - Wrap protected pages with this component
 *
 * Users must:
 * 1. Connect their wallet
 * 2. Have their wallet in the BETA_WALLETS allowlist
 *
 * Once verified, access persists for the session even if wallet disconnects
 */
export default function BetaGate({ children }) {
    const { publicKey, connected, connecting } = useWallet();
    const { hasAccess, checkAccess, grantAccess } = useBetaAccessStore();
    const [isChecking, setIsChecking] = useState(true);

    useEffect(() => {
        // If beta mode is disabled at build time, grant access immediately
        if (!BETA_MODE_ENABLED) {
            grantAccess('public');
            setIsChecking(false);
            return;
        }

        // If already has access, we're done checking
        if (hasAccess) {
            setIsChecking(false);
            return;
        }

        // Wait for wallet connection state to stabilize
        if (connecting) {
            return;
        }

        // If wallet is connected, check allowlist
        if (connected && publicKey) {
            const walletAddress = publicKey.toString();
            const isAllowed = checkAccess(walletAddress);

            if (isAllowed) {
                grantAccess(walletAddress);
            }
            setIsChecking(false);
        } else {
            // Not connected - done checking, will show gate UI
            setIsChecking(false);
        }
    }, [connected, connecting, publicKey, hasAccess, checkAccess, grantAccess]);

    // If beta mode disabled, always show content
    if (!BETA_MODE_ENABLED) {
        return children;
    }

    // Still checking - show loading overlay to prevent flash
    if (isChecking) {
        return <LoadingOverlay isLoading={true} />;
    }

    // Has access - render children
    if (hasAccess) {
        return children;
    }

    // No access - show gate UI
    return (
        <div className="min-h-screen bg-degen-bg flex items-center justify-center pt-14">
            <div className="max-w-md w-full mx-4">
                <div className="bg-degen-container border border-degen-black p-8 text-center">
                    {/* Beta Badge */}
                    <div className="inline-block px-3 py-1 bg-degen-yellow text-degen-black text-xs font-bold uppercase tracking-wider mb-6">
                        Beta Access Required
                    </div>

                    <h1 className="text-2xl font-bold text-degen-black mb-4">
                        DegenBox Beta
                    </h1>

                    <p className="text-degen-text-muted mb-6">
                        This platform is currently in closed beta. Connect your wallet to verify access.
                    </p>

                    {!connected ? (
                        <>
                            <div className="mb-4">
                                <WalletButton />
                            </div>
                            <p className="text-xs text-degen-text-muted">
                                Connect your wallet to check if you have beta access
                            </p>
                        </>
                    ) : (
                        <>
                            <div className="bg-red-50 border border-red-200 p-4 mb-4">
                                <p className="text-red-600 text-sm font-medium">
                                    Access Denied
                                </p>
                                <p className="text-red-500 text-xs mt-1">
                                    Your wallet is not on the beta access list.
                                </p>
                            </div>

                            <p className="text-xs text-degen-text-muted mb-4">
                                Connected: {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
                            </p>

                            <p className="text-xs text-degen-text-muted">
                                Contact the team on{' '}
                                <a
                                    href="https://twitter.com/3eyesworld"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-degen-blue hover:underline"
                                >
                                    Twitter
                                </a>
                                {' '}to request beta access.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
