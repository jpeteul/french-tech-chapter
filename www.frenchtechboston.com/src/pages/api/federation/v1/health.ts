import type { APIRoute } from 'astro';
import { CHAPTER } from '../../../../lib/chapter-config';
import type { FederationHealthResponse } from '../../../../lib/federation/types';

export const prerender = false;

// Federation API version
const FEDERATION_VERSION = '1.0.0';

/**
 * GET /api/federation/v1/health
 *
 * Public health check endpoint for federation.
 * Other chapters can call this to verify connectivity.
 */
export const GET: APIRoute = async () => {
  const response: FederationHealthResponse = {
    status: 'ok',
    chapter: CHAPTER.slug,
    version: FEDERATION_VERSION,
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Federation-Version': FEDERATION_VERSION,
      'X-Chapter': CHAPTER.slug,
      // Allow cross-origin requests from other chapters
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Federation-Version',
    },
  });
};

/**
 * OPTIONS /api/federation/v1/health
 *
 * CORS preflight for health check.
 */
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Federation-Version',
      'Access-Control-Max-Age': '86400',
    },
  });
};
