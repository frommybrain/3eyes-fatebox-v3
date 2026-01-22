'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

/**
 * LoadingOverlay - Full-screen loading overlay with DegenBox logo
 * Shows while page assets are loading, then fades out smoothly
 *
 * @param {boolean} isLoading - Whether to show the overlay
 * @param {number} minDuration - Minimum time to show overlay (ms) to avoid flash
 */
export default function LoadingOverlay({ isLoading, minDuration = 500 }) {
    // Track if we've ever started showing (only show if isLoading was true)
    // Initialize to true if isLoading is already true to prevent flash of content
    const [hasStarted, setHasStarted] = useState(isLoading);
    const [visible, setVisible] = useState(isLoading);
    const [fadeOut, setFadeOut] = useState(false);
    const [loadProgress, setLoadProgress] = useState(0);
    const startTimeRef = useRef(isLoading ? Date.now() : null);

    // Start showing overlay when isLoading becomes true
    useEffect(() => {
        if (isLoading && !hasStarted) {
            setHasStarted(true);
            setVisible(true);
            setFadeOut(false);
            setLoadProgress(0);
            startTimeRef.current = Date.now();
        }
    }, [isLoading, hasStarted]);

    // Simulate loading progress
    useEffect(() => {
        if (isLoading && hasStarted && loadProgress < 90) {
            const interval = setInterval(() => {
                setLoadProgress(prev => {
                    const increment = Math.max(1, (90 - prev) / 10);
                    return Math.min(90, prev + increment);
                });
            }, 100);
            return () => clearInterval(interval);
        }
    }, [isLoading, hasStarted, loadProgress]);

    // Complete loading when done - quickly fill to 100%
    useEffect(() => {
        if (!isLoading && hasStarted && loadProgress < 100) {
            // If progress hasn't started yet, jump to 100 immediately
            if (loadProgress === 0) {
                setLoadProgress(100);
                return;
            }
            // Otherwise animate to 100
            const interval = setInterval(() => {
                setLoadProgress(prev => Math.min(100, prev + 5));
            }, 20);
            return () => clearInterval(interval);
        }
    }, [isLoading, hasStarted, loadProgress]);

    // Handle fade out when loading completes
    useEffect(() => {
        if (!isLoading && hasStarted && loadProgress >= 100) {
            const elapsed = Date.now() - (startTimeRef.current || Date.now());
            const remainingTime = Math.max(0, minDuration - elapsed);

            const timer = setTimeout(() => {
                setFadeOut(true);
                // Remove from DOM after fade completes
                setTimeout(() => {
                    setVisible(false);
                    setHasStarted(false); // Reset for potential future use
                }, 500);
            }, remainingTime);

            return () => clearTimeout(timer);
        }
    }, [isLoading, hasStarted, loadProgress, minDuration]);

    // Don't render if not visible or never started
    if (!visible || !hasStarted) return null;

    return (
        <div
            className={`
                fixed inset-0 z-[100] bg-white
                flex flex-col items-center justify-center
                transition-opacity duration-500 ease-out
                ${fadeOut ? 'opacity-0' : 'opacity-100'}
            `}
        >
            {/* Logo */}
            <div className="w-64 max-w-[80vw]">
                <Image
                    src="/images/degenboxlogo.svg"
                    alt="DegenBox"
                    width={572}
                    height={79}
                    priority
                    className="w-full h-auto"
                />
            </div>

            {/* BY 3EYES text */}
            <p className="text-degen-text-muted text-sm uppercase tracking-[0.3em] mt-4">
                by 3eyes
            </p>

            {/* Loading bar */}
            <div className="w-48 max-w-[60vw] mt-6">
                <div className="h-2 bg-gray-200 overflow-hidden">
                    <div
                        className="h-full bg-[#ff0000] transition-all duration-100 ease-out"
                        style={{ width: `${loadProgress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
