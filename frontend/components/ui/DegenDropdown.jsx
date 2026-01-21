'use client';

import { useState, useRef, useEffect } from 'react';

/**
 * DegenDropdown - A styled dropdown/select component
 * Matches the site-wide degen style with black borders and uppercase text
 *
 * @param {Object} props
 * @param {Array} props.options - Array of { value, label, count? } objects
 * @param {string} props.value - Currently selected value
 * @param {function} props.onChange - Callback when selection changes (receives value)
 * @param {string} props.placeholder - Placeholder text when no selection
 * @param {string} props.className - Additional classes for the container
 * @param {boolean} props.showCounts - Whether to show count badges (default: true)
 */
export default function DegenDropdown({
    options = [],
    value,
    onChange,
    placeholder = 'Select...',
    className = '',
    showCounts = true,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Find the selected option
    const selectedOption = options.find(opt => opt.value === value);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Close dropdown on escape key
    useEffect(() => {
        function handleEscape(event) {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            return () => document.removeEventListener('keydown', handleEscape);
        }
    }, [isOpen]);

    const handleSelect = (optionValue) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div ref={dropdownRef} className={`relative ${className}`}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full px-3 py-2
                    bg-white text-degen-black
                    border border-degen-black
                    text-xs font-medium uppercase tracking-wider
                    flex items-center justify-between gap-2
                    transition-colors duration-100
                    ${isOpen ? 'bg-degen-container' : 'hover:bg-degen-container'}
                `}
            >
                <span className="flex items-center gap-2 truncate">
                    {selectedOption ? (
                        <>
                            {selectedOption.label}
                            {showCounts && selectedOption.count !== undefined && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-degen-container text-degen-text-muted rounded-sm">
                                    {selectedOption.count}
                                </span>
                            )}
                        </>
                    ) : (
                        <span className="text-degen-text-muted">{placeholder}</span>
                    )}
                </span>
                {/* Chevron */}
                <svg
                    className={`w-4 h-4 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-degen-black shadow-lg max-h-60 overflow-auto">
                    {options.map((option) => {
                        const isSelected = option.value === value;
                        // Skip options with 0 count (except 'all' or if counts aren't shown)
                        if (showCounts && option.count === 0 && option.value !== 'all') {
                            return null;
                        }

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => handleSelect(option.value)}
                                className={`
                                    w-full px-3 py-2
                                    text-xs font-medium uppercase tracking-wider
                                    flex items-center justify-between gap-2
                                    transition-colors duration-100
                                    ${isSelected
                                        ? 'bg-degen-black text-white'
                                        : 'text-degen-black hover:bg-degen-container'
                                    }
                                `}
                            >
                                <span>{option.label}</span>
                                {showCounts && option.count !== undefined && (
                                    <span className={`
                                        text-[10px] px-1.5 py-0.5 rounded-sm
                                        ${isSelected
                                            ? 'bg-white/20 text-white'
                                            : 'bg-degen-container text-degen-text-muted'
                                        }
                                    `}>
                                        {option.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
