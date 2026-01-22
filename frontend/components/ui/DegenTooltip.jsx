// components/ui/DegenTooltip.jsx
'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * A simple hover tooltip component with Degen styling
 * @param {Object} props
 * @param {React.ReactNode} props.children - The element to wrap with tooltip
 * @param {string} props.content - The tooltip text content
 * @param {string} props.position - Position of tooltip: 'top' | 'bottom' | 'left' | 'right' (default: 'top')
 * @param {number} props.maxWidth - Max width of tooltip in pixels (default: 280)
 * @param {boolean} props.disabled - If true, tooltip won't show
 */
export default function DegenTooltip({
    children,
    content,
    position = 'top',
    maxWidth = 280,
    disabled = false,
}) {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);

    useEffect(() => {
        if (isVisible && triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            const padding = 8;

            let top = 0;
            let left = 0;

            switch (position) {
                case 'top':
                    top = triggerRect.top - tooltipRect.height - padding;
                    left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
                    break;
                case 'bottom':
                    top = triggerRect.bottom + padding;
                    left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
                    break;
                case 'left':
                    top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
                    left = triggerRect.left - tooltipRect.width - padding;
                    break;
                case 'right':
                    top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
                    left = triggerRect.right + padding;
                    break;
            }

            // Keep tooltip within viewport
            const viewportPadding = 10;
            if (left < viewportPadding) left = viewportPadding;
            if (left + tooltipRect.width > window.innerWidth - viewportPadding) {
                left = window.innerWidth - tooltipRect.width - viewportPadding;
            }
            if (top < viewportPadding) top = viewportPadding;
            if (top + tooltipRect.height > window.innerHeight - viewportPadding) {
                top = window.innerHeight - tooltipRect.height - viewportPadding;
            }

            setCoords({ top, left });
        }
    }, [isVisible, position]);

    if (disabled || !content) {
        return children;
    }

    return (
        <>
            <span
                ref={triggerRef}
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                className="inline-block"
            >
                {children}
            </span>

            {isVisible && (
                <div
                    ref={tooltipRef}
                    className="fixed z-[9999] px-3 py-2 text-sm bg-degen-black text-white border border-degen-black shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
                    style={{
                        top: coords.top,
                        left: coords.left,
                        maxWidth: maxWidth,
                    }}
                >
                    {content}
                </div>
            )}
        </>
    );
}
