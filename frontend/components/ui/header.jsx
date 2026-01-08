'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import WalletButton from '@/components/wallet/WalletButton';
import useNetworkStore from '@/store/useNetworkStore';

export default function Header() {
  const { publicKey } = useWallet();
  const { config } = useNetworkStore();
  const isAdmin = publicKey && config && publicKey.toString() === config.adminWallet.toString();

  return (
    <header className="fixed top-0 left-0 w-full h-16 flex items-center justify-between px-6 backdrop-blur-sm bg-black/30 z-50 border-b border-white/10">
      {/* Logo / Brand */}
      <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
        <div className="text-2xl">👁️👁️👁️</div>
        <span className="text-white font-bold text-xl">DegenBox</span>
      </Link>

      {/* Navigation & Wallet */}
      <div className="flex items-center gap-4">
        {publicKey && (
          <>
            <Link
              href="/dashboard"
              className="text-white/80 hover:text-white transition-colors font-medium"
            >
              My Projects
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="text-purple-400 hover:text-purple-300 transition-colors font-medium"
              >
                🔧 Admin
              </Link>
            )}
          </>
        )}

        <WalletButton />
      </div>
    </header>
  );
}
