'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';

/**
 * DegenCarousel - Infinite carousel with sliding transitions
 * Shows one slide at a time with arrow and dot navigation
 */
export default function DegenCarousel({
    slides = [],
    showDots = true,
    showArrows = true,
    className = '',
}) {
    // For infinite scroll, we prepend the last slide and append the first slide
    // So the order is: [last, ...original, first]
    // This allows seamless looping in both directions
    const [currentIndex, setCurrentIndex] = useState(1); // Start at 1 (first real slide)
    const [isTransitioning, setIsTransitioning] = useState(true);
    const containerRef = useRef(null);

    // Create extended slides array: [last, ...original, first]
    const extendedSlides = slides.length > 0
        ? [slides[slides.length - 1], ...slides, slides[0]]
        : [];

    // Get the actual slide index (0-based) for dots
    const getActualIndex = useCallback(() => {
        if (currentIndex === 0) return slides.length - 1;
        if (currentIndex === extendedSlides.length - 1) return 0;
        return currentIndex - 1;
    }, [currentIndex, slides.length, extendedSlides.length]);

    const goToNext = useCallback(() => {
        setIsTransitioning(true);
        setCurrentIndex((prev) => prev + 1);
    }, []);

    const goToPrev = useCallback(() => {
        setIsTransitioning(true);
        setCurrentIndex((prev) => prev - 1);
    }, []);

    const goToSlide = useCallback((actualIndex) => {
        setIsTransitioning(true);
        setCurrentIndex(actualIndex + 1); // +1 because of prepended slide
    }, []);

    // Handle the infinite loop jump (no transition)
    useEffect(() => {
        if (!isTransitioning) return;

        const handleTransitionEnd = () => {
            // If we're at the clone of the first slide (end), jump to real first
            if (currentIndex === extendedSlides.length - 1) {
                setIsTransitioning(false);
                setCurrentIndex(1);
            }
            // If we're at the clone of the last slide (start), jump to real last
            else if (currentIndex === 0) {
                setIsTransitioning(false);
                setCurrentIndex(slides.length);
            }
        };

        const timer = setTimeout(handleTransitionEnd, 500); // Match transition duration
        return () => clearTimeout(timer);
    }, [currentIndex, extendedSlides.length, slides.length, isTransitioning]);

    // Re-enable transitions after instant jump
    useEffect(() => {
        if (!isTransitioning) {
            // Small delay to allow the instant jump to complete
            const timer = setTimeout(() => setIsTransitioning(true), 50);
            return () => clearTimeout(timer);
        }
    }, [isTransitioning]);

    if (!slides.length) return null;

    return (
        <div className={`relative ${className}`}>
            {/* Slides Container - pt-3 to make room for the offset step number */}
            <div className="relative overflow-x-hidden overflow-y-visible pt-3">
                <div
                    ref={containerRef}
                    className={`flex ${isTransitioning ? 'transition-transform duration-500 ease-out' : ''}`}
                    style={{ transform: `translateX(-${currentIndex * 100}%)` }}
                >
                    {extendedSlides.map((slide, index) => {
                        // Calculate the actual step number (1-4)
                        let stepNumber;
                        if (index === 0) stepNumber = slides.length; // Clone of last
                        else if (index === extendedSlides.length - 1) stepNumber = 1; // Clone of first
                        else stepNumber = index;

                        return (
                            <div
                                key={index}
                                className="w-full shrink-0 px-8"
                            >
                                {/* Image with Step Number overlay */}
                                {slide.image && (
                                    <div className="w-full max-w-[200px] mx-auto aspect-square relative mb-4">
                                        <Image
                                            src={slide.image}
                                            alt={slide.title || ''}
                                            fill
                                            className="object-cover"
                                        />
                                        {/* Step Number - top left, offset */}
                                        <div className="absolute -top-2 -left-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-degen-black text-white font-bold text-sm z-10">
                                            {stepNumber}
                                        </div>
                                    </div>
                                )}

                                {/* Title */}
                                {slide.title && (
                                    <h3 className="font-bold uppercase tracking-wider text-degen-black mb-2 text-center">
                                        {slide.title}
                                    </h3>
                                )}

                                {/* Description */}
                                {slide.description && (
                                    <p className="text-sm text-degen-text-muted text-center px-2">
                                        {slide.description}
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Navigation Arrows */}
            {showArrows && slides.length > 1 && (
                <>
                    <button
                        onClick={goToPrev}
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-degen-text-muted hover:text-degen-black transition-colors"
                        aria-label="Previous slide"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>
                    <button
                        onClick={goToNext}
                        className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-degen-text-muted hover:text-degen-black transition-colors"
                        aria-label="Next slide"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>
                </>
            )}

            {/* Dots Navigation */}
            {showDots && slides.length > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`rounded-full transition-all ${
                                index === getActualIndex()
                                    ? 'w-2 h-2 bg-degen-black'
                                    : 'w-1.5 h-1.5 bg-degen-black/30 hover:bg-degen-black/50'
                            }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
