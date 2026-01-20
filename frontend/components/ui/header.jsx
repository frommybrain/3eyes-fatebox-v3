'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import WalletButton from '@/components/wallet/WalletButton';
import useNetworkStore from '@/store/useNetworkStore';
import usePurchasingStore from '@/store/usePurchasingStore';

/**
 * Get the base domain URL (strips subdomain if on a project subdomain)
 * This ensures navigation links always go to the main domain
 */
function getBaseDomainUrl() {
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

/**
 * Check if we're on a subdomain (not the base domain)
 */
function isOnSubdomain() {
  const hostname = window.location.hostname;

  // Local development - never on subdomain
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return false;
  }

  // Production - check if more than 2 parts (e.g., catbox.degenbox.fun)
  return hostname.split('.').length > 2;
}

export default function Header() {
  const { publicKey } = useWallet();
  const { config } = useNetworkStore();
    const isAdmin = publicKey && config?.adminWallet && publicKey.toString() === config.adminWallet.toString();

  // Track if we're on a subdomain (client-side only to avoid hydration mismatch)
  const [onSubdomain, setOnSubdomain] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [testActive, setTestActive] = useState(false);

  useEffect(() => {
    // Only run on client
    setOnSubdomain(isOnSubdomain());
    setBaseUrl(getBaseDomainUrl());
  }, []);

  // Test button handler - simulates clicking buy and getting 3 boxes confirmed
  const handleTestCamera = useCallback(() => {
    if (testActive) return;
    setTestActive(true);
    usePurchasingStore.getState().startPurchasing(3); // Move camera to purchase position, expect 3 boxes

    // Simulate batch confirmation after a short delay (like wallet signing)
    setTimeout(() => {
      usePurchasingStore.getState().queueBoxDrops(3);
    }, 500);

    // Reset test button state after animation completes
    // (endPurchasing is called automatically when all boxes have dropped)
    setTimeout(() => {
      setTestActive(false);
    }, 5000);
  }, [testActive]);

  // Build href - use absolute URL only when on subdomain, otherwise use relative path
  const getHref = (path) => {
    if (onSubdomain && baseUrl) {
      return `${baseUrl}${path}`;
    }
    return path;
  };

  return (
    <header className="fixed top-0 left-0 w-full h-14 flex items-center justify-between px-4 bg-degen-bg border-b border-degen-black z-50">
      {/* Logo / Brand - links to base domain homepage */}
      {onSubdomain ? (
        <a href={baseUrl || '/'} className="flex items-center hover:opacity-80 transition-opacity">
          <Image
            src="/images/degenboxlogo.svg"
            alt="DegenBox"
            width={40}
            height={40}
            className="h-[35px] w-auto"
          />
        </a>
      ) : (
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <Image
            src="/images/degenboxlogo.svg"
            alt="DegenBox"
            width={40}
            height={40}
            className="h-[35px] w-auto"
          />
        </Link>
      )}

      {/* Navigation & Wallet */}
      <div className="flex items-center">
        {publicKey && (
          <>
            {onSubdomain ? (
              <a
                href={getHref('/dashboard')}
                className="px-4 py-2 text-degen-black/80 hover:text-degen-black hover:bg-degen-black/5 transition-colors font-medium text-sm uppercase tracking-wider"
              >
                Dashboard
              </a>
            ) : (
              <Link
                href="/dashboard"
                className="px-4 py-2 text-degen-black/80 hover:text-degen-black hover:bg-degen-black/5 transition-colors font-medium text-sm uppercase tracking-wider"
              >
                Dashboard
              </Link>
            )}

            {isAdmin && (
              onSubdomain ? (
                <a
                  href={getHref('/admin')}
                  className="px-4 py-2 text-degen-feature hover:bg-degen-feature/10 transition-colors font-medium text-sm uppercase tracking-wider"
                >
                  Admin
                </a>
              ) : (
                <Link
                  href="/admin"
                  className="px-4 py-2 text-degen-feature hover:bg-degen-feature/10 transition-colors font-medium text-sm uppercase tracking-wider"
                >
                  Admin
                </Link>
              )
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
