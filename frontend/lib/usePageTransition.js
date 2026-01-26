'use client';

import { useRouter } from 'next/navigation';
import { useCallback, startTransition } from 'react';

/**
 * Hook for smooth page transitions using the View Transitions API
 * Falls back to regular navigation if not supported
 */
export function usePageTransition() {
    const router = useRouter();

    const navigateWithTransition = useCallback((href, options = {}) => {
        const {
            onBeforeNavigate,
            fallbackDelay = 300 // Delay for browsers without View Transitions
        } = options;

        // Call optional callback before navigation
        if (onBeforeNavigate) {
            onBeforeNavigate();
        }

        // Check if View Transitions API is supported
        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
            // Use View Transitions API for smooth transition
            document.startViewTransition(() => {
                startTransition(() => {
                    router.push(href);
                });
            });
        } else {
            // Fallback: small delay to allow exit animation to play
            setTimeout(() => {
                startTransition(() => {
                    router.push(href);
                });
            }, fallbackDelay);
        }
    }, [router]);

    return { navigateWithTransition };
}

/**
 * Hook to detect if we're entering from a transition
 * Uses sessionStorage to track navigation source
 */
export function useEntranceAnimation(key = 'page-entrance') {
    // This runs on mount, so we check if there's a transition marker
    if (typeof window !== 'undefined') {
        const marker = sessionStorage.getItem(key);
        if (marker) {
            sessionStorage.removeItem(key);
            return true;
        }
    }
    return false;
}

/**
 * Mark that we're about to navigate (for entrance detection)
 */
export function markTransition(key = 'page-entrance') {
    if (typeof window !== 'undefined') {
        sessionStorage.setItem(key, 'true');
    }
}
