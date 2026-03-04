/**
 * French Tech Network Registry
 *
 * Hardcoded list of French Tech chapters in the federation.
 * New chapters join by submitting a PR with their chapter info.
 *
 * Each chapter must:
 * 1. Deploy their own instance with a unique slug
 * 2. Generate an Ed25519 keypair for signing requests
 * 3. Submit a PR adding their entry to this registry
 * 4. Add other chapters' public keys to verify incoming requests
 */

import type { ChapterInfo } from './types';
import { CHAPTER } from '../chapter-config';

// ============================================================================
// French Tech Network Chapters
// ============================================================================

/**
 * All French Tech chapters participating in the federation.
 * To add a new chapter:
 * 1. Generate keypair: Run `npx ts-node scripts/generate-federation-keys.ts`
 * 2. Add entry below with your public key
 * 3. Submit PR to the template repository
 */
export const FRENCH_TECH_NETWORK: ChapterInfo[] = [
  {
    slug: 'boston',
    name: 'La French Tech Boston',
    apiBaseUrl: 'https://frenchtech-boston.com',
    publicKey: '', // Set via FEDERATION_PUBLIC_KEY env var for this chapter
    active: true,
  },
  {
    slug: 'sf',
    name: 'La French Tech San Francisco',
    apiBaseUrl: 'https://lafrenchtech-sf.com',
    publicKey: 'placeholder_sf_public_key', // Replace with actual key
    active: true,
  },
  {
    slug: 'nyc',
    name: 'La French Tech New York',
    apiBaseUrl: 'https://lafrenchtech-nyc.com',
    publicKey: 'placeholder_nyc_public_key', // Replace with actual key
    active: true,
  },
  {
    slug: 'la',
    name: 'La French Tech Los Angeles',
    apiBaseUrl: 'https://lafrenchtech-la.com',
    publicKey: 'placeholder_la_public_key', // Replace with actual key
    active: false, // Not yet launched
  },
  {
    slug: 'austin',
    name: 'La French Tech Austin',
    apiBaseUrl: 'https://lafrenchtech-austin.com',
    publicKey: 'placeholder_austin_public_key', // Replace with actual key
    active: false, // Not yet launched
  },
];

// ============================================================================
// Registry Helper Functions
// ============================================================================

/**
 * Get the current chapter from the network registry
 */
export function getCurrentChapter(): ChapterInfo | undefined {
  return FRENCH_TECH_NETWORK.find((c) => c.slug === CHAPTER.slug);
}

/**
 * Get a chapter by slug
 */
export function getChapter(slug: string): ChapterInfo | undefined {
  return FRENCH_TECH_NETWORK.find((c) => c.slug === slug);
}

/**
 * Get all active chapters except the current one
 */
export function getOtherActiveChapters(): ChapterInfo[] {
  return FRENCH_TECH_NETWORK.filter(
    (c) => c.active && c.slug !== CHAPTER.slug
  );
}

/**
 * Get all active chapters in the network
 */
export function getAllActiveChapters(): ChapterInfo[] {
  return FRENCH_TECH_NETWORK.filter((c) => c.active);
}

/**
 * Check if a chapter slug is valid and active
 */
export function isValidChapter(slug: string): boolean {
  const chapter = getChapter(slug);
  return chapter !== undefined && chapter.active;
}

/**
 * Get the public key for a chapter (for verifying their signatures)
 * For the current chapter, returns the configured public key
 */
export function getChapterPublicKey(
  slug: string,
  runtime?: { env?: { FEDERATION_PUBLIC_KEY?: string } }
): string | undefined {
  const chapter = getChapter(slug);
  if (!chapter) return undefined;

  // For the current chapter, use the environment variable
  if (slug === CHAPTER.slug) {
    return (
      import.meta.env.FEDERATION_PUBLIC_KEY ||
      runtime?.env?.FEDERATION_PUBLIC_KEY ||
      chapter.publicKey
    );
  }

  return chapter.publicKey;
}

/**
 * Build the federation API URL for a chapter
 */
export function buildFederationUrl(
  chapterSlug: string,
  path: string
): string | null {
  const chapter = getChapter(chapterSlug);
  if (!chapter || !chapter.active) return null;

  const baseUrl = chapter.apiBaseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}/api/federation${cleanPath}`;
}

// ============================================================================
// Chapter Display Helpers
// ============================================================================

/**
 * Get chapter options for UI selector
 * Returns current chapter first, then other active chapters
 */
export function getChapterOptions(): Array<{ slug: string; name: string; isCurrent: boolean }> {
  const current = getCurrentChapter();
  const others = getOtherActiveChapters();

  const options: Array<{ slug: string; name: string; isCurrent: boolean }> = [];

  // Add "Local" option for current chapter
  if (current) {
    options.push({
      slug: current.slug,
      name: `${current.name} (Local)`,
      isCurrent: true,
    });
  }

  // Add other chapters
  others.forEach((chapter) => {
    options.push({
      slug: chapter.slug,
      name: chapter.name,
      isCurrent: false,
    });
  });

  return options;
}
