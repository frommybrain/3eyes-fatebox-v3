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
    <header className="relative w-full h-14 flex items-center justify-between px-4 bg-degen-bg border-b border-degen-black z-50">
      {/* Logo / Brand */}
      <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="text-xl"></div>
      </Link>

      {/* Navigation & Wallet */}
      <div className="flex items-center">
        {publicKey && (
          <>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-degen-black/80 hover:text-degen-black hover:bg-degen-black/5 transition-colors font-medium text-sm uppercase tracking-wider"
            >
              My Projects
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="px-4 py-2 text-degen-feature hover:bg-degen-feature/10 transition-colors font-medium text-sm uppercase tracking-wider"
              >
                Admin
              </Link>
            )}
          </>
        )}

        <div className="ml-2 border-l border-degen-black/20 pl-4">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
