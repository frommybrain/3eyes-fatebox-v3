'use client';

import { useRef } from 'react';

export default function DegenAccordion({
  title = 'Advanced',
  children,
  defaultOpen = false,
  className = '',
}) {
  const contentRef = useRef(null);
  const iconRef = useRef(null);
  const isOpenRef = useRef(defaultOpen);

  const handleToggle = () => {
    const content = contentRef.current;
    const icon = iconRef.current;
    if (!content || !icon) return;

    isOpenRef.current = !isOpenRef.current;

    if (isOpenRef.current) {
      content.style.maxHeight = `${content.scrollHeight}px`;
      content.style.opacity = '1';
      icon.style.transform = 'rotate(180deg)';
    } else {
      content.style.maxHeight = '0';
      content.style.opacity = '0';
      icon.style.transform = 'rotate(0deg)';
    }
  };

  return (
    <div className={`border border-degen-black ${className}`}>
      {/* Header - clickable toggle */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-degen-container hover:bg-degen-bg transition-colors"
      >
        <span className="text-degen-black font-medium text-sm uppercase tracking-wider">
          {title}
        </span>
        <span
          ref={iconRef}
          className="transition-transform duration-200"
          style={{ transform: defaultOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="square"
          >
            <path d="M2 4L6 8L10 4" />
          </svg>
        </span>
      </button>

      {/* Content - collapsible */}
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-200 ease-out"
        style={{
          maxHeight: defaultOpen ? 'none' : 0,
          opacity: defaultOpen ? 1 : 0,
        }}
      >
        <div className="px-4 py-4 border-t border-degen-black bg-degen-white">
          {children}
        </div>
      </div>
    </div>
  );
}
