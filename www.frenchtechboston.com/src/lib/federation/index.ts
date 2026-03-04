/**
 * Federation Module
 *
 * Cross-chapter investor directory sharing and introduction requests
 * for the French Tech network.
 */

// Types
export type {
  ChapterInfo,
  FederationTokenPayload,
  FederationScope,
  FederatedInvestor,
  FederatedContact,
  IntroRequestStatus,
  FederatedIntroRequest,
  IntroRequestAcceptance,
  FederationHealthResponse,
  FederationInvestorsResponse,
  FederationIntroRequestPayload,
  FederationIntroRequestResponse,
  FederationWebhookPayload,
  FederatedIntroRequestRow,
  IncomingFederationRequestRow,
  FederationErrorCode,
} from './types';

export { FederationError } from './types';

// Network Registry
export {
  FRENCH_TECH_NETWORK,
  getCurrentChapter,
  getChapter,
  getOtherActiveChapters,
  getAllActiveChapters,
  isValidChapter,
  getChapterPublicKey,
  buildFederationUrl,
  getChapterOptions,
} from './network-registry';

// Authentication
export {
  getPrivateKey,
  getPublicKey,
  createFederationToken,
  verifyFederationToken,
  verifyFederationRequest,
  addFederationAuth,
  extractFederationToken,
  generateFederationKeypair,
} from './auth';
