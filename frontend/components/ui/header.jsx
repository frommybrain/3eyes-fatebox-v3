'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useMemo } from 'react';
import Image from 'next/image';
import WalletButton from '@/components/wallet/WalletButton';
import useNetworkStore from '@/store/useNetworkStore';

/**
 * Get the base domain URL (strips subdomain if on a project subdomain)
 * This ensures navigation links always go to the main domain
 */
function getBaseDomainUrl() {
  if (typeof window === 'undefined') return '';

  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  // Local development
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:${window.location.port}`;
  }

  // Production - get base domain (e.g., degenbox.fun from catbox.degenbox.fun)
  const parts = hostname.split('.');
  if (parts.length > 2) {
    // On a subdomain, return base domain
    const baseDomain = parts.slice(-2).join('.');
    return `${protocol}//${baseDomain}`;
  }

  // Already on base domain
  return `${protocol}//${hostname}`;
}

export default function Header() {
  const { publicKey } = useWallet();
  const { config } = useNetworkStore();
  const isAdmin = publicKey && config?.adminWallet && publicKey.toString() === config.adminWallet.toString();

  // Memoize base URL to avoid recalculating on every render
  const baseUrl = useMemo(() => getBaseDomainUrl(), []);

  return (
    <header className="fixed top-0 left-0 w-full h-14 flex items-center justify-between px-4 bg-degen-bg border-b border-degen-black z-50">
      {/* Logo / Brand - links to base domain homepage */}
      <a href={baseUrl || '/'} className="flex items-center hover:opacity-80 transition-opacity">
        <Image
          src="/images/degenboxlogo.svg"
          alt="DegenBox"
          width={40}
          height={40}
          className="h-[35px] w-auto"
        />
      </a>

      {/* Navigation & Wallet */}
      <div className="flex items-center">
        {publicKey && (
          <>
            <a
              href={`${baseUrl}/dashboard`}
              className="px-4 py-2 text-degen-black/80 hover:text-degen-black hover:bg-degen-black/5 transition-colors font-medium text-sm uppercase tracking-wider"
            >
              Dashboard
            </a>

            <a
              href={`${baseUrl}/projects`}
              className="px-4 py-2 text-degen-black/80 hover:text-degen-black hover:bg-degen-black/5 transition-colors font-medium text-sm uppercase tracking-wider"
            >
              Projects
            </a>

            {isAdmin && (
              <a
                href={`${baseUrl}/admin`}
                className="px-4 py-2 text-degen-feature hover:bg-degen-feature/10 transition-colors font-medium text-sm uppercase tracking-wider"
              >
                Admin
              </a>
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
