// components/wallet/WalletButton.jsx
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { storeWallet, clearStoredWallet } from '@/lib/auth';
import { DegenButton } from '@/components/ui';

export default function WalletButton({ variant = 'primary', fullWidth = false, className = '' }) {
    const { publicKey, disconnect, connected } = useWallet();
    const { setVisible } = useWalletModal();
    const router = useRouter();

    // Store wallet address when connected
    useEffect(() => {
        if (connected && publicKey) {
            const walletAddress = publicKey.toString();
            storeWallet(walletAddress);
            console.log('Wallet connected:', walletAddress);
        } else {
            clearStoredWallet();
        }
    }, [connected, publicKey]);

    const handleClick = () => {
        if (connected) {
            // If connected, go to dashboard
            router.push('/dashboard');
        } else {
            // If not connected, open wallet modal
            setVisible(true);
        }
    };

    const handleDisconnect = async () => {
        clearStoredWallet();
        await disconnect();
    };

    if (!connected) {
        // Not connected - show connect button
        return (
            <DegenButton
                onClick={handleClick}
                variant={variant}
                fullWidth={fullWidth}
                className={className}
            >
                Connect Wallet
            </DegenButton>
        );
    }

    // Connected - show wallet address with dropdown
    const shortAddress = publicKey
        ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
        : '';

    return (
        <div className="relative group">
            <button
                onClick={handleClick}
                className="px-6 py-2 bg-degen-success text-degen-black font-medium uppercase tracking-wider border border-degen-black hover:bg-degen-success/80 transition-colors flex items-center gap-2"
            >
                <div className="w-2 h-2 bg-degen-black rounded-full animate-pulse"></div>
                {shortAddress}
            </button>

            {/* Dropdown menu */}
            <div className="absolute right-0 mt-1 w-48 bg-degen-white border border-degen-black shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                    onClick={handleClick}
                    className="w-full px-4 py-3 text-left text-degen-black hover:bg-degen-bg transition-colors uppercase tracking-wider text-sm font-medium"
                >
                    Dashboard
                </button>
                <button
                    onClick={handleDisconnect}
                    className="w-full px-4 py-3 text-left text-degen-error hover:bg-degen-bg transition-colors uppercase tracking-wider text-sm font-medium border-t border-degen-black"
                >
                    Disconnect
                </button>
            </div>
        </div>
    );
}
