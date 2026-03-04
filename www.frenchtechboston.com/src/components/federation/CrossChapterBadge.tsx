interface CrossChapterBadgeProps {
  chapterName: string;
  chapterSlug?: string;
  size?: 'sm' | 'md';
  variant?: 'default' | 'contact';
}

/**
 * Badge indicating content is from another French Tech chapter.
 * Used in investor cards and contact lists to show cross-chapter data.
 */
export default function CrossChapterBadge({
  chapterName,
  chapterSlug,
  size = 'sm',
  variant = 'default',
}: CrossChapterBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
  };

  const variantClasses = {
    default: 'bg-blue-100 text-blue-700 border-blue-200',
    contact: 'bg-purple-100 text-purple-700 border-purple-200',
  };

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${sizeClasses[size]}
        ${variantClasses[variant]}
      `}
    >
      {/* Globe/network icon */}
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
        />
      </svg>
      {chapterName}
    </span>
  );
}

/**
 * Banner displayed when viewing a federated investor directory.
 */
interface FederatedDirectoryBannerProps {
  chapterName: string;
  onSwitchToLocal: () => void;
}

export function FederatedDirectoryBanner({
  chapterName,
  onSwitchToLocal,
}: FederatedDirectoryBannerProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-blue-900">
            Browsing {chapterName}'s Investor Directory
          </p>
          <p className="text-sm text-blue-700">
            These investors are from another French Tech chapter. Request intros through their members.
          </p>
        </div>
      </div>
      <button
        onClick={onSwitchToLocal}
        className="px-4 py-2 text-blue-700 hover:text-blue-800 font-medium text-sm flex items-center gap-1"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to local
      </button>
    </div>
  );
}

/**
 * Indicator shown on intro request modal for cross-chapter requests.
 */
interface CrossChapterIntroIndicatorProps {
  originChapterName: string;
  targetChapterName: string;
}

export function CrossChapterIntroIndicator({
  originChapterName,
  targetChapterName,
}: CrossChapterIntroIndicatorProps) {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2 text-purple-800">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
          />
        </svg>
        <span className="font-medium text-sm">Cross-Chapter Introduction</span>
      </div>
      <p className="text-sm text-purple-700 mt-1">
        This request will be sent from <strong>{originChapterName}</strong> to a member of{' '}
        <strong>{targetChapterName}</strong>. They'll see your name and company, but not your contact
        info until they accept.
      </p>
    </div>
  );
}
