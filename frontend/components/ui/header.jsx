'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import WalletButton from '@/components/wallet/WalletButton';
import useNetworkStore from '@/store/useNetworkStore';
import usePurchasingStore from '@/store/usePurchasingStore';

// Chevron Down Icon
function ChevronDownIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// Hook to safely get client-side window values after hydration
function useClientValue(getClientValue, serverValue) {
  return useSyncExternalStore(
    () => () => {}, // subscribe (no-op, value doesn't change)
    getClientValue,  // getSnapshot (client)
    () => serverValue // getServerSnapshot
  );
}

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

  const [testActive, setTestActive] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Use useSyncExternalStore for hydration-safe client-side values
  const onSubdomain = useClientValue(isOnSubdomain, false);
  const baseUrl = useClientValue(getBaseDomainUrl, '');

  // Close mobile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMobileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Build href - use absolute URL only when on subdomain, otherwise use relative path
  const getHref = (path) => {
    if (onSubdomain && baseUrl) {
      return `${baseUrl}${path}`;
    }
    return path;
  };

  return (
    <header className="fixed top-0 left-0 w-full h-14 flex items-center justify-between px-2 md:px-4 bg-degen-bg border-b border-degen-black z-50">
      {/* Logo - D icon on mobile, full logo on desktop */}
      {onSubdomain ? (
        <a href={baseUrl || '/'} className="flex items-center hover:opacity-80 transition-opacity">
          {/* Mobile: D logo */}
          <Image
            src="/images/degenboxLogo_D.svg"
            alt="DegenBox"
            width={35}
            height={35}
            className="h-[35px] w-auto md:hidden"
          />
          {/* Desktop: Full logo */}
          <Image
            src="/images/degenboxlogo.svg"
            alt="DegenBox"
            width={150}
            height={35}
            className="h-[35px] w-auto hidden md:block"
          />
        </a>
      ) : (
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          {/* Mobile: D logo */}
          <Image
            src="/images/degenboxLogo_D.svg"
            alt="DegenBox"
            width={35}
            height={35}
            className="h-[35px] w-auto md:hidden"
          />
          {/* Desktop: Full logo */}
          <Image
            src="/images/degenboxlogo.svg"
            alt="DegenBox"
            width={150}
            height={35}
            className="h-[35px] w-auto hidden md:block"
          />
        </Link>
      )}

      {/* Navigation & Wallet */}
      <div className="flex items-center">
        {publicKey && (
          <>
            {/* Mobile: Dropdown menu */}
            <div className="relative md:hidden" ref={menuRef}>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex items-center justify-center w-8 h-8 rounded-full border border-degen-black hover:bg-degen-black/5 transition-colors mr-2"
                aria-label="Menu"
              >
                <ChevronDownIcon className={`w-4 h-4 text-degen-black transition-transform ${mobileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {mobileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 bg-white border border-degen-black shadow-lg min-w-[150px]">
                  {onSubdomain ? (
                    <a
                      href={getHref('/dashboard')}
                      className="block px-4 py-3 text-degen-black hover:bg-degen-black/5 transition-colors font-medium text-sm uppercase tracking-wider"
                    >
                      Dashboard
                    </a>
                  ) : (
                    <Link
                      href="/dashboard"
                      className="block px-4 py-3 text-degen-black hover:bg-degen-black/5 transition-colors font-medium text-sm uppercase tracking-wider"
                    >
                      Dashboard
                    </Link>
                  )}
                  {isAdmin && (
                    onSubdomain ? (
                      <a
                        href={getHref('/admin')}
                        className="block px-4 py-3 text-degen-feature hover:bg-degen-feature/10 transition-colors font-medium text-sm uppercase tracking-wider border-t border-degen-black/10"
                      >
                        Admin
                      </a>
                    ) : (
                      <Link
                        href="/admin"
                        className="block px-4 py-3 text-degen-feature hover:bg-degen-feature/10 transition-colors font-medium text-sm uppercase tracking-wider border-t border-degen-black/10"
                      >
                        Admin
                      </Link>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Desktop: Regular nav links */}
            <div className="hidden md:flex items-center">
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
            </div>
          </>
        )}

        <div className="ml-2 border-l border-degen-black/20 pl-4">
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
