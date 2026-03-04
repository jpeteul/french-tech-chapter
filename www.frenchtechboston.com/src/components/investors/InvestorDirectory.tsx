import { useState, useEffect, useCallback } from 'react';
import {
  STAGE_LABELS,
  SECTOR_LABELS,
  GEO_LABELS,
  type InvestorStage,
  type InvestorSector,
  type InvestorGeo,
} from '../../lib/supabase';
import ChapterSelector from '../federation/ChapterSelector';
import { FederatedDirectoryBanner, CrossChapterIntroIndicator } from '../federation/CrossChapterBadge';

// Chapter options - matches network-registry.ts
// In production, this would be fetched or imported from the registry
const CHAPTER_OPTIONS = [
  { slug: 'boston', name: 'La French Tech Boston (Local)', isCurrent: true },
  { slug: 'sf', name: 'La French Tech San Francisco', isCurrent: false },
  { slug: 'nyc', name: 'La French Tech New York', isCurrent: false },
];

const LOCAL_CHAPTER_SLUG = 'boston';

interface Member {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  linkedin: string | null;
}

interface FederatedChapterInfo {
  slug: string;
  name: string;
}

interface InvestorContact {
  id: string;
  member_id: string;
  added_at: string;
  member: Member;
  is_current_user: boolean;
  is_federated?: boolean;
  federated_chapter?: FederatedChapterInfo;
}

interface Investor {
  id: string;
  name: string;
  firm: string | null;
  website: string | null;
  stage_focus: InvestorStage[];
  sector_focus: InvestorSector[];
  geo_focus: InvestorGeo[];
  check_size_min: number | null;
  check_size_max: number | null;
  notes: string | null;
  contact_count: number;
  contacts: InvestorContact[];
  is_federated?: boolean;
  federated_chapter?: FederatedChapterInfo;
}

interface IntroRequestModalProps {
  investor: Investor;
  contact: InvestorContact;
  selectedChapter: string;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
}

function IntroRequestModal({ investor, contact, selectedChapter, onClose, onSubmit }: IntroRequestModalProps) {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isCrossChapter = selectedChapter !== LOCAL_CHAPTER_SLUG;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Please explain why you believe you are a fit for this investor');
      return;
    }
    if (message.trim().length < 50) {
      setError('Please provide a more detailed message (at least 50 characters)');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      await onSubmit(message);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const targetChapterName = CHAPTER_OPTIONS.find((c) => c.slug === selectedChapter)?.name || selectedChapter;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Request Introduction to {investor.name}
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            via {contact.member.name}{contact.member.company ? ` (${contact.member.company})` : ''}
          </p>

          {/* Cross-chapter indicator */}
          {isCrossChapter && (
            <CrossChapterIntroIndicator
              originChapterName="La French Tech Boston"
              targetChapterName={targetChapterName}
            />
          )}

          {/* Golden Rule Reminder */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="font-semibold text-amber-800 mb-2">Introductions are earned, not owed.</p>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• <strong>Do your homework.</strong> Study the investor's thesis, portfolio, and stage focus.</li>
              <li>• <strong>Make it easy to say yes.</strong> Explain why you're a match, not just why you need funding.</li>
              <li>• <strong>Respect the answer.</strong> If someone declines, thank them and move on.</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Why do you believe you're a fit for this investor?
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              placeholder="Explain your company, stage, traction, and why this investor's thesis aligns with what you're building..."
              required
            />
            <p className="text-xs text-gray-500 mt-1 mb-4">
              This message will be shared with {contact.member.name} to help them decide whether to make the introduction.
              {isCrossChapter && ' Your email and LinkedIn will only be shared if they accept.'}
            </p>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !message.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function formatCheckSize(min: number | null, max: number | null): string {
  const format = (n: number) => {
    if (n >= 1000000) return `$${n / 1000000}M`;
    if (n >= 1000) return `$${n / 1000}K`;
    return `$${n}`;
  };

  if (min && max) return `${format(min)} - ${format(max)}`;
  if (min) return `${format(min)}+`;
  if (max) return `Up to ${format(max)}`;
  return '';
}

function InvestorCard({
  investor,
  currentMemberId,
  onRequestIntro,
  expandedId,
  onToggleExpand,
  isFederated,
}: {
  investor: Investor;
  currentMemberId: string;
  onRequestIntro: (investor: Investor, contact: InvestorContact) => void;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
  isFederated?: boolean;
}) {
  const isExpanded = expandedId === investor.id;
  const isCurrentUserContact = investor.contacts.some((c) => c.is_current_user);
  const checkSize = formatCheckSize(investor.check_size_min, investor.check_size_max);

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900 text-lg">{investor.name}</h3>
            {investor.firm && (
              <p className="text-gray-600">
                {investor.website ? (
                  <a
                    href={investor.website.startsWith('http') ? investor.website : `https://${investor.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-red-600 transition-colors"
                  >
                    {investor.firm} ↗
                  </a>
                ) : (
                  investor.firm
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isCurrentUserContact && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                You know them
              </span>
            )}
            {isFederated && investor.federated_chapter && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                {investor.federated_chapter.slug.toUpperCase()}
              </span>
            )}
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {investor.contact_count} {investor.contact_count === 1 ? 'contact' : 'contacts'}
            </span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {investor.stage_focus.map((stage) => (
            <span key={stage} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
              {STAGE_LABELS[stage]}
            </span>
          ))}
          {investor.sector_focus.slice(0, 3).map((sector) => (
            <span key={sector} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
              {SECTOR_LABELS[sector]}
            </span>
          ))}
          {investor.sector_focus.length > 3 && (
            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
              +{investor.sector_focus.length - 3} more
            </span>
          )}
        </div>

        {/* Check Size */}
        {checkSize && (
          <p className="text-sm text-gray-600 mb-3">
            <span className="font-medium">Check size:</span> {checkSize}
          </p>
        )}

        {/* Notes */}
        {investor.notes && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{investor.notes}</p>
        )}

        {/* Expand/Collapse */}
        <button
          onClick={() => onToggleExpand(investor.id)}
          className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
        >
          {isExpanded ? 'Hide contacts' : 'See who knows them'}
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Expanded Contacts */}
      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">
            {isFederated ? `Members from ${investor.federated_chapter?.name || 'another chapter'} who know this investor:` : 'Members who know this investor:'}
          </h4>
          <div className="space-y-3">
            {investor.contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between bg-white rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm ${
                    isFederated
                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                      : 'bg-gradient-to-br from-red-500 to-rose-600'
                  }`}>
                    {contact.member.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{contact.member.name}</p>
                      {contact.is_federated && contact.federated_chapter && (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                          {contact.federated_chapter.slug.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {contact.member.role}{contact.member.company ? ` at ${contact.member.company}` : ''}
                    </p>
                  </div>
                </div>
                {contact.is_current_user ? (
                  <span className="text-sm text-gray-500">That's you!</span>
                ) : (
                  <button
                    onClick={() => onRequestIntro(investor, contact)}
                    className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Request Intro
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MultiSelectChips<T extends string>({
  label,
  options,
  selected,
  onChange,
  labels,
}: {
  label: string;
  options: T[];
  selected: T[];
  onChange: (values: T[]) => void;
  labels: Record<T, string>;
}) {
  const toggleOption = (option: T) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => toggleOption(option)}
            className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
              selected.includes(option)
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
            }`}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

interface InvestorDirectoryProps {
  enableFederation?: boolean;
}

export default function InvestorDirectory({ enableFederation = true }: InvestorDirectoryProps) {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [currentMemberId, setCurrentMemberId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Federation state
  const [selectedChapter, setSelectedChapter] = useState<string>(LOCAL_CHAPTER_SLUG);
  const isFederatedView = selectedChapter !== LOCAL_CHAPTER_SLUG;

  // Search and filters
  const [search, setSearch] = useState('');
  const [selectedStages, setSelectedStages] = useState<InvestorStage[]>([]);
  const [selectedSectors, setSelectedSectors] = useState<InvestorSector[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // UI state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [introModal, setIntroModal] = useState<{ investor: Investor; contact: InvestorContact } | null>(null);

  const fetchInvestors = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setExpandedId(null);

    const params = new URLSearchParams();
    if (search) params.set('search', search);
    selectedStages.forEach((s) => params.append('stage', s));
    selectedSectors.forEach((s) => params.append('sector', s));

    try {
      let url: string;
      if (isFederatedView) {
        // Use federation proxy for other chapters
        params.set('chapter', selectedChapter);
        url = `/api/federation/proxy/investors?${params.toString()}`;
      } else {
        // Use local API for this chapter
        url = `/api/investors?${params.toString()}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch investors');
      }

      setInvestors(data.investors);
      setCurrentMemberId(data.member_id);
    } catch (err: any) {
      setError(err.message);
      setInvestors([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedStages, selectedSectors, selectedChapter, isFederatedView]);

  useEffect(() => {
    const debounce = setTimeout(fetchInvestors, 300);
    return () => clearTimeout(debounce);
  }, [fetchInvestors]);

  const handleRequestIntro = async (message: string) => {
    if (!introModal) return;

    let url: string;
    let body: Record<string, any>;

    if (isFederatedView) {
      // Cross-chapter intro request via federation proxy
      url = '/api/federation/proxy/intro-requests';
      body = {
        chapter: selectedChapter,
        investorId: introModal.investor.id,
        contactMemberId: introModal.contact.member_id,
        message,
      };
    } else {
      // Local intro request
      url = '/api/investors/intro-requests';
      body = {
        investor_id: introModal.investor.id,
        contact_id: introModal.contact.member_id,
        message,
      };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send request');
    }
  };

  const handleChapterChange = (slug: string) => {
    setSelectedChapter(slug);
    setSearch('');
    setSelectedStages([]);
    setSelectedSectors([]);
    setShowFilters(false);
  };

  const stageOptions = Object.keys(STAGE_LABELS) as InvestorStage[];
  const sectorOptions = Object.keys(SECTOR_LABELS) as InvestorSector[];
  const selectedChapterName = CHAPTER_OPTIONS.find((c) => c.slug === selectedChapter)?.name || selectedChapter;

  return (
    <div>
      {/* Chapter Selector (Federation) */}
      {enableFederation && (
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <ChapterSelector
              chapters={CHAPTER_OPTIONS}
              selectedChapter={selectedChapter}
              onSelect={handleChapterChange}
              disabled={isLoading}
            />
            {isFederatedView && (
              <p className="text-sm text-blue-600">
                Browsing investors from another chapter
              </p>
            )}
          </div>
        </div>
      )}

      {/* Federated View Banner */}
      {isFederatedView && (
        <FederatedDirectoryBanner
          chapterName={selectedChapterName.replace(' (Local)', '')}
          onSwitchToLocal={() => handleChapterChange(LOCAL_CHAPTER_SLUG)}
        />
      )}

      {/* Search and Filter Bar */}
      <div className="mb-6">
        <div className="flex gap-3 mb-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${isFederatedView ? selectedChapterName.replace(' (Local)', '') : 'local'} investors...`}
              className="w-full pl-10 pr-4 py-3 bg-white/90 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-xl border transition-colors flex items-center gap-2 ${
              showFilters || selectedStages.length > 0 || selectedSectors.length > 0
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-white/90 text-gray-700 border-gray-200 hover:border-red-400'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {(selectedStages.length > 0 || selectedSectors.length > 0) && (
              <span className="px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
                {selectedStages.length + selectedSectors.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-gray-200 p-4 space-y-4">
            <MultiSelectChips
              label="Stage Focus"
              options={stageOptions}
              selected={selectedStages}
              onChange={setSelectedStages}
              labels={STAGE_LABELS}
            />
            <MultiSelectChips
              label="Sector Focus"
              options={sectorOptions}
              selected={selectedSectors}
              onChange={setSelectedSectors}
              labels={SECTOR_LABELS}
            />
            {(selectedStages.length > 0 || selectedSectors.length > 0) && (
              <button
                onClick={() => {
                  setSelectedStages([]);
                  setSelectedSectors([]);
                }}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 mt-3">
            {isFederatedView ? `Loading investors from ${selectedChapterName.replace(' (Local)', '')}...` : 'Loading investors...'}
          </p>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl">
          {error}
          {isFederatedView && (
            <button
              onClick={() => handleChapterChange(LOCAL_CHAPTER_SLUG)}
              className="ml-2 underline hover:no-underline"
            >
              Switch to local directory
            </button>
          )}
        </div>
      ) : investors.length === 0 ? (
        <div className="text-center py-12 bg-white/50 rounded-2xl">
          <p className="text-gray-500 mb-4">
            {search || selectedStages.length > 0 || selectedSectors.length > 0
              ? 'No investors match your search criteria.'
              : isFederatedView
                ? `No investors found in ${selectedChapterName.replace(' (Local)', '')}'s directory.`
                : 'No investors in the directory yet.'}
          </p>
          {!isFederatedView && (
            <a
              href="/members/investors/add"
              className="inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Add the first investor
            </a>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {investors.length} investor{investors.length === 1 ? '' : 's'} found
            {isFederatedView && ` in ${selectedChapterName.replace(' (Local)', '')}`}
          </p>
          {investors.map((investor) => (
            <InvestorCard
              key={investor.id}
              investor={investor}
              currentMemberId={currentMemberId}
              onRequestIntro={(inv, contact) => setIntroModal({ investor: inv, contact })}
              expandedId={expandedId}
              onToggleExpand={(id) => setExpandedId(expandedId === id ? null : id)}
              isFederated={isFederatedView}
            />
          ))}
        </div>
      )}

      {/* Intro Request Modal */}
      {introModal && (
        <IntroRequestModal
          investor={introModal.investor}
          contact={introModal.contact}
          selectedChapter={selectedChapter}
          onClose={() => setIntroModal(null)}
          onSubmit={handleRequestIntro}
        />
      )}
    </div>
  );
}
