'use client';

import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * TransitionOverlay - Full-screen overlay for smooth page transitions
 *
 * Uses sessionStorage to coordinate between pages:
 * - 'transition-active': overlay should be visible
 * - 'transition-ready': destination page is ready to reveal
 */
export default function TransitionOverlay() {
    const [mounted, setMounted] = useState(false);
    const [phase, setPhase] = useState('hidden'); // 'hidden' | 'covering' | 'covered' | 'revealing'

    useEffect(() => {
        setMounted(true);

        // Check if we should show overlay on mount (arriving from transition)
        if (typeof window !== 'undefined') {
            const isActive = sessionStorage.getItem('transition-active');
            if (isActive) {
                // We arrived from a transition - start in covered state
                setPhase('covered');
            }
        }

        return () => setMounted(false);
    }, []);

    // Listen for custom events to control overlay
    useEffect(() => {
        if (!mounted) return;

        const handleStartTransition = () => {
            setPhase('covering');
            sessionStorage.setItem('transition-active', 'true');
        };

        const handleRevealPage = () => {
            setPhase('revealing');
            // Clean up after reveal animation
            setTimeout(() => {
                setPhase('hidden');
                sessionStorage.removeItem('transition-active');
            }, 400);
        };

        window.addEventListener('transition-start', handleStartTransition);
        window.addEventListener('transition-reveal', handleRevealPage);

        return () => {
            window.removeEventListener('transition-start', handleStartTransition);
            window.removeEventListener('transition-reveal', handleRevealPage);
        };
    }, [mounted]);

    // Handle covering animation end
    const handleAnimationEnd = useCallback((e) => {
        if (e.animationName === 'overlay-cover' && phase === 'covering') {
            setPhase('covered');
        }
    }, [phase]);

    if (!mounted || phase === 'hidden') return null;

    const overlayContent = (
        <div
            className={`
                fixed inset-0 z-[9999] bg-degen-bg
                ${phase === 'covering' ? 'animate-overlay-cover' : ''}
                ${phase === 'covered' ? 'opacity-100' : ''}
                ${phase === 'revealing' ? 'animate-overlay-reveal' : ''}
            `}
            onAnimationEnd={handleAnimationEnd}
        >
            {/* Optional: Loading indicator while covered */}
            {(phase === 'covered' || phase === 'covering') && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-degen-green border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </div>
    );

    return createPortal(overlayContent, document.body);
}

/**
 * Hook to trigger page transitions
 */
export function useTransitionOverlay() {
    const startTransition = useCallback((callback) => {
        // Dispatch event to show overlay
        window.dispatchEvent(new CustomEvent('transition-start'));

        // Wait for cover animation, then execute callback
        setTimeout(() => {
            if (callback) callback();
        }, 300); // Match animation duration
    }, []);

    const revealPage = useCallback(() => {
        // Small delay to ensure content is rendered
        requestAnimationFrame(() => {
            window.dispatchEvent(new CustomEvent('transition-reveal'));
        });
    }, []);

    return { startTransition, revealPage };
}

/**
 * Check if we arrived via transition (call on mount)
 */
export function checkTransitionArrival() {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('transition-active') === 'true';
}
