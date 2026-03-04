import { useState, useRef, useEffect } from 'react';

interface ChapterOption {
  slug: string;
  name: string;
  isCurrent: boolean;
}

interface ChapterSelectorProps {
  chapters: ChapterOption[];
  selectedChapter: string;
  onSelect: (slug: string) => void;
  disabled?: boolean;
}

/**
 * Dropdown selector for switching between French Tech chapters.
 * Shows "Local" indicator for the current chapter.
 */
export default function ChapterSelector({
  chapters,
  selectedChapter,
  onSelect,
  disabled = false,
}: ChapterSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = chapters.find((c) => c.slug === selectedChapter);
  const isViewingRemote = selectedOption && !selectedOption.isCurrent;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-colors
          ${isViewingRemote
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-white/90 border-gray-200 text-gray-700 hover:border-gray-300'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {/* Network icon */}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>

        <span className="font-medium">
          {selectedOption?.isCurrent ? 'Local Directory' : selectedOption?.name || 'Select Chapter'}
        </span>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
          <div className="py-1">
            {chapters.map((chapter) => (
              <button
                key={chapter.slug}
                type="button"
                onClick={() => {
                  onSelect(chapter.slug);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-4 py-2.5 text-left flex items-center justify-between
                  transition-colors
                  ${chapter.slug === selectedChapter
                    ? 'bg-red-50 text-red-700'
                    : 'hover:bg-gray-50 text-gray-700'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  {chapter.isCurrent ? (
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                  )}
                  <span className="font-medium">{chapter.name}</span>
                </div>

                {chapter.slug === selectedChapter && (
                  <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-gray-100 px-4 py-2 bg-gray-50">
            <p className="text-xs text-gray-500">
              Browse investor directories from other French Tech chapters
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
