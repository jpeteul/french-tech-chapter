/**
 * CHAPTER CONFIGURATION
 *
 * This file contains all chapter-specific settings for your French Tech community.
 * Update these values when setting up a new chapter.
 *
 * After modifying this file, you'll also need to:
 * 1. Update wrangler.jsonc with your Supabase credentials
 * 2. Update astro.config.mjs with your domain
 * 3. Replace logo files in /public/images/logo/
 * 4. Replace board member photos in /public/images/board/
 */

export interface ChapterConfig {
  // Chapter Identity
  name: string;              // Full name (e.g., "La French Tech Boston")
  shortName: string;         // Short name (e.g., "FT Boston")
  slug: string;              // URL-friendly slug (e.g., "boston")
  city: string;              // City name (e.g., "Boston")
  region: string;            // State/Region (e.g., "Massachusetts")
  country: string;           // Country (e.g., "USA")
  timezone: string;          // IANA timezone (e.g., "America/New_York")

  // Contact & Links
  contactEmail: string;      // Primary contact email
  websiteUrl: string;        // Full website URL
  mailDomain: string;        // Email sending domain (e.g., "mail.frenchtech-boston.com")

  // Social Media
  socialLinks: {
    linkedin: string;
    twitter?: string;
    instagram?: string;
  };

  // Twitter handle for meta tags (without @)
  twitterHandle: string;

  // Statistics (displayed on homepage)
  stats: {
    members: string;         // e.g., "250+"
    eventsPerYear: string;   // e.g., "20+"
    yearsActive: string;     // e.g., "10+"
  };

  // Description
  description: string;

  // Address for schema.org (optional)
  address?: {
    locality: string;
    region: string;
    country: string;
  };

  // Federation settings (optional)
  federation?: {
    enabled: boolean;           // Whether this chapter participates in federation
    allowIncomingRequests: boolean;  // Accept intro requests from other chapters
    allowOutgoingRequests: boolean;  // Allow members to request intros from other chapters
  };
}

/**
 * CONFIGURE YOUR CHAPTER HERE
 *
 * Replace the Boston values below with your chapter's information.
 */
export const CHAPTER: ChapterConfig = {
  // Chapter Identity
  name: 'La French Tech Boston',
  shortName: 'FT Boston',
  slug: 'boston',
  city: 'Boston',
  region: 'Massachusetts',
  country: 'USA',
  timezone: 'America/New_York',

  // Contact & Links
  contactEmail: 'frenchtechboston@gmail.com',
  websiteUrl: 'https://frenchtech-boston.com',
  mailDomain: 'mail.frenchtech-boston.com',

  // Social Media
  socialLinks: {
    linkedin: 'https://www.linkedin.com/company/french-tech-boston/',
    twitter: 'https://twitter.com/FrenchTechBOS',
  },

  twitterHandle: 'FrenchTechBOS',

  // Statistics
  stats: {
    members: '250+',
    eventsPerYear: '20+',
    yearsActive: '10+',
  },

  // Description
  description: 'The community of French entrepreneurs and tech executives in the Boston area.',

  // Address
  address: {
    locality: 'Boston',
    region: 'MA',
    country: 'US',
  },

  // Federation - Cross-chapter investor directory sharing
  federation: {
    enabled: true,
    allowIncomingRequests: true,
    allowOutgoingRequests: true,
  },
};

// Helper to generate FROM email address
export function getFromEmail(): string {
  return `${CHAPTER.name} <noreply@${CHAPTER.mailDomain}>`;
}

// Helper to get login/dashboard URL
export function getDashboardUrl(): string {
  return `${CHAPTER.websiteUrl}/auth/login`;
}
