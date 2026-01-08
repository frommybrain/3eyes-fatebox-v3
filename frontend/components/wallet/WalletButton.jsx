// components/wallet/WalletButton.jsx
'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function WalletButton() {
    const { publicKey, disconnect, connected } = useWallet();
    const { setVisible } = useWalletModal();
    const router = useRouter();

    // Auto-redirect to dashboard on connect
    useEffect(() => {
        if (connected && publicKey) {
            console.log('Wallet connected:', publicKey.toString());
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
        await disconnect();
    };

    if (!connected) {
        // Not connected - show connect button
        return (
            <button
                onClick={handleClick}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
                Connect Wallet
            </button>
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
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
                <div className="w-2 h-2 bg-green-300 rounded-full animate-pulse"></div>
                {shortAddress}
            </button>

            {/* Dropdown menu */}
            <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                    onClick={handleClick}
                    className="w-full px-4 py-3 text-left text-white hover:bg-gray-800 rounded-t-lg transition-colors"
                >
                    📊 Dashboard
                </button>
                <button
                    onClick={handleDisconnect}
                    className="w-full px-4 py-3 text-left text-red-400 hover:bg-gray-800 rounded-b-lg transition-colors"
                >
                    🔌 Disconnect
                </button>
            </div>
        </div>
    );
}
