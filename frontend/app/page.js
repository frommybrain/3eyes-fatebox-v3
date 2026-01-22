// app/page.js
'use client';

import { useRef } from 'react';
import MainCanvas from '@/components/three/mainCanvas';
import Link from 'next/link';
import DegenMarquee from '@/components/ui/DegenMarquee';
import useViewStore, { ABOUT_POSITIONS } from '@/store/useViewStore';

export default function Home() {
  const panelRef = useRef(null);
  const dotRef = useRef(null);
  const { currentView, aboutIndex, setView, goHome, nextAbout, prevAbout } = useViewStore();

  const handleMouseEnter = () => {
    if (panelRef.current) {
      panelRef.current.style.height = 'auto';
      panelRef.current.style.opacity = '1';
    }
    if (dotRef.current) {
      dotRef.current.style.width = '1.5rem';
      dotRef.current.style.height = '1.5rem';
      dotRef.current.style.backgroundColor = 'transparent';
      dotRef.current.style.border = '2px solid #1a1a1a';
    }
  };

  const handleMouseLeave = () => {
    if (panelRef.current) {
      panelRef.current.style.height = '0';
      panelRef.current.style.opacity = '0';
    }
    if (dotRef.current) {
      dotRef.current.style.width = '0.5rem';
      dotRef.current.style.height = '0.5rem';
      dotRef.current.style.backgroundColor = '#1a1a1a';
      dotRef.current.style.border = 'none';
    }
  };

  // Handle About view click - camera transition instead of navigation
  const handleAboutClick = (e) => {
    e.preventDefault();
    setView('about');
    // Close menu after selection
    handleMouseLeave();
  };

  return (
    <>
      {/* Canvas sits at z-0, receives all pointer events */}
      <MainCanvas />

      {/* Marquee ticker - runs full width at bottom, behind button (same height as button: py-4 + text) */}
      <div className="fixed bottom-0 left-0 w-screen h-[62px] bg-white border-t border-degen-black z-40 flex items-center">
        <DegenMarquee speed={50} />
      </div>

      {/* UI Overlay */}
      <div className="absolute w-screen h-screen top-0 left-0 z-50 pointer-events-none">
        {/* Navigation controls when in about view */}
        {currentView === 'about' && (
          <div className="absolute bottom-48 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-2">
            {/* Back button */}
            <button
              onClick={goHome}
              className="px-4 py-2 bg-white text-degen-black font-medium text-sm uppercase tracking-wider border border-degen-black hover:bg-degen-black hover:text-white transition-colors"
            >
              ← Back
            </button>

            {/* Previous arrow */}
            <button
              onClick={prevAbout}
              className="w-10 h-10 bg-white text-degen-black font-bold text-lg border border-degen-black hover:bg-degen-black hover:text-white transition-colors flex items-center justify-center"
              aria-label="Previous view"
            >
              ←
            </button>

            {/* Position indicator */}
            <span className="px-3 py-2 bg-white text-degen-black font-medium text-sm border border-degen-black">
              {aboutIndex + 1} / {ABOUT_POSITIONS.length}
            </span>

            {/* Next arrow */}
            <button
              onClick={nextAbout}
              className="w-10 h-10 bg-white text-degen-black font-bold text-lg border border-degen-black hover:bg-degen-black hover:text-white transition-colors flex items-center justify-center"
              aria-label="Next view"
            >
              →
            </button>
          </div>
        )}

        {/* Button container - positioned bottom right */}
        <div
          className="absolute bottom-0 right-0 pointer-events-auto"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Expanding panel that reveals upward */}
          <div
            ref={panelRef}
            className="absolute bottom-full right-0 w-full bg-white border border-degen-black border-b-0 overflow-hidden transition-all duration-300 ease-out"
            style={{ height: 0, opacity: 0 }}
          >
            <nav className="flex flex-col">
              <a
                href="https://3eyes.degenbox.fun"
                className="px-8 py-3 text-degen-black font-medium text-sm uppercase tracking-wider hover:bg-degen-black hover:text-white transition-colors duration-100 border-b border-degen-black/20"
              >
                Buy A Box
              </a>
              <button
                onClick={handleAboutClick}
                className="px-8 py-3 text-degen-black font-medium text-sm uppercase tracking-wider hover:bg-degen-black hover:text-white transition-colors duration-100 border-b border-degen-black/20 text-left"
              >
                What is DegenBox
              </button>
              <Link
                href="/roadmap"
                className="px-8 py-3 text-degen-black font-medium text-sm uppercase tracking-wider hover:bg-degen-black hover:text-white transition-colors duration-100 border-b border-degen-black/20"
              >
                Roadmap
              </Link>
              <a
                href="https://pump.fun/coin/G63pAYWkZd71Jdy83bbdvs6HMQxaYVWy5jsS1hK3pump"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-3 bg-red-500 text-white font-medium text-sm uppercase tracking-wider hover:bg-red-600 transition-colors duration-100"
              >
                Buy $3EYES
              </a>
            </nav>
          </div>

          {/* Main button */}
          <Link
            href="/dashboard/create"
            className="flex items-stretch border border-degen-black"
          >
            {/* Text section */}
            <span className="px-8 py-4 bg-degen-yellow text-degen-black font-medium text-lg uppercase tracking-wider hover:bg-degen-black hover:text-degen-yellow transition-colors duration-100">
              Start Here
            </span>

            {/* Dot/Circle section */}
            <span className="w-14 bg-white flex items-center justify-center border-l border-degen-black">
              <span
                ref={dotRef}
                className="rounded-full transition-all duration-300 ease-out"
                style={{
                  width: '0.5rem',
                  height: '0.5rem',
                  backgroundColor: '#1a1a1a',
                }}
              />
            </span>
          </Link>
        </div>
      </div>
    </>
  );
}
