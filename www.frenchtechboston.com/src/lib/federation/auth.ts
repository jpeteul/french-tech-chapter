/**
 * Federation Authentication
 *
 * Handles Ed25519 token signing and verification for cross-chapter requests.
 * Uses Web Crypto API for compatibility with Cloudflare Workers.
 *
 * Token format:
 * - Header: Base64(JSON({ alg: 'EdDSA', typ: 'FT1' }))
 * - Payload: Base64(JSON(FederationTokenPayload))
 * - Signature: Base64(Ed25519Signature(header.payload))
 *
 * Tokens expire after 5 minutes to prevent replay attacks.
 */

import type { FederationTokenPayload, FederationScope, FederationError } from './types';
import { getChapter, getChapterPublicKey } from './network-registry';
import { CHAPTER } from '../chapter-config';

// Token expiry in seconds (5 minutes)
const TOKEN_EXPIRY_SECONDS = 5 * 60;

// ============================================================================
// Key Management
// ============================================================================

interface CloudflareRuntime {
  env?: {
    FEDERATION_PRIVATE_KEY?: string;
    FEDERATION_PUBLIC_KEY?: string;
  };
}

/**
 * Get the private key for signing outgoing requests
 */
export function getPrivateKey(runtime?: CloudflareRuntime): string | null {
  return (
    import.meta.env.FEDERATION_PRIVATE_KEY ||
    runtime?.env?.FEDERATION_PRIVATE_KEY ||
    null
  );
}

/**
 * Get the public key for the current chapter
 */
export function getPublicKey(runtime?: CloudflareRuntime): string | null {
  return (
    import.meta.env.FEDERATION_PUBLIC_KEY ||
    runtime?.env?.FEDERATION_PUBLIC_KEY ||
    null
  );
}

/**
 * Import an Ed25519 private key from base64 PKCS#8 format
 */
async function importPrivateKey(base64Key: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(base64Key);
  return await crypto.subtle.importKey(
    'pkcs8',
    keyData,
    { name: 'Ed25519' },
    false,
    ['sign']
  );
}

/**
 * Import an Ed25519 public key from base64 SPKI format
 */
async function importPublicKey(base64Key: string): Promise<CryptoKey> {
  const keyData = base64ToArrayBuffer(base64Key);
  return await crypto.subtle.importKey(
    'spki',
    keyData,
    { name: 'Ed25519' },
    false,
    ['verify']
  );
}

// ============================================================================
// Token Creation
// ============================================================================

interface CreateTokenOptions {
  targetChapter: string;
  member: {
    id: string;
    name: string;
    company: string | null;
  };
  scopes: FederationScope[];
  runtime?: CloudflareRuntime;
}

/**
 * Create a signed federation token for cross-chapter requests
 */
export async function createFederationToken(
  options: CreateTokenOptions
): Promise<string> {
  const { targetChapter, member, scopes, runtime } = options;

  const privateKey = getPrivateKey(runtime);
  if (!privateKey) {
    throw new Error('Federation private key not configured');
  }

  // Verify target chapter exists
  const target = getChapter(targetChapter);
  if (!target || !target.active) {
    throw new Error(`Unknown or inactive chapter: ${targetChapter}`);
  }

  const now = Math.floor(Date.now() / 1000);
  const jti = generateTokenId();

  const payload: FederationTokenPayload = {
    iss: CHAPTER.slug,
    aud: targetChapter,
    sub: {
      name: member.name,
      company: member.company,
      memberId: member.id,
    },
    scope: scopes,
    iat: now,
    exp: now + TOKEN_EXPIRY_SECONDS,
    jti,
  };

  // Create token parts
  const header = { alg: 'EdDSA', typ: 'FT1' };
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));

  // Sign the token
  const signingInput = `${headerB64}.${payloadB64}`;
  const key = await importPrivateKey(privateKey);
  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    key,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = base64UrlEncode(arrayBufferToBase64(signature));

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

// ============================================================================
// Token Verification
// ============================================================================

interface VerifyTokenResult {
  valid: true;
  payload: FederationTokenPayload;
}

interface VerifyTokenError {
  valid: false;
  error: string;
  code: 'INVALID_FORMAT' | 'INVALID_SIGNATURE' | 'EXPIRED' | 'WRONG_AUDIENCE' | 'UNKNOWN_CHAPTER';
}

/**
 * Verify a federation token from another chapter
 */
export async function verifyFederationToken(
  token: string,
  runtime?: CloudflareRuntime
): Promise<VerifyTokenResult | VerifyTokenError> {
  // Parse token parts
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Invalid token format', code: 'INVALID_FORMAT' };
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode payload to get issuer
  let payload: FederationTokenPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64));
  } catch {
    return { valid: false, error: 'Invalid token payload', code: 'INVALID_FORMAT' };
  }

  // Check audience matches current chapter
  if (payload.aud !== CHAPTER.slug) {
    return { valid: false, error: 'Token not intended for this chapter', code: 'WRONG_AUDIENCE' };
  }

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    return { valid: false, error: 'Token expired', code: 'EXPIRED' };
  }

  // Get issuer's public key
  const issuerPublicKey = getChapterPublicKey(payload.iss, runtime);
  if (!issuerPublicKey) {
    return { valid: false, error: `Unknown issuing chapter: ${payload.iss}`, code: 'UNKNOWN_CHAPTER' };
  }

  // Verify signature
  try {
    const publicKey = await importPublicKey(issuerPublicKey);
    const signingInput = `${headerB64}.${payloadB64}`;
    const signature = base64ToArrayBuffer(base64UrlToBase64(signatureB64));

    const isValid = await crypto.subtle.verify(
      { name: 'Ed25519' },
      publicKey,
      signature,
      new TextEncoder().encode(signingInput)
    );

    if (!isValid) {
      return { valid: false, error: 'Invalid signature', code: 'INVALID_SIGNATURE' };
    }
  } catch (error) {
    console.error('Signature verification error:', error);
    return { valid: false, error: 'Signature verification failed', code: 'INVALID_SIGNATURE' };
  }

  return { valid: true, payload };
}

// ============================================================================
// Request Helpers
// ============================================================================

/**
 * Add federation auth header to a request
 */
export function addFederationAuth(
  headers: Headers,
  token: string
): void {
  headers.set('Authorization', `FederationToken ${token}`);
  headers.set('X-Federation-Version', '1');
}

/**
 * Extract federation token from request headers
 */
export function extractFederationToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;

  const match = authHeader.match(/^FederationToken\s+(.+)$/);
  return match ? match[1] : null;
}

/**
 * Verify a federation request and extract the payload
 */
export async function verifyFederationRequest(
  request: Request,
  requiredScopes: FederationScope[],
  runtime?: CloudflareRuntime
): Promise<{ valid: true; payload: FederationTokenPayload } | { valid: false; error: string; statusCode: number }> {
  const token = extractFederationToken(request);
  if (!token) {
    return { valid: false, error: 'Missing federation token', statusCode: 401 };
  }

  const result = await verifyFederationToken(token, runtime);
  if (!result.valid) {
    const statusCode = result.code === 'EXPIRED' ? 401 : 403;
    return { valid: false, error: result.error, statusCode };
  }

  // Check required scopes
  const hasScopes = requiredScopes.every((scope) =>
    result.payload.scope.includes(scope)
  );
  if (!hasScopes) {
    return { valid: false, error: 'Insufficient scope', statusCode: 403 };
  }

  return { valid: true, payload: result.payload };
}

// ============================================================================
// Utility Functions
// ============================================================================

function generateTokenId(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  return atob(base64 + '='.repeat(padding));
}

function base64UrlToBase64(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (base64.length % 4)) % 4;
  return base64 + '='.repeat(padding);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ============================================================================
// Key Generation (for development/setup)
// ============================================================================

/**
 * Generate a new Ed25519 keypair for federation
 * Run this once when setting up a new chapter
 */
export async function generateFederationKeypair(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true, // extractable
    ['sign', 'verify']
  );

  const publicKeyBuffer = await crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKeyBuffer),
    privateKey: arrayBufferToBase64(privateKeyBuffer),
  };
}
