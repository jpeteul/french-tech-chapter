/**
 * Federation Types
 *
 * Types for cross-chapter communication in the French Tech network.
 * Each chapter maintains independent databases but can share investor
 * directories and route introduction requests between chapters.
 */

import type { InvestorStage, InvestorSector, InvestorGeo } from '../supabase';

// ============================================================================
// Network Registry Types
// ============================================================================

export interface ChapterInfo {
  /** URL-friendly identifier (e.g., 'boston', 'sf', 'nyc') */
  slug: string;
  /** Display name (e.g., 'La French Tech Boston') */
  name: string;
  /** Base URL for federation API (e.g., 'https://frenchtech-boston.com') */
  apiBaseUrl: string;
  /** Ed25519 public key for verifying signed requests (base64) */
  publicKey: string;
  /** Whether this chapter is currently active in the federation */
  active: boolean;
}

// ============================================================================
// Federation Token Types
// ============================================================================

export interface FederationTokenPayload {
  /** Origin chapter slug */
  iss: string;
  /** Target chapter slug */
  aud: string;
  /** Requester info (limited for privacy) */
  sub: {
    name: string;
    company: string | null;
    memberId: string;
  };
  /** Scope of the request */
  scope: FederationScope[];
  /** Issued at timestamp (Unix seconds) */
  iat: number;
  /** Expiry timestamp (Unix seconds) */
  exp: number;
  /** Unique token ID for replay prevention */
  jti: string;
}

export type FederationScope =
  | 'read:investors'
  | 'request:intro';

// ============================================================================
// Federated Investor Types (shared cross-chapter)
// ============================================================================

export interface FederatedInvestor {
  /** Remote investor ID (from origin chapter) */
  id: string;
  /** Investor name */
  name: string;
  /** Firm/fund name */
  firm: string | null;
  /** Investment stage focus */
  stageFocus: InvestorStage[];
  /** Sector focus */
  sectorFocus: InvestorSector[];
  /** Geographic focus */
  geoFocus: InvestorGeo[];
  /** Check size range */
  checkSizeMin: number | null;
  checkSizeMax: number | null;
  /** Public notes about the investor */
  notes: string | null;
  /** Number of members who know this investor */
  contactCount: number;
  /** Contacts (limited info for privacy) */
  contacts: FederatedContact[];
}

export interface FederatedContact {
  /** Remote contact relationship ID */
  id: string;
  /** Member name (shared for intro context) */
  memberName: string;
  /** Member company (shared for intro context) */
  memberCompany: string | null;
  /** When the contact was added */
  addedAt: string;
}

// ============================================================================
// Cross-Chapter Intro Request Types
// ============================================================================

export type IntroRequestStatus =
  | 'pending'    // Request created, awaiting contact decision
  | 'sent'       // Email sent to contact
  | 'accepted'   // Contact accepted the intro
  | 'declined';  // Contact declined

export interface FederatedIntroRequest {
  /** Request ID (from origin chapter) */
  id: string;
  /** Origin chapter info */
  originChapter: {
    slug: string;
    name: string;
  };
  /** Requester info (limited for privacy) */
  requester: {
    name: string;
    company: string | null;
  };
  /** Target investor ID */
  investorId: string;
  /** Target contact member ID */
  contactMemberId: string;
  /** Message explaining fit */
  message: string;
  /** Current status */
  status: IntroRequestStatus;
  /** Webhook URL for status updates */
  webhookUrl: string;
  /** When the request was created */
  createdAt: string;
}

export interface IntroRequestAcceptance {
  /** Request ID */
  requestId: string;
  /** Requester email (shared only on acceptance) */
  requesterEmail: string;
  /** Requester LinkedIn (shared only on acceptance) */
  requesterLinkedin: string | null;
  /** Contact email (shared only on acceptance) */
  contactEmail: string;
  /** Contact LinkedIn (shared only on acceptance) */
  contactLinkedin: string | null;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface FederationHealthResponse {
  status: 'ok' | 'degraded' | 'down';
  chapter: string;
  version: string;
  timestamp: string;
}

export interface FederationInvestorsResponse {
  investors: FederatedInvestor[];
  chapter: {
    slug: string;
    name: string;
  };
  pagination?: {
    cursor: string | null;
    hasMore: boolean;
  };
}

export interface FederationIntroRequestPayload {
  investorId: string;
  contactMemberId: string;
  message: string;
  webhookUrl: string;
}

export interface FederationIntroRequestResponse {
  success: boolean;
  requestId: string;
  status: IntroRequestStatus;
}

export interface FederationWebhookPayload {
  type: 'intro_status_update';
  requestId: string;
  status: IntroRequestStatus;
  /** Only included on acceptance */
  contactInfo?: {
    email: string;
    linkedin: string | null;
  };
  timestamp: string;
}

// ============================================================================
// Database Table Types
// ============================================================================

export interface FederatedIntroRequestRow {
  id: string;
  requester_id: string;
  target_chapter_slug: string;
  target_investor_id: string;
  target_contact_member_id: string;
  message: string;
  status: IntroRequestStatus;
  remote_request_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncomingFederationRequestRow {
  id: string;
  origin_chapter_slug: string;
  origin_chapter_name: string;
  origin_requester_name: string;
  origin_requester_company: string | null;
  origin_requester_member_id: string;
  investor_id: string;
  contact_id: string;
  message: string;
  status: IntroRequestStatus;
  webhook_url: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class FederationError extends Error {
  constructor(
    message: string,
    public readonly code: FederationErrorCode,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = 'FederationError';
  }
}

export type FederationErrorCode =
  | 'INVALID_TOKEN'
  | 'EXPIRED_TOKEN'
  | 'UNKNOWN_CHAPTER'
  | 'INVALID_SIGNATURE'
  | 'CHAPTER_UNREACHABLE'
  | 'RATE_LIMITED'
  | 'INVALID_REQUEST'
  | 'INTERNAL_ERROR';
