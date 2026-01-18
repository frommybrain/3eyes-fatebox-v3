'use client';

import { useRef, useEffect } from 'react';

const ITEMS = [
  'Gambling brings the people together',
  '$3EYES ↑ 256.4K',
  'fate is such a tease',
];

export default function DegenMarquee({ speed = 50, className = '' }) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    // Clone content for seamless loop
    const clone = content.cloneNode(true);
    container.appendChild(clone);

    let position = 0;
    let animationId;

    const animate = () => {
      position -= speed / 60; // Normalize speed per frame

      // Reset position when first set scrolls out
      if (Math.abs(position) >= content.offsetWidth) {
        position = 0;
      }

      container.style.transform = `translateX(${position}px)`;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      // Clean up clone
      if (clone.parentNode) {
        clone.parentNode.removeChild(clone);
      }
    };
  }, [speed]);

  return (
    <div className={`overflow-hidden whitespace-nowrap ${className}`}>
      <div ref={containerRef} className="inline-flex">
        <div ref={contentRef} className="inline-flex items-center">
          {ITEMS.map((item, index) => (
            <span key={index} className="inline-flex items-center">
              <span className="px-6 text-sm font-medium uppercase tracking-wider text-degen-black">
                {item}
              </span>
              <span className="w-1.5 h-1.5 bg-degen-black rounded-full" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
