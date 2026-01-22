// components/ui/SiteFooter.jsx
'use client';

import { useRef } from 'react';
import Link from 'next/link';
import DegenMarquee from './DegenMarquee';

export default function SiteFooter() {
    const panelRef = useRef(null);
    const dotRef = useRef(null);

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

    return (
        <>
            {/* Marquee ticker - runs full width at bottom, behind button */}
            <div className="fixed bottom-0 left-0 w-screen h-[62px] bg-white border-t border-degen-black z-40 flex items-center">
                <DegenMarquee speed={50} />
            </div>

            {/* UI Overlay with navigation button */}
            <div className="fixed w-screen h-screen top-0 left-0 z-50 pointer-events-none">
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
                            <Link
                                href="/about"
                                className="px-8 py-3 text-degen-black font-medium text-sm uppercase tracking-wider hover:bg-degen-black hover:text-white transition-colors duration-100 border-b border-degen-black/20"
                            >
                                What is DegenBox
                            </Link>
                            <Link
                                href="/roadmap"
                                className="px-8 py-3 text-degen-black font-medium text-sm uppercase tracking-wider hover:bg-degen-black hover:text-white transition-colors duration-100 border-b border-degen-black/20"
                            >
                                Roadmap
                            </Link>
                            <a
                                href="https://jup.ag/?sell=So11111111111111111111111111111111111111112&buy=G63pAYWkZd71Jdy83bbdvs6HMQxaYVWy5jsS1hK3pump"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-8 py-3 bg-red-500 text-white font-medium text-sm uppercase tracking-wider hover:bg-red-600 transition-colors duration-100"
                            >
                                Buy $3EYES
                            </a>
                        </nav>
                    </div>

                    {/* Main button */}
                    <button
                        className="flex items-stretch border border-degen-black cursor-pointer"
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
                    </button>
                </div>
            </div>
        </>
    );
}
