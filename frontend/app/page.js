// app/page.js
'use client';

import { useRef } from 'react';
import MainCanvas from '@/components/three/mainCanvas';
import Link from 'next/link';
import DegenMarquee from '@/components/ui/DegenMarquee';

export default function Home() {
  const panelRef = useRef(null);
  const dotRef = useRef(null);

  const handleMouseEnter = () => {
    if (panelRef.current) {
      panelRef.current.style.height = '40dvh';
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
            {/* Content will go here */}
          </div>

          {/* Main button */}
          <Link
            href="/dashboard/create"
            className="flex items-stretch border border-degen-black"
          >
            {/* Text section */}
            <span className="px-8 py-4 bg-degen-yellow text-degen-black font-medium text-lg uppercase tracking-wider hover:bg-degen-black hover:text-degen-yellow transition-colors duration-100">
              Start a Project
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
