'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import WalletButton from '@/components/wallet/WalletButton';
import useNetworkStore from '@/store/useNetworkStore';

export default function Header() {
  const { publicKey } = useWallet();
  const { config } = useNetworkStore();
  const isAdmin = publicKey && config?.adminWallet && publicKey.toString() === config.adminWallet.toString();
  const [isVisible, setIsVisible] = useState(false);
  const [keySequence, setKeySequence] = useState('');

  // Listen for "iii" keyboard sequence to show header
  useEffect(() => {
    const handleKeyDown = (e) => {
      const newSequence = (keySequence + e.key).slice(-3);
      setKeySequence(newSequence);

      if (newSequence === 'iii') {
        setIsVisible(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keySequence]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 w-full h-14 flex items-center justify-between px-4 bg-degen-bg border-b border-degen-black z-50">
      {/* Logo / Brand */}
      <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
        <Image
          src="/images/degenboxlogo.svg"
          alt="DegenBox"
          width={40}
          height={40}
          className="h-[35px] w-auto"
        />
      </Link>

      {/* Navigation & Wallet */}
      <div className="flex items-center">
        {publicKey && (
          <>
            <Link
              href="/dashboard"
              className="px-4 py-2 text-degen-black/80 hover:text-degen-black hover:bg-degen-black/5 transition-colors font-medium text-sm uppercase tracking-wider"
            >
              Dashboard
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
